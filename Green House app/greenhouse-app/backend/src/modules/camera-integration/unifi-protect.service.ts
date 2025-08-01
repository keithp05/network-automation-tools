import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import {
  UniFiProtectConfig,
  UniFiCamera,
  Camera,
  CameraProviderType,
  ConnectionStatus,
  CameraCapability,
  StreamOptions,
  CaptureOptions,
  CaptureResult,
  MotionEvent,
  CameraEventType
} from './camera-integration.types';

export class UniFiProtectService extends EventEmitter {
  private config: UniFiProtectConfig;
  private api: AxiosInstance;
  private wsClient?: WebSocket;
  private authToken?: string;
  private cameras: Map<string, UniFiCamera> = new Map();
  private isConnected: boolean = false;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(config: UniFiProtectConfig) {
    super();
    this.config = config;
    
    // Create axios instance with UniFi Protect configuration
    this.api = axios.create({
      baseURL: `https://${config.host}:${config.port}`,
      httpsAgent: new https.Agent({
        rejectUnauthorized: config.verifySsl
      }),
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Add request interceptor for authentication
    this.api.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers['Authorization'] = `Bearer ${this.authToken}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to re-authenticate
          await this.authenticate();
          
          // Retry the original request
          const originalRequest = error.config;
          originalRequest.headers['Authorization'] = `Bearer ${this.authToken}`;
          return this.api(originalRequest);
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async authenticate(): Promise<boolean> {
    try {
      console.log(`Authenticating with UniFi Protect at ${this.config.host}...`);
      
      const response = await this.api.post('/api/auth/login', {
        username: this.config.username,
        password: this.config.password,
        rememberMe: true
      });

      if (response.headers['x-csrf-token']) {
        this.authToken = response.headers['x-csrf-token'];
        this.api.defaults.headers.common['X-CSRF-Token'] = this.authToken;
      }

      // Get authentication cookie
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const authCookie = cookies.find((cookie: string) => cookie.includes('TOKEN'));
        if (authCookie) {
          this.api.defaults.headers.common['Cookie'] = authCookie;
        }
      }

      this.isConnected = true;
      this.emit('connected');
      
      // Start WebSocket connection for real-time updates
      await this.connectWebSocket();
      
      return true;
    } catch (error) {
      console.error('UniFi Protect authentication failed:', error);
      this.isConnected = false;
      this.emit('error', error);
      return false;
    }
  }

  // WebSocket connection for real-time updates
  private async connectWebSocket(): Promise<void> {
    try {
      const wsUrl = `wss://${this.config.host}:${this.config.port}/proxy/protect/ws/updates`;
      
      this.wsClient = new WebSocket(wsUrl, {
        headers: {
          'Cookie': this.api.defaults.headers.common['Cookie'],
          'X-CSRF-Token': this.authToken
        },
        rejectUnauthorized: this.config.verifySsl
      });

      this.wsClient.on('open', () => {
        console.log('UniFi Protect WebSocket connected');
        this.emit('ws:connected');
      });

      this.wsClient.on('message', (data: Buffer) => {
        this.handleWebSocketMessage(data);
      });

      this.wsClient.on('error', (error) => {
        console.error('UniFi Protect WebSocket error:', error);
        this.emit('ws:error', error);
      });

      this.wsClient.on('close', () => {
        console.log('UniFi Protect WebSocket disconnected');
        this.emit('ws:disconnected');
        
        // Attempt to reconnect after 5 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            if (this.isConnected) {
              this.connectWebSocket();
            }
          }, 5000);
        }
      });
    } catch (error) {
      console.error('Failed to connect UniFi Protect WebSocket:', error);
      this.emit('ws:error', error);
    }
  }

  private handleWebSocketMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'camera':
          this.handleCameraUpdate(message.data);
          break;
        case 'motion':
          this.handleMotionEvent(message.data);
          break;
        case 'smartDetect':
          this.handleSmartDetectEvent(message.data);
          break;
        default:
          // Handle other event types
          break;
      }
    } catch (error) {
      console.error('Error parsing UniFi Protect WebSocket message:', error);
    }
  }

  private handleCameraUpdate(cameraData: any): void {
    const camera = this.cameras.get(cameraData.id);
    if (camera) {
      // Update camera data
      Object.assign(camera, cameraData);
      this.emit('camera:update', camera);
    }
  }

  private handleMotionEvent(motionData: any): void {
    const event: MotionEvent = {
      id: motionData.id,
      cameraId: motionData.camera,
      startTime: new Date(motionData.start),
      endTime: motionData.end ? new Date(motionData.end) : undefined,
      duration: motionData.duration,
      thumbnail: motionData.thumbnail,
      zones: motionData.zones || [],
      score: motionData.score || 0,
      type: motionData.type || 'motion',
      metadata: motionData.metadata
    };

    this.emit('motion:detected', event);
    this.emit('event', {
      type: CameraEventType.MOTION_DETECTED,
      cameraId: event.cameraId,
      timestamp: new Date(),
      data: event
    });
  }

  private handleSmartDetectEvent(detectData: any): void {
    const event = {
      id: detectData.id,
      cameraId: detectData.camera,
      type: detectData.objectType,
      confidence: detectData.confidence,
      boundingBox: detectData.boundingBox,
      timestamp: new Date(detectData.timestamp)
    };

    this.emit('smartdetect', event);
    this.emit('event', {
      type: CameraEventType.AI_DETECTION,
      cameraId: event.cameraId,
      timestamp: new Date(),
      data: event
    });
  }

  // Camera discovery and management
  async discoverCameras(): Promise<UniFiCamera[]> {
    try {
      if (!this.isConnected) {
        await this.authenticate();
      }

      const response = await this.api.get('/proxy/protect/api/cameras');
      const cameras: UniFiCamera[] = response.data;

      // Update internal camera cache
      cameras.forEach(camera => {
        this.cameras.set(camera.id, camera);
      });

      console.log(`Discovered ${cameras.length} UniFi cameras`);
      return cameras;
    } catch (error) {
      console.error('Failed to discover UniFi cameras:', error);
      throw error;
    }
  }

  async getCamera(cameraId: string): Promise<UniFiCamera | null> {
    try {
      // Check cache first
      if (this.cameras.has(cameraId)) {
        return this.cameras.get(cameraId)!;
      }

      // Fetch from API
      const response = await this.api.get(`/proxy/protect/api/cameras/${cameraId}`);
      const camera: UniFiCamera = response.data;
      
      this.cameras.set(camera.id, camera);
      return camera;
    } catch (error) {
      console.error(`Failed to get camera ${cameraId}:`, error);
      return null;
    }
  }

  // Convert UniFi camera to generic camera format
  convertToGenericCamera(unifiCamera: UniFiCamera): Camera {
    const capabilities: CameraCapability[] = [
      CameraCapability.LIVE_STREAM,
      CameraCapability.SNAPSHOT,
      CameraCapability.RECORDING
    ];

    if (unifiCamera.featureFlags.hasMotionDetect) {
      capabilities.push(CameraCapability.MOTION_DETECTION);
    }
    if (unifiCamera.featureFlags.hasSmartDetect) {
      capabilities.push(CameraCapability.ANALYTICS);
    }
    if (unifiCamera.featureFlags.hasSpeaker) {
      capabilities.push(CameraCapability.AUDIO);
    }
    if (unifiCamera.stats.battery) {
      // Battery-powered cameras often have IR
      capabilities.push(CameraCapability.INFRARED);
    }

    return {
      id: unifiCamera.id,
      providerId: unifiCamera.id,
      providerType: CameraProviderType.UBIQUITI_UNIFI,
      name: unifiCamera.name,
      description: `${unifiCamera.model} - ${unifiCamera.mac}`,
      location: {
        position: { x: 0, y: 0 }
      },
      status: {
        isOnline: unifiCamera.isConnected,
        isRecording: unifiCamera.isRecording,
        isStreaming: unifiCamera.isConnected,
        hasMotion: unifiCamera.isMotionDetected,
        lastSeen: new Date(unifiCamera.lastSeen),
        health: unifiCamera.isConnected ? 
          (unifiCamera.isPoorConnection ? 'fair' : 'good') : 'offline',
        errors: unifiCamera.isPoorConnection ? ['Poor connection quality'] : []
      },
      capabilities,
      streamUrl: unifiCamera.streamUrls.rtsp,
      snapshotUrl: unifiCamera.streamUrls.snapshots.current,
      metadata: {
        manufacturer: 'Ubiquiti',
        model: unifiCamera.model,
        resolution: unifiCamera.channels[0] ? {
          width: unifiCamera.channels[0].width,
          height: unifiCamera.channels[0].height
        } : undefined,
        fps: unifiCamera.channels[0]?.fps,
        features: Object.entries(unifiCamera.featureFlags)
          .filter(([_, value]) => value)
          .map(([key, _]) => key)
      },
      settings: {
        enabled: true,
        autoCapture: true,
        captureInterval: 60,
        motionCapture: unifiCamera.featureFlags.hasMotionDetect,
        aiAnalysis: unifiCamera.featureFlags.hasSmartDetect,
        alertOnMotion: true,
        alertOnAiDetection: true,
        retentionDays: 7,
        quality: 'high',
        nightMode: 'auto',
        privacyMode: false,
        audioEnabled: unifiCamera.featureFlags.hasSpeaker
      },
      lastSnapshot: new Date(),
      lastMotion: new Date(unifiCamera.lastMotion),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Streaming methods
  async getStreamUrl(cameraId: string, options: StreamOptions): Promise<string> {
    const camera = await this.getCamera(cameraId);
    if (!camera) {
      throw new Error(`Camera ${cameraId} not found`);
    }

    // Select appropriate stream URL based on options
    let streamUrl: string;
    
    switch (options.protocol) {
      case 'rtsp':
        streamUrl = camera.streamUrls.rtsp;
        break;
      case 'rtmp':
        streamUrl = camera.streamUrls.rtmp;
        break;
      case 'hls':
        streamUrl = camera.streamUrls.hls;
        break;
      default:
        streamUrl = camera.streamUrls.rtsp;
    }

    // Append quality parameters
    const channel = this.selectChannel(camera, options.quality);
    if (channel) {
      streamUrl = streamUrl.replace('${channel}', channel.id.toString());
    }

    return streamUrl;
  }

  private selectChannel(camera: UniFiCamera, quality: string): any {
    // UniFi cameras typically have multiple channels for different qualities
    const qualityMap: Record<string, number> = {
      'low': 2,    // Low quality stream
      'medium': 1, // Medium quality stream
      'high': 0,   // High quality stream (main)
      'ultra': 0   // Use main stream for ultra
    };

    const channelIndex = qualityMap[quality] || 0;
    return camera.channels[channelIndex] || camera.channels[0];
  }

  // Snapshot capture
  async captureSnapshot(cameraId: string, options?: CaptureOptions): Promise<CaptureResult> {
    try {
      const camera = await this.getCamera(cameraId);
      if (!camera) {
        throw new Error(`Camera ${cameraId} not found`);
      }

      // Build snapshot URL with parameters
      let snapshotUrl = `/proxy/protect/api/cameras/${cameraId}/snapshot`;
      const params = new URLSearchParams();

      if (options?.width) params.append('w', options.width.toString());
      if (options?.height) params.append('h', options.height.toString());
      if (options?.timestamp !== false) params.append('ts', Date.now().toString());

      if (params.toString()) {
        snapshotUrl += `?${params.toString()}`;
      }

      // Capture snapshot
      const response = await this.api.get(snapshotUrl, {
        responseType: 'arraybuffer'
      });

      const imageBuffer = Buffer.from(response.data);
      const imageBase64 = imageBuffer.toString('base64');

      const result: CaptureResult = {
        id: `snapshot_${cameraId}_${Date.now()}`,
        cameraId,
        timestamp: new Date(),
        imageUrl: `data:image/jpeg;base64,${imageBase64}`,
        imageBase64,
        metadata: {
          width: options?.width || camera.channels[0].width,
          height: options?.height || camera.channels[0].height,
          size: imageBuffer.length,
          format: 'jpeg'
        }
      };

      this.emit('capture:complete', result);
      return result;
    } catch (error) {
      console.error(`Failed to capture snapshot from camera ${cameraId}:`, error);
      throw error;
    }
  }

  // Motion detection control
  async setMotionDetection(cameraId: string, enabled: boolean): Promise<boolean> {
    try {
      const response = await this.api.patch(`/proxy/protect/api/cameras/${cameraId}`, {
        recordingSettings: {
          mode: enabled ? 'motion' : 'never'
        }
      });

      return response.status === 200;
    } catch (error) {
      console.error(`Failed to set motion detection for camera ${cameraId}:`, error);
      return false;
    }
  }

  // Smart detection control
  async setSmartDetection(cameraId: string, objectTypes: string[]): Promise<boolean> {
    try {
      const response = await this.api.patch(`/proxy/protect/api/cameras/${cameraId}`, {
        smartDetectSettings: {
          objectTypes
        }
      });

      return response.status === 200;
    } catch (error) {
      console.error(`Failed to set smart detection for camera ${cameraId}:`, error);
      return false;
    }
  }

  // Recording management
  async getRecordings(cameraId: string, startTime: Date, endTime: Date): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        cameras: cameraId,
        start: startTime.getTime().toString(),
        end: endTime.getTime().toString()
      });

      const response = await this.api.get(`/proxy/protect/api/events?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get recordings for camera ${cameraId}:`, error);
      return [];
    }
  }

  // PTZ control (for supported cameras)
  async ptzControl(cameraId: string, action: string, params?: any): Promise<boolean> {
    try {
      const response = await this.api.post(`/proxy/protect/api/cameras/${cameraId}/ptz`, {
        action,
        ...params
      });

      return response.status === 200;
    } catch (error) {
      console.error(`Failed to control PTZ for camera ${cameraId}:`, error);
      return false;
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    this.isConnected = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = undefined;
    }

    try {
      await this.api.post('/api/auth/logout');
    } catch (error) {
      // Ignore logout errors
    }

    this.emit('disconnected');
  }

  // Getters
  getConnectionStatus(): ConnectionStatus {
    if (this.isConnected) {
      return ConnectionStatus.CONNECTED;
    }
    return ConnectionStatus.DISCONNECTED;
  }

  getCameras(): UniFiCamera[] {
    return Array.from(this.cameras.values());
  }
}