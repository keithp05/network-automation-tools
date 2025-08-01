import {
  CameraFeed,
  CapturedImage,
  ImageAnalysis,
  TimeLapseSequence,
  MonitoringConfig,
  Alert
} from './monitoring.types';
import { VisionAIService } from './vision-ai.service';
import { CropCalendarService } from '../crop-calendar/crop-calendar.service';
import { io } from '../../index';

export class MonitoringService {
  private static cameras: Map<string, CameraFeed> = new Map();
  private static captureIntervals: Map<string, NodeJS.Timer> = new Map();
  private static timeLapseSequences: Map<string, TimeLapseSequence> = new Map();
  
  static async addCamera(camera: CameraFeed): Promise<CameraFeed> {
    this.cameras.set(camera.id, camera);
    
    if (camera.isActive) {
      await this.startMonitoring(camera.id);
    }
    
    return camera;
  }
  
  static async startMonitoring(
    cameraId: string,
    config?: MonitoringConfig
  ): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (!camera) {
      throw new Error(`Camera ${cameraId} not found`);
    }
    
    const intervalMinutes = config?.captureInterval || 60; // Default 1 hour
    
    // Clear existing interval if any
    if (this.captureIntervals.has(cameraId)) {
      clearInterval(this.captureIntervals.get(cameraId)!);
    }
    
    // Set up new capture interval
    const interval = setInterval(async () => {
      try {
        await this.captureAndAnalyze(cameraId, config);
      } catch (error) {
        console.error(`Error capturing from camera ${cameraId}:`, error);
      }
    }, intervalMinutes * 60 * 1000);
    
    this.captureIntervals.set(cameraId, interval);
    
    // Take initial capture
    await this.captureAndAnalyze(cameraId, config);
  }
  
  static async stopMonitoring(cameraId: string): Promise<void> {
    const interval = this.captureIntervals.get(cameraId);
    if (interval) {
      clearInterval(interval);
      this.captureIntervals.delete(cameraId);
    }
  }
  
  static async captureAndAnalyze(
    cameraId: string,
    config?: MonitoringConfig
  ): Promise<ImageAnalysis[]> {
    const camera = this.cameras.get(cameraId);
    if (!camera) {
      throw new Error(`Camera ${cameraId} not found`);
    }
    
    // Capture image from camera
    const capturedImage = await this.captureImage(camera);
    
    // Analyze for each bed/crop the camera monitors
    const analyses: ImageAnalysis[] = [];
    
    for (const bedId of camera.bedIds) {
      // Get crop information for this bed
      const cropInfo = await this.getCropInfoForBed(bedId);
      if (!cropInfo) continue;
      
      // Perform AI analysis
      const analysis = await VisionAIService.analyzeImage(
        capturedImage,
        cropInfo.cropName,
        cropInfo.plantingDate
      );
      
      // Check against configured thresholds
      if (config) {
        await this.processAlerts(analysis, config, bedId);
      }
      
      // Add to time-lapse if applicable
      if (camera.type === 'timelapse') {
        await this.addToTimeLapse(bedId, capturedImage, analysis);
      }
      
      analyses.push(analysis);
    }
    
    return analyses;
  }
  
  private static async captureImage(camera: CameraFeed): Promise<CapturedImage> {
    // In production, this would interface with actual camera hardware/stream
    // For now, we'll create a mock captured image
    
    const timestamp = new Date();
    const imageUrl = await this.captureFromStream(camera.streamUrl);
    
    const capturedImage: CapturedImage = {
      id: `img-${camera.id}-${timestamp.getTime()}`,
      cameraId: camera.id,
      timestamp,
      imageUrl,
      metadata: {
        bedIds: camera.bedIds,
        crops: [], // Will be populated based on bed data
        growthStage: '', // Will be determined by analysis
        environmentalConditions: await this.getEnvironmentalData()
      }
    };
    
    return capturedImage;
  }
  
  private static async captureFromStream(streamUrl: string): Promise<string> {
    // In production, this would:
    // 1. Connect to the camera stream
    // 2. Capture a frame
    // 3. Save to storage
    // 4. Return the URL
    
    // Mock implementation
    return `https://storage.greenhouse.app/captures/${Date.now()}.jpg`;
  }
  
  private static async getCropInfoForBed(bedId: string): Promise<{
    cropName: string;
    plantingDate: Date;
  } | null> {
    // In production, this would query the database
    // Mock implementation
    return {
      cropName: 'Tomatoes',
      plantingDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
    };
  }
  
  private static async getEnvironmentalData(): Promise<any> {
    // In production, this would get data from environmental sensors
    return {
      temperature: 72,
      humidity: 65,
      lightLevel: 800
    };
  }
  
  private static async processAlerts(
    analysis: ImageAnalysis,
    config: MonitoringConfig,
    bedId: string
  ): Promise<void> {
    const alerts = analysis.alerts.filter(alert => {
      // Filter based on configured thresholds
      if (alert.type === 'pest_detected') {
        const pest = analysis.pestDetection.find(p => 
          alert.description.includes(p.pestType)
        );
        if (pest && this.getSeverityLevel(pest.severity) < 
            this.getSeverityLevel(config.alertThresholds.pestSeverity)) {
          return false;
        }
      }
      
      if (alert.type === 'disease_detected') {
        const disease = analysis.diseaseDetection.find(d => 
          alert.description.includes(d.diseaseType)
        );
        if (disease && disease.confidence < config.alertThresholds.diseaseConfidence) {
          return false;
        }
      }
      
      if (alert.type === 'harvest_ready' || alert.type === 'harvest_overdue') {
        if (analysis.harvestReadiness.readinessScore < 
            config.alertThresholds.harvestReadiness) {
          return false;
        }
      }
      
      return true;
    });
    
    // Send notifications for qualifying alerts
    for (const alert of alerts) {
      await this.sendNotifications(alert, config, bedId);
    }
  }
  
  private static async sendNotifications(
    alert: Alert,
    config: MonitoringConfig,
    bedId: string
  ): Promise<void> {
    // Real-time notification via Socket.IO
    if (config.notificationChannels.inApp) {
      io.emit('monitoring-alert', {
        bedId,
        alert,
        timestamp: new Date()
      });
    }
    
    // Email notification
    if (config.notificationChannels.email && alert.severity !== 'info') {
      // await EmailService.send(...)
    }
    
    // SMS for critical alerts
    if (config.notificationChannels.sms && alert.severity === 'critical') {
      // await SMSService.send(...)
    }
    
    // Push notification
    if (config.notificationChannels.push) {
      // await PushNotificationService.send(...)
    }
  }
  
  private static async addToTimeLapse(
    bedId: string,
    image: CapturedImage,
    analysis: ImageAnalysis
  ): Promise<void> {
    const sequenceKey = `${bedId}-${image.metadata.crops[0]}`;
    let sequence = this.timeLapseSequences.get(sequenceKey);
    
    if (!sequence) {
      sequence = {
        id: `timelapse-${sequenceKey}`,
        cropId: image.metadata.crops[0],
        bedId,
        startDate: image.timestamp,
        captureInterval: 60, // minutes
        images: [],
        analysis: {
          growthRate: { daily: 0, weekly: 0, overall: 0 },
          anomalies: [],
          predictedHarvestDate: new Date(),
          healthTrend: []
        }
      };
      this.timeLapseSequences.set(sequenceKey, sequence);
    }
    
    // Add image to sequence
    sequence.images.push(image);
    
    // Update analysis
    sequence.analysis.healthTrend.push({
      date: image.timestamp,
      score: analysis.cropHealth.overallScore
    });
    
    // Detect anomalies
    if (analysis.alerts.length > 0) {
      sequence.analysis.anomalies.push({
        date: image.timestamp,
        type: analysis.alerts[0].type,
        description: analysis.alerts[0].description
      });
    }
    
    // Update growth rate (simplified)
    if (sequence.images.length > 1) {
      const latestGrowth = analysis.growthProgress.heightMeasurement || 0;
      const previousGrowth = sequence.images[sequence.images.length - 2]
        .analysisResults?.growthProgress.heightMeasurement || 0;
      
      sequence.analysis.growthRate.daily = latestGrowth - previousGrowth;
      sequence.analysis.growthRate.weekly = sequence.analysis.growthRate.daily * 7;
      sequence.analysis.growthRate.overall = latestGrowth;
    }
    
    // Update harvest prediction
    if (analysis.harvestReadiness.estimatedDaysToHarvest > 0) {
      sequence.analysis.predictedHarvestDate = new Date();
      sequence.analysis.predictedHarvestDate.setDate(
        sequence.analysis.predictedHarvestDate.getDate() + 
        analysis.harvestReadiness.estimatedDaysToHarvest
      );
    }
  }
  
  static async getTimeLapseSequence(
    bedId: string,
    cropId: string
  ): Promise<TimeLapseSequence | null> {
    return this.timeLapseSequences.get(`${bedId}-${cropId}`) || null;
  }
  
  static async generateTimeLapseVideo(
    sequenceId: string
  ): Promise<string> {
    const sequence = Array.from(this.timeLapseSequences.values())
      .find(s => s.id === sequenceId);
    
    if (!sequence) {
      throw new Error('Time-lapse sequence not found');
    }
    
    // In production, this would:
    // 1. Compile images into video
    // 2. Add overlays with growth data
    // 3. Save to storage
    // 4. Return video URL
    
    return `https://storage.greenhouse.app/timelapses/${sequenceId}.mp4`;
  }
  
  private static getSeverityLevel(severity: string): number {
    const levels = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    return levels[severity] || 0;
  }
}