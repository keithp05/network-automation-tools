export interface CameraFeed {
  id: string;
  greenhouseId: string;
  location: string;
  bedIds: string[];
  type: 'fixed' | 'ptz' | 'timelapse';
  resolution: string;
  frameRate: number;
  streamUrl: string;
  isActive: boolean;
}

export interface CapturedImage {
  id: string;
  cameraId: string;
  timestamp: Date;
  imageUrl: string;
  metadata: {
    bedIds: string[];
    crops: string[];
    growthStage: string;
    environmentalConditions?: {
      temperature: number;
      humidity: number;
      lightLevel: number;
    };
  };
  analysisResults?: ImageAnalysis;
}

export interface ImageAnalysis {
  id: string;
  imageId: string;
  timestamp: Date;
  cropHealth: CropHealthAnalysis;
  pestDetection: PestDetection[];
  diseaseDetection: DiseaseDetection[];
  harvestReadiness: HarvestReadiness;
  growthProgress: GrowthProgress;
  alerts: Alert[];
}

export interface CropHealthAnalysis {
  overallScore: number; // 0-100
  leafColor: {
    status: 'healthy' | 'yellowing' | 'browning' | 'wilting';
    confidence: number;
  };
  growthRate: {
    status: 'normal' | 'slow' | 'fast' | 'stunted';
    percentageVsExpected: number;
  };
  canopyDensity: number;
  stressIndicators: string[];
}

export interface PestDetection {
  pestType: string;
  commonName: string;
  scientificName?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  location: BoundingBox;
  recommendedActions: string[];
  organicTreatments: string[];
  chemicalTreatments?: string[];
}

export interface DiseaseDetection {
  diseaseType: string;
  commonName: string;
  pathogen?: string;
  severity: 'early' | 'moderate' | 'advanced' | 'severe';
  confidence: number;
  affectedArea: BoundingBox[];
  symptoms: string[];
  recommendedActions: string[];
  preventiveMeasures: string[];
}

export interface HarvestReadiness {
  cropId: string;
  readinessScore: number; // 0-100
  estimatedDaysToHarvest: number;
  visualIndicators: {
    size: 'undersized' | 'optimal' | 'oversized';
    color: 'immature' | 'ready' | 'overripe';
    texture: string;
  };
  recommendedHarvestWindow: {
    start: Date;
    end: Date;
  };
  confidence: number;
}

export interface GrowthProgress {
  currentStage: string;
  percentageComplete: number;
  daysInCurrentStage: number;
  expectedDaysRemaining: number;
  growthRateVsAverage: number; // percentage
  heightMeasurement?: number;
  leafCount?: number;
  fruitCount?: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  actionRequired: boolean;
  suggestedActions: string[];
  autoDismiss: boolean;
  dismissed?: boolean;
}

export enum AlertType {
  PEST_DETECTED = 'pest_detected',
  DISEASE_DETECTED = 'disease_detected',
  HARVEST_READY = 'harvest_ready',
  HARVEST_OVERDUE = 'harvest_overdue',
  GROWTH_ANOMALY = 'growth_anomaly',
  ENVIRONMENTAL_STRESS = 'environmental_stress',
  WATER_STRESS = 'water_stress',
  NUTRIENT_DEFICIENCY = 'nutrient_deficiency'
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TimeLapseSequence {
  id: string;
  cropId: string;
  bedId: string;
  startDate: Date;
  endDate?: Date;
  captureInterval: number; // minutes
  images: CapturedImage[];
  analysis: TimeLapseAnalysis;
}

export interface TimeLapseAnalysis {
  growthRate: {
    daily: number;
    weekly: number;
    overall: number;
  };
  anomalies: {
    date: Date;
    type: string;
    description: string;
  }[];
  predictedHarvestDate: Date;
  healthTrend: {
    date: Date;
    score: number;
  }[];
}

export interface MonitoringConfig {
  enablePestDetection: boolean;
  enableDiseaseDetection: boolean;
  enableHarvestPrediction: boolean;
  enableGrowthTracking: boolean;
  captureInterval: number; // minutes
  alertThresholds: {
    pestSeverity: 'low' | 'medium' | 'high';
    diseaseConfidence: number;
    harvestReadiness: number;
  };
  notificationChannels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
}