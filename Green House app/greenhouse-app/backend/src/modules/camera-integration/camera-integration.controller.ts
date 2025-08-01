import { Request, Response } from 'express';
import { CameraIntegrationService } from './camera-integration.service';
import { UniFiProtectService } from './unifi-protect.service';
import {
  AddCameraRequest,
  UpdateCameraRequest,
  CaptureOptions,
  BulkCaptureRequest,
  StreamOptions,
  Camera,
  CameraProviderType,
  UniFiProtectConfig
} from './camera-integration.types';

export class CameraIntegrationController {
  private cameraService: CameraIntegrationService;

  constructor() {
    this.cameraService = new CameraIntegrationService();
  }

  // Camera management endpoints
  async addCamera(req: Request, res: Response): Promise<void> {
    try {
      const request: AddCameraRequest = req.body;
      
      // Validate required fields
      if (!request.providerType || !request.name || !request.location) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: providerType, name, location'
        });
        return;
      }

      const camera = await this.cameraService.addCamera(request);
      
      res.status(201).json({
        success: true,
        camera,
        message: 'Camera added successfully'
      });
    } catch (error) {
      console.error('Error adding camera:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add camera',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getCameras(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, status, providerType } = req.query;
      
      const filters = {
        status: status as string,
        providerType: providerType as CameraProviderType
      };

      const result = await this.cameraService.getCameras(
        parseInt(page as string),
        parseInt(limit as string),
        filters
      );
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error getting cameras:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cameras',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getCamera(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      
      const camera = await this.cameraService.getCamera(cameraId);
      
      if (!camera) {
        res.status(404).json({
          success: false,
          message: 'Camera not found'
        });
        return;
      }
      
      res.json({
        success: true,
        camera
      });
    } catch (error) {
      console.error('Error getting camera:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get camera',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateCamera(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      const updates: UpdateCameraRequest = req.body;
      
      const camera = await this.cameraService.updateCamera(cameraId, updates);
      
      if (!camera) {
        res.status(404).json({
          success: false,
          message: 'Camera not found'
        });
        return;
      }
      
      res.json({
        success: true,
        camera,
        message: 'Camera updated successfully'
      });
    } catch (error) {
      console.error('Error updating camera:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update camera',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteCamera(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      
      const success = await this.cameraService.deleteCamera(cameraId);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Camera not found'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Camera deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting camera:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete camera',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // UniFi Protect specific endpoints
  async discoverUniFiCameras(req: Request, res: Response): Promise<void> {
    try {
      const config: UniFiProtectConfig = req.body;
      
      // Validate UniFi configuration
      if (!config.host || !config.username || !config.password) {
        res.status(400).json({
          success: false,
          message: 'Missing required UniFi Protect configuration'
        });
        return;
      }

      const cameras = await this.cameraService.discoverUniFiCameras(config);
      
      res.json({
        success: true,
        cameras,
        count: cameras.length,
        message: `Discovered ${cameras.length} UniFi cameras`
      });
    } catch (error) {
      console.error('Error discovering UniFi cameras:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to discover UniFi cameras',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testUniFiConnection(req: Request, res: Response): Promise<void> {
    try {
      const config: UniFiProtectConfig = req.body;
      
      const isConnected = await this.cameraService.testUniFiConnection(config);
      
      res.json({
        success: isConnected,
        connected: isConnected,
        message: isConnected ? 'Connection successful' : 'Connection failed'
      });
    } catch (error) {
      console.error('Error testing UniFi connection:', error);
      res.status(500).json({
        success: false,
        connected: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Streaming endpoints
  async getStreamUrl(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      const options: StreamOptions = {
        quality: (req.query.quality as any) || 'high',
        protocol: (req.query.protocol as any) || 'rtsp',
        audio: req.query.audio === 'true',
        transcode: req.query.transcode === 'true'
      };

      const streamResponse = await this.cameraService.getStreamUrl(cameraId, options);
      
      res.json({
        success: true,
        ...streamResponse
      });
    } catch (error) {
      console.error('Error getting stream URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get stream URL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async startStream(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      const options: StreamOptions = req.body;
      
      const streamResponse = await this.cameraService.startStream(cameraId, options);
      
      res.json({
        success: true,
        ...streamResponse
      });
    } catch (error) {
      console.error('Error starting stream:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start stream',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async stopStream(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      
      const success = await this.cameraService.stopStream(cameraId);
      
      res.json({
        success,
        message: success ? 'Stream stopped successfully' : 'Failed to stop stream'
      });
    } catch (error) {
      console.error('Error stopping stream:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop stream',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Capture endpoints
  async captureSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      const options: CaptureOptions = req.body;
      
      const result = await this.cameraService.captureSnapshot(cameraId, options);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error capturing snapshot:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to capture snapshot',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async bulkCapture(req: Request, res: Response): Promise<void> {
    try {
      const request: BulkCaptureRequest = req.body;
      
      if (!request.cameraIds || request.cameraIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No camera IDs provided'
        });
        return;
      }

      const result = await this.cameraService.bulkCapture(request);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error performing bulk capture:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk capture',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Motion detection endpoints
  async setMotionDetection(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      const { enabled } = req.body;
      
      const success = await this.cameraService.setMotionDetection(cameraId, enabled);
      
      res.json({
        success,
        message: success ? 
          `Motion detection ${enabled ? 'enabled' : 'disabled'} successfully` :
          'Failed to update motion detection settings'
      });
    } catch (error) {
      console.error('Error setting motion detection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update motion detection settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getMotionEvents(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      const { startTime, endTime, limit = 50 } = req.query;
      
      const start = startTime ? new Date(startTime as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endTime ? new Date(endTime as string) : new Date();
      
      const events = await this.cameraService.getMotionEvents(
        cameraId, 
        start, 
        end, 
        parseInt(limit as string)
      );
      
      res.json({
        success: true,
        events,
        count: events.length
      });
    } catch (error) {
      console.error('Error getting motion events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get motion events',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Status and health endpoints
  async getCameraStatus(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      
      const status = await this.cameraService.getCameraStatus(cameraId);
      
      if (!status) {
        res.status(404).json({
          success: false,
          message: 'Camera not found'
        });
        return;
      }
      
      res.json({
        success: true,
        status
      });
    } catch (error) {
      console.error('Error getting camera status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get camera status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async refreshCameraStatus(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      
      const status = await this.cameraService.refreshCameraStatus(cameraId);
      
      if (!status) {
        res.status(404).json({
          success: false,
          message: 'Camera not found'
        });
        return;
      }
      
      res.json({
        success: true,
        status,
        message: 'Camera status refreshed successfully'
      });
    } catch (error) {
      console.error('Error refreshing camera status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh camera status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Integration endpoints
  async integrateCameraWithGreenhouse(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      const { greenhouseId, bedIds, monitoringSchedule, automations } = req.body;
      
      const integration = await this.cameraService.integrateCameraWithGreenhouse(
        cameraId,
        greenhouseId,
        bedIds,
        monitoringSchedule,
        automations
      );
      
      res.json({
        success: true,
        integration,
        message: 'Camera integrated with greenhouse successfully'
      });
    } catch (error) {
      console.error('Error integrating camera with greenhouse:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to integrate camera with greenhouse',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getGreenhouseIntegrations(req: Request, res: Response): Promise<void> {
    try {
      const { greenhouseId } = req.params;
      
      const integrations = await this.cameraService.getGreenhouseIntegrations(greenhouseId);
      
      res.json({
        success: true,
        integrations,
        count: integrations.length
      });
    } catch (error) {
      console.error('Error getting greenhouse integrations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get greenhouse integrations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // AI Analysis integration
  async captureAndAnalyze(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      const { analysisType = 'comprehensive', options } = req.body;
      
      const result = await this.cameraService.captureAndAnalyze(
        cameraId,
        analysisType,
        options
      );
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error capturing and analyzing:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to capture and analyze image',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAnalysisHistory(req: Request, res: Response): Promise<void> {
    try {
      const { cameraId } = req.params;
      const { page = 1, limit = 20, startDate, endDate } = req.query;
      
      const history = await this.cameraService.getAnalysisHistory(
        cameraId,
        parseInt(page as string),
        parseInt(limit as string),
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json({
        success: true,
        ...history
      });
    } catch (error) {
      console.error('Error getting analysis history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get analysis history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}