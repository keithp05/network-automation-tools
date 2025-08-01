export interface CropCalendar {
  cropId: string;
  cropName: string;
  greenhouseId: string;
  bedId: string;
  plantingDate: Date;
  expectedHarvestDate: Date;
  actualHarvestDate?: Date;
  daysToMaturity: number;
  growthStages: GrowthStage[];
  currentStage: string;
  tasks: CropTask[];
}

export interface GrowthStage {
  name: string;
  startDay: number;
  endDay: number;
  description: string;
  requiredTasks: string[];
  optimalConditions: {
    temperature: { min: number; max: number };
    humidity: { min: number; max: number };
    lightHours: number;
  };
}

export interface CropTask {
  id: string;
  cropId: string;
  taskType: TaskType;
  description: string;
  dueDate: Date;
  completed: boolean;
  completedDate?: Date;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export enum TaskType {
  PLANTING = 'planting',
  WATERING = 'watering',
  FERTILIZING = 'fertilizing',
  PRUNING = 'pruning',
  PEST_CHECK = 'pest_check',
  HARVESTING = 'harvesting',
  TRANSPLANTING = 'transplanting',
  THINNING = 'thinning'
}

export interface PlantingWindow {
  crop: string;
  climateZone: string;
  springPlanting: { start: Date; end: Date };
  fallPlanting?: { start: Date; end: Date };
  indoorStart?: { weeksBeforeLastFrost: number };
  transplantTime?: { weeksAfterIndoorStart: number };
  daysToMaturity: { min: number; max: number };
  optimalTemp: { min: number; max: number };
}

export interface HarvestIndicator {
  cropId: string;
  visualIndicators: string[];
  sizeIndicators?: {
    diameter?: number;
    length?: number;
    weight?: number;
  };
  colorIndicators: string[];
  textureIndicators: string[];
  daysFromFlowering?: number;
  aiConfidenceScore?: number;
}

export interface CropSchedule {
  year: number;
  month: number;
  plantingDates: ScheduledCrop[];
  harvestDates: ScheduledCrop[];
  tasks: CropTask[];
}

export interface ScheduledCrop {
  date: Date;
  cropName: string;
  bedId: string;
  quantity: number;
  variety?: string;
  notes?: string;
}