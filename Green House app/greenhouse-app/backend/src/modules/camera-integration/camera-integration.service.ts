import { EventEmitter } from 'events';
import { UniFiProtectService } from './unifi-protect.service';
import {
  Camera,
  CameraProvider,
  CameraProviderType,
  UniFiProtectConfig,
  UniFiCamera,
  AddCameraRequest,
  UpdateCameraRequest,
  CameraListResponse,
  StreamOptions,
  CameraStreamResponse,
  CaptureOptions,
  CaptureResult,
  BulkCaptureRequest,
  BulkCaptureResponse,
  MotionEvent,
  CameraStatus,
  CameraGreenhouseIntegration,
  MonitoringSchedule,
  CameraAutomation,
  ConnectionStatus,
  CameraWebSocketEvent,
  CameraEventType
} from './camera-integration.types';

interface CameraFilters {
  status?: string;
  providerType?: CameraProviderType;
}

export class CameraIntegrationService extends EventEmitter {
  private cameras: Map<string, Camera> = new Map();
  private providers: Map<string, CameraProvider> = new Map();
  private unifiServices: Map<string, UniFiProtectService> = new Map();
  private integrations: Map<string, CameraGreenhouseIntegration[]> = new Map();
  private activeStreams: Map<string, any> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for camera events and re-emit them
    this.on('camera:added', (camera: Camera) => {
      this.emit('event', {
        type: CameraEventType.STATUS_CHANGE,
        cameraId: camera.id,
        timestamp: new Date(),
        data: { status: 'added', camera }
      } as CameraWebSocketEvent);
    });

    this.on('camera:updated', (camera: Camera) => {
      this.emit('event', {
        type: CameraEventType.STATUS_CHANGE,
        cameraId: camera.id,
        timestamp: new Date(),
        data: { status: 'updated', camera }
      } as CameraWebSocketEvent);
    });

    this.on('camera:deleted', (cameraId: string) => {
      this.emit('event', {
        type: CameraEventType.STATUS_CHANGE,
        cameraId,
        timestamp: new Date(),
        data: { status: 'deleted' }
      } as CameraWebSocketEvent);
    });
  }

  // Camera management
  async addCamera(request: AddCameraRequest): Promise<Camera> {
    try {
      const cameraId = this.generateCameraId();
      
      let camera: Camera;

      switch (request.providerType) {
        case CameraProviderType.UBIQUITI_UNIFI:
          if (!request.unifiConfig) {
            throw new Error('UniFi Protect configuration required for UniFi cameras');
          }
          
          const unifiService = await this.getOrCreateUniFiService(request.unifiConfig);
          const unifiCamera = await unifiService.getCamera(request.providerId || '');
          
          if (!unifiCamera) {
            throw new Error('UniFi camera not found');
          }
          
          camera = unifiService.convertToGenericCamera(unifiCamera);
          camera.id = cameraId;
          camera.name = request.name;
          camera.description = request.description;
          camera.location = request.location;
          
          if (request.settings) {
            camera.settings = { ...camera.settings, ...request.settings };
          }
          break;

        case CameraProviderType.RTSP_GENERIC:
        case CameraProviderType.HTTP_MJPEG:
        case CameraProviderType.IP_CAMERA:
          if (!request.streamUrl) {
            throw new Error('Stream URL required for generic cameras');
          }
          
          camera = {
            id: cameraId,
            providerId: request.streamUrl,
            providerType: request.providerType,
            name: request.name,
            description: request.description,
            location: request.location,
            status: {
              isOnline: false,
              isRecording: false,
              isStreaming: false,
              hasMotion: false,
              lastSeen: new Date(),
              health: 'offline'
            },
            capabilities: [],
            streamUrl: request.streamUrl,
            credentials: request.credentials,
            metadata: {},
            settings: {
              enabled: true,
              autoCapture: false,
              captureInterval: 60,
              motionCapture: false,
              aiAnalysis: false,
              alertOnMotion: false,
              alertOnAiDetection: false,
              retentionDays: 7,
              quality: 'high',
              nightMode: 'auto',
              privacyMode: false,
              audioEnabled: false,
              ...request.settings
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };
          break;

        default:
          throw new Error(`Unsupported camera provider type: ${request.providerType}`);
      }

      this.cameras.set(cameraId, camera);
      this.emit('camera:added', camera);
      
      return camera;
    } catch (error) {
      console.error('Failed to add camera:', error);
      throw error;
    }
  }

  async getCameras(page: number = 1, limit: number = 20, filters: CameraFilters = {}): Promise<CameraListResponse> {
    try {
      let cameras = Array.from(this.cameras.values());
      
      // Apply filters
      if (filters.status) {
        cameras = cameras.filter(camera => camera.status.health === filters.status);
      }
      
      if (filters.providerType) {
        cameras = cameras.filter(camera => camera.providerType === filters.providerType);
      }
      
      // Pagination
      const total = cameras.length;
      const startIndex = (page - 1) * limit;
      const paginatedCameras = cameras.slice(startIndex, startIndex + limit);
      
      // Count online/offline
      const online = cameras.filter(camera => camera.status.isOnline).length;
      const offline = total - online;
      
      return {
        cameras: paginatedCameras,
        total,
        online,
        offline
      };
    } catch (error) {
      console.error('Failed to get cameras:', error);
      throw error;
    }
  }

  async getCamera(cameraId: string): Promise<Camera | null> {
    return this.cameras.get(cameraId) || null;
  }

  async updateCamera(cameraId: string, updates: UpdateCameraRequest): Promise<Camera | null> {
    try {
      const camera = this.cameras.get(cameraId);
      if (!camera) {
        return null;
      }
      
      const updatedCamera = {
        ...camera,
        ...updates,
        location: updates.location ? { ...camera.location, ...updates.location } : camera.location,
        settings: updates.settings ? { ...camera.settings, ...updates.settings } : camera.settings,
        credentials: updates.credentials ? { ...camera.credentials, ...updates.credentials } : camera.credentials,
        updatedAt: new Date()
      };
      
      this.cameras.set(cameraId, updatedCamera);
      this.emit('camera:updated', updatedCamera);
      
      return updatedCamera;
    } catch (error) {
      console.error('Failed to update camera:', error);
      throw error;
    }
  }

  async deleteCamera(cameraId: string): Promise<boolean> {
    try {
      const camera = this.cameras.get(cameraId);
      if (!camera) {
        return false;
      }
      
      // Stop any active streams
      await this.stopStream(cameraId);
      
      // Remove camera
      this.cameras.delete(cameraId);
      this.emit('camera:deleted', cameraId);
      
      return true;
    } catch (error) {
      console.error('Failed to delete camera:', error);
      throw error;
    }
  }

  // UniFi Protect integration
  async discoverUniFiCameras(config: UniFiProtectConfig): Promise<Camera[]> {
    try {
      const unifiService = await this.getOrCreateUniFiService(config);
      const unifiCameras = await unifiService.discoverCameras();
      
      const cameras = unifiCameras.map(unifiCamera => 
        unifiService.convertToGenericCamera(unifiCamera)
      );
      
      return cameras;
    } catch (error) {
      console.error('Failed to discover UniFi cameras:', error);
      throw error;
    }
  }

  async testUniFiConnection(config: UniFiProtectConfig): Promise<boolean> {
    try {
      const unifiService = new UniFiProtectService(config);
      return await unifiService.authenticate();
    } catch (error) {
      console.error('Failed to test UniFi connection:', error);
      return false;
    }
  }

  private async getOrCreateUniFiService(config: UniFiProtectConfig): Promise<UniFiProtectService> {
    const serviceKey = `${config.host}:${config.port}`;
    
    if (this.unifiServices.has(serviceKey)) {
      return this.unifiServices.get(serviceKey)!;
    }
    
    const service = new UniFiProtectService(config);
    await service.authenticate();
    
    // Forward events
    service.on('motion:detected', (event: MotionEvent) => {
      this.emit('motion:detected', event);
      this.emit('event', {
        type: CameraEventType.MOTION_DETECTED,
        cameraId: event.cameraId,
        timestamp: new Date(),
        data: event
      } as CameraWebSocketEvent);
    });
    
    service.on('camera:update', (camera: UniFiCamera) => {
      // Update local camera data if it exists
      const localCamera = Array.from(this.cameras.values())
        .find(c => c.providerId === camera.id);
      
      if (localCamera) {
        const updatedCamera = service.convertToGenericCamera(camera);
        updatedCamera.id = localCamera.id;
        updatedCamera.name = localCamera.name;
        updatedCamera.location = localCamera.location;
        updatedCamera.settings = localCamera.settings;
        
        this.cameras.set(localCamera.id, updatedCamera);
        this.emit('camera:updated', updatedCamera);
      }
    });
    
    this.unifiServices.set(serviceKey, service);
    return service;
  }

  // Streaming
  async getStreamUrl(cameraId: string, options: StreamOptions): Promise<CameraStreamResponse> {
    try {
      const camera = this.cameras.get(cameraId);
      if (!camera) {
        throw new Error('Camera not found');
      }
      
      let streamUrl: string;
      
      if (camera.providerType === CameraProviderType.UBIQUITI_UNIFI) {
        const unifiService = this.getUniFiServiceForCamera(camera);
        if (!unifiService) {
          throw new Error('UniFi service not available');
        }
        
        streamUrl = await unifiService.getStreamUrl(camera.providerId, options);
      } else {
        streamUrl = camera.streamUrl || '';
      }
      
      const response: CameraStreamResponse = {
        cameraId,
        streamUrl,
        protocol: options.protocol,
        expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      };
      
      return response;
    } catch (error) {
      console.error('Failed to get stream URL:', error);
      throw error;
    }
  }

  async startStream(cameraId: string, options: StreamOptions): Promise<CameraStreamResponse> {
    try {
      const response = await this.getStreamUrl(cameraId, options);
      
      // Track active stream
      this.activeStreams.set(cameraId, {
        startTime: new Date(),
        options,
        url: response.streamUrl
      });
      
      this.emit('event', {
        type: CameraEventType.STREAM_START,
        cameraId,
        timestamp: new Date(),
        data: { options, url: response.streamUrl }
      } as CameraWebSocketEvent);
      
      return response;
    } catch (error) {
      console.error('Failed to start stream:', error);
      throw error;
    }
  }

  async stopStream(cameraId: string): Promise<boolean> {
    try {
      if (this.activeStreams.has(cameraId)) {
        this.activeStreams.delete(cameraId);
        
        this.emit('event', {
          type: CameraEventType.STREAM_END,
          cameraId,
          timestamp: new Date(),
          data: {}
        } as CameraWebSocketEvent);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to stop stream:', error);
      return false;
    }
  }

  // Capture
  async captureSnapshot(cameraId: string, options?: CaptureOptions): Promise<CaptureResult> {
    try {
      const camera = this.cameras.get(cameraId);
      if (!camera) {
        throw new Error('Camera not found');
      }
      
      let result: CaptureResult;
      
      if (camera.providerType === CameraProviderType.UBIQUITI_UNIFI) {
        const unifiService = this.getUniFiServiceForCamera(camera);
        if (!unifiService) {
          throw new Error('UniFi service not available');
        }
        
        result = await unifiService.captureSnapshot(camera.providerId, options);
      } else {
        // For generic cameras, we would implement RTSP frame capture here
        throw new Error('Snapshot capture not implemented for generic cameras');
      }
      
      // Update camera's last snapshot time
      const updatedCamera = { ...camera, lastSnapshot: new Date() };
      this.cameras.set(cameraId, updatedCamera);
      
      this.emit('event', {
        type: CameraEventType.CAPTURE_COMPLETE,
        cameraId,
        timestamp: new Date(),
        data: result
      } as CameraWebSocketEvent);
      
      return result;
    } catch (error) {
      console.error('Failed to capture snapshot:', error);
      throw error;
    }
  }

  async bulkCapture(request: BulkCaptureRequest): Promise<BulkCaptureResponse> {
    try {
      const promises = request.cameraIds.map(async (cameraId) => {
        try {
          const result = await this.captureSnapshot(cameraId, request.options);
          
          // Add AI analysis if requested
          if (request.analyze) {
            // TODO: Integrate with AI analysis service
          }
          
          return { success: true, cameraId, result };
        } catch (error) {
          return { 
            success: false, 
            cameraId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      const captures: CaptureResult[] = [];
      const failed: { cameraId: string; error: string }[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          captures.push(result.value.result);
        } else {
          const cameraId = request.cameraIds[index];
          const error = result.status === 'rejected' ? 
            result.reason : 
            (result.value as any).error;
          failed.push({ cameraId, error });
        }
      });
      
      return { captures, failed };
    } catch (error) {
      console.error('Failed to perform bulk capture:', error);
      throw error;
    }
  }

  // Motion detection
  async setMotionDetection(cameraId: string, enabled: boolean): Promise<boolean> {
    try {
      const camera = this.cameras.get(cameraId);
      if (!camera) {
        throw new Error('Camera not found');
      }
      
      if (camera.providerType === CameraProviderType.UBIQUITI_UNIFI) {
        const unifiService = this.getUniFiServiceForCamera(camera);
        if (!unifiService) {
          throw new Error('UniFi service not available');
        }
        
        return await unifiService.setMotionDetection(camera.providerId, enabled);
      }
      
      // For generic cameras, update local settings
      camera.settings.motionCapture = enabled;
      this.cameras.set(cameraId, camera);
      
      return true;
    } catch (error) {
      console.error('Failed to set motion detection:', error);
      throw error;
    }
  }

  async getMotionEvents(cameraId: string, startTime: Date, endTime: Date, limit: number = 50): Promise<MotionEvent[]> {
    try {
      const camera = this.cameras.get(cameraId);
      if (!camera) {
        throw new Error('Camera not found');
      }
      
      if (camera.providerType === CameraProviderType.UBIQUITI_UNIFI) {
        const unifiService = this.getUniFiServiceForCamera(camera);
        if (!unifiService) {
          throw new Error('UniFi service not available');
        }
        
        const recordings = await unifiService.getRecordings(camera.providerId, startTime, endTime);
        
        // Convert recordings to motion events
        return recordings
          .filter(recording => recording.type === 'motion')
          .slice(0, limit)
          .map(recording => ({
            id: recording.id,
            cameraId,
            startTime: new Date(recording.start),
            endTime: new Date(recording.end),
            duration: recording.duration,
            thumbnail: recording.thumbnail,
            zones: recording.zones || [],
            score: recording.score || 0,
            type: 'motion',
            metadata: recording
          }));
      }
      
      // For generic cameras, return empty array (would need to implement motion detection)
      return [];
    } catch (error) {
      console.error('Failed to get motion events:', error);
      throw error;
    }
  }

  // Status and health
  async getCameraStatus(cameraId: string): Promise<CameraStatus | null> {
    try {
      const camera = this.cameras.get(cameraId);
      if (!camera) {
        return null;
      }
      
      return camera.status;
    } catch (error) {
      console.error('Failed to get camera status:', error);
      throw error;
    }
  }

  async refreshCameraStatus(cameraId: string): Promise<CameraStatus | null> {
    try {
      const camera = this.cameras.get(cameraId);
      if (!camera) {
        return null;
      }
      
      if (camera.providerType === CameraProviderType.UBIQUITI_UNIFI) {
        const unifiService = this.getUniFiServiceForCamera(camera);
        if (unifiService) {
          const unifiCamera = await unifiService.getCamera(camera.providerId);
          if (unifiCamera) {
            const updatedCamera = unifiService.convertToGenericCamera(unifiCamera);
            updatedCamera.id = camera.id;
            updatedCamera.name = camera.name;
            updatedCamera.location = camera.location;
            updatedCamera.settings = camera.settings;
            
            this.cameras.set(cameraId, updatedCamera);
            return updatedCamera.status;
          }
        }
      }
      
      // For generic cameras, we might ping the stream URL
      // For now, just return current status
      return camera.status;
    } catch (error) {
      console.error('Failed to refresh camera status:', error);
      throw error;
    }
  }

  // Greenhouse integration
  async integrateCameraWithGreenhouse(
    cameraId: string,
    greenhouseId: string,
    bedIds: string[],
    monitoringSchedule?: MonitoringSchedule,
    automations?: CameraAutomation[]
  ): Promise<CameraGreenhouseIntegration> {
    try {
      const integration: CameraGreenhouseIntegration = {
        cameraId,
        greenhouseId,
        bedIds,
        monitoringSchedule: monitoringSchedule || {
          enabled: false,
          times: [],
          captureOnSchedule: false,
          analyzeOnSchedule: false
        },
        automations: automations || []
      };
      
      const existing = this.integrations.get(greenhouseId) || [];
      existing.push(integration);
      this.integrations.set(greenhouseId, existing);
      
      return integration;
    } catch (error) {
      console.error('Failed to integrate camera with greenhouse:', error);
      throw error;
    }
  }

  async getGreenhouseIntegrations(greenhouseId: string): Promise<CameraGreenhouseIntegration[]> {
    return this.integrations.get(greenhouseId) || [];
  }

  // AI Analysis integration
  async captureAndAnalyze(cameraId: string, analysisType: string, options?: any): Promise<any> {
    try {
      // Capture snapshot
      const captureResult = await this.captureSnapshot(cameraId, options?.captureOptions);
      
      // TODO: Integrate with AI analysis service
      // For now, return mock analysis
      const analysis = {
        id: `analysis_${Date.now()}`,
        timestamp: new Date(),
        type: analysisType,
        confidence: 0.8 + Math.random() * 0.2,
        plantDetection: {
          detected: true,
          plantCount: Math.floor(Math.random() * 5) + 1,
          plants: []
        },
        healthAssessment: {
          overallHealth: Math.floor(Math.random() * 40) + 60,
          issues: []
        }
      };
      
      return {
        capture: captureResult,
        analysis
      };
    } catch (error) {
      console.error('Failed to capture and analyze:', error);
      throw error;
    }
  }

  async getAnalysisHistory(
    cameraId: string,
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      // TODO: Implement analysis history storage and retrieval
      // For now, return mock data
      return {
        analyses: [],
        total: 0,
        page,
        limit
      };
    } catch (error) {
      console.error('Failed to get analysis history:', error);
      throw error;
    }
  }

  // Utility methods
  private generateCameraId(): string {
    return `camera_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUniFiServiceForCamera(camera: Camera): UniFiProtectService | null {
    // Find the UniFi service that might handle this camera
    for (const service of this.unifiServices.values()) {
      if (service.getCameras().some(c => c.id === camera.providerId)) {
        return service;
      }
    }
    return null;
  }

  // Cleanup
  async disconnect(): Promise<void> {
    try {
      // Stop all active streams
      for (const cameraId of this.activeStreams.keys()) {
        await this.stopStream(cameraId);
      }
      
      // Disconnect UniFi services
      for (const service of this.unifiServices.values()) {
        await service.disconnect();
      }
      
      this.unifiServices.clear();
      this.activeStreams.clear();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}