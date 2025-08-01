export interface GrowthMeasurement {
  id: string;
  bedId: string;
  cropId: string;
  userId: string;
  measurementDate: Date;
  plantAge: number; // days since planting
  measurements: PlantMeasurements;
  photos: GrowthPhoto[];
  notes?: string;
  weather?: WeatherConditions;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlantMeasurements {
  height?: {
    value: number;
    unit: 'inches' | 'cm';
    measurementPoint: 'soil' | 'base' | 'tallest';
  };
  width?: {
    value: number;
    unit: 'inches' | 'cm';
    measurementPoint: 'widest' | 'canopy';
  };
  leafCount?: {
    total: number;
    mature: number;
    new: number;
  };
  stemDiameter?: {
    value: number;
    unit: 'mm' | 'inches';
    measurementHeight: number;
  };
  fruitCount?: {
    total: number;
    ripe: number;
    unripe: number;
    flowering: number;
  };
  rootDepth?: {
    value: number;
    unit: 'inches' | 'cm';
    estimatedOrMeasured: 'estimated' | 'measured';
  };
  healthScore: number; // 0-100
  overallCondition: PlantCondition;
}

export enum PlantCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  CRITICAL = 'critical'
}

export interface GrowthPhoto {
  id: string;
  url: string;
  type: PhotoType;
  angle: PhotoAngle;
  timestamp: Date;
  metadata?: {
    camera: string;
    lighting: LightingCondition;
    distance?: number; // cm from plant
  };
}

export enum PhotoType {
  OVERVIEW = 'overview',
  CLOSE_UP = 'close_up',
  LEAVES = 'leaves',
  FLOWERS = 'flowers',
  FRUITS = 'fruits',
  ROOTS = 'roots',
  COMPARISON = 'comparison'
}

export enum PhotoAngle {
  TOP = 'top',
  SIDE = 'side',
  FRONT = 'front',
  BACK = 'back',
  ANGLE_45 = '45_degree'
}

export enum LightingCondition {
  NATURAL = 'natural',
  ARTIFICIAL = 'artificial',
  MIXED = 'mixed',
  LOW_LIGHT = 'low_light'
}

export interface WeatherConditions {
  temperature: {
    current: number;
    high: number;
    low: number;
    unit: 'fahrenheit' | 'celsius';
  };
  humidity: number; // percentage
  lightHours: number;
  rainfall?: number; // inches or mm
  windSpeed?: number;
}

export interface GrowthTimeline {
  cropId: string;
  bedId: string;
  plantingDate: Date;
  expectedHarvestDate: Date;
  measurements: GrowthMeasurement[];
  milestones: GrowthMilestone[];
  growthRate: GrowthRateAnalysis;
  predictions: GrowthPrediction;
}

export interface GrowthMilestone {
  id: string;
  name: string;
  description: string;
  expectedDate: Date;
  actualDate?: Date;
  achieved: boolean;
  milestone: MilestoneType;
  measurement?: Partial<PlantMeasurements>;
}

export enum MilestoneType {
  GERMINATION = 'germination',
  FIRST_LEAVES = 'first_leaves',
  TRANSPLANT = 'transplant',
  FLOWERING = 'flowering',
  FRUIT_SET = 'fruit_set',
  FIRST_HARVEST = 'first_harvest',
  PEAK_PRODUCTION = 'peak_production',
  END_OF_SEASON = 'end_of_season'
}

export interface GrowthRateAnalysis {
  heightGrowthRate: {
    current: number; // units per day
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  leafDevelopmentRate: {
    newLeavesPerWeek: number;
    averageLeafSize: number;
  };
  overallHealthTrend: {
    direction: 'improving' | 'declining' | 'stable';
    score: number;
    factors: string[];
  };
}

export interface GrowthPrediction {
  expectedHarvestDate: Date;
  expectedYield: {
    quantity: number;
    unit: string;
    confidence: number; // 0-1
  };
  nextMilestone: {
    milestone: MilestoneType;
    expectedDate: Date;
    confidence: number;
  };
  recommendedActions: GrowthRecommendation[];
}

export interface GrowthRecommendation {
  id: string;
  type: RecommendationType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionRequired: boolean;
  dueDate?: Date;
  estimatedTimeMinutes?: number;
}

export enum RecommendationType {
  WATERING = 'watering',
  FERTILIZING = 'fertilizing',
  PRUNING = 'pruning',
  TRAINING = 'training',
  PEST_CONTROL = 'pest_control',
  DISEASE_PREVENTION = 'disease_prevention',
  HARVESTING = 'harvesting',
  ENVIRONMENTAL = 'environmental'
}

export interface GrowthComparisonData {
  currentPlant: GrowthTimeline;
  averageForCrop: GrowthStatistics;
  similarConditions: GrowthTimeline[];
  performanceRanking: number; // percentile 0-100
}

export interface GrowthStatistics {
  cropType: string;
  averageHeightByAge: { age: number; height: number }[];
  averageLeafCountByAge: { age: number; count: number }[];
  averageYield: number;
  averageGrowthCycle: number; // days
  commonMilestones: { milestone: MilestoneType; averageDay: number }[];
}

export interface BulkMeasurementRequest {
  bedIds: string[];
  measurements: Partial<PlantMeasurements>;
  notes?: string;
  photos?: File[];
}

export interface GrowthReport {
  id: string;
  userId: string;
  reportType: ReportType;
  dateRange: {
    start: Date;
    end: Date;
  };
  crops: string[];
  beds: string[];
  data: GrowthReportData;
  generatedAt: Date;
}

export enum ReportType {
  INDIVIDUAL_PLANT = 'individual_plant',
  BED_SUMMARY = 'bed_summary',
  CROP_COMPARISON = 'crop_comparison',
  SEASONAL_ANALYSIS = 'seasonal_analysis',
  YIELD_FORECAST = 'yield_forecast'
}

export interface GrowthReportData {
  summary: {
    totalMeasurements: number;
    plantsTracked: number;
    averageHealthScore: number;
    completedMilestones: number;
    upcomingMilestones: number;
  };
  charts: {
    heightProgression: ChartData;
    healthTrends: ChartData;
    milestoneProgress: ChartData;
    yieldProjection: ChartData;
  };
  insights: string[];
  recommendations: GrowthRecommendation[];
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
}

// Alert Management Types
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  bedId?: string;
  cropId?: string;
  userId: string;
  isRead: boolean;
  isArchived: boolean;
  actionTaken: boolean;
  createdAt: Date;
  readAt?: Date;
  archivedAt?: Date;
  metadata?: AlertMetadata;
}

export enum AlertType {
  GROWTH_MILESTONE = 'growth_milestone',
  GROWTH_CONCERN = 'growth_concern',
  HARVEST_READY = 'harvest_ready',
  PEST_DETECTED = 'pest_detected',
  DISEASE_DETECTED = 'disease_detected',
  WATERING_NEEDED = 'watering_needed',
  FERTILIZER_DUE = 'fertilizer_due',
  TEMPERATURE_ALERT = 'temperature_alert',
  SYSTEM_NOTIFICATION = 'system_notification'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  URGENT = 'urgent'
}

export interface AlertMetadata {
  autoGenerated: boolean;
  source: 'ai_vision' | 'growth_tracking' | 'user_input' | 'system';
  confidence?: number;
  relatedMeasurementId?: string;
  suggestedActions?: string[];
  estimatedResolveTime?: number; // minutes
}

export interface BulkAlertAction {
  alertIds: string[];
  action: 'mark_read' | 'archive' | 'delete' | 'mark_action_taken';
  userId: string;
}

export interface AlertFilter {
  types?: AlertType[];
  severities?: AlertSeverity[];
  bedIds?: string[];
  cropIds?: string[];
  isRead?: boolean;
  isArchived?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

export interface AlertSummary {
  total: number;
  unread: number;
  critical: number;
  warnings: number;
  byType: Record<AlertType, number>;
  bySeverity: Record<AlertSeverity, number>;
  recentCount: number; // last 24 hours
}