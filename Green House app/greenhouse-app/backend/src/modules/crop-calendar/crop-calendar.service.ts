import { 
  CropCalendar, 
  CropTask, 
  TaskType, 
  PlantingWindow,
  HarvestIndicator,
  CropSchedule,
  ScheduledCrop
} from './crop-calendar.types';
import { CROP_PLANTING_WINDOWS, GROWTH_STAGES, HARVEST_INDICATORS } from './crop-data';

export class CropCalendarService {
  
  static createCropCalendar(
    cropName: string,
    plantingDate: Date,
    greenhouseId: string,
    bedId: string
  ): CropCalendar {
    const plantingWindow = CROP_PLANTING_WINDOWS[cropName];
    const growthStages = GROWTH_STAGES[cropName] || [];
    
    if (!plantingWindow) {
      throw new Error(`No planting data available for crop: ${cropName}`);
    }
    
    // Calculate expected harvest date
    const avgDaysToMaturity = Math.round(
      (plantingWindow.daysToMaturity.min + plantingWindow.daysToMaturity.max) / 2
    );
    const expectedHarvestDate = new Date(plantingDate);
    expectedHarvestDate.setDate(expectedHarvestDate.getDate() + avgDaysToMaturity);
    
    // Generate tasks based on growth stages
    const tasks = this.generateCropTasks(cropName, plantingDate, growthStages);
    
    // Determine current growth stage
    const daysSincePlanting = Math.floor(
      (new Date().getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentStage = this.getCurrentStage(daysSincePlanting, growthStages);
    
    const cropCalendar: CropCalendar = {
      cropId: `${greenhouseId}-${bedId}-${Date.now()}`,
      cropName,
      greenhouseId,
      bedId,
      plantingDate,
      expectedHarvestDate,
      daysToMaturity: avgDaysToMaturity,
      growthStages,
      currentStage: currentStage || 'pre-planting',
      tasks
    };
    
    return cropCalendar;
  }
  
  static generateCropTasks(
    cropName: string, 
    plantingDate: Date, 
    growthStages: any[]
  ): CropTask[] {
    const tasks: CropTask[] = [];
    const cropId = `${cropName}-${Date.now()}`;
    
    // Add planting task
    tasks.push({
      id: `task-${Date.now()}-1`,
      cropId,
      taskType: TaskType.PLANTING,
      description: `Plant ${cropName} seeds/seedlings`,
      dueDate: plantingDate,
      completed: false,
      priority: 'high'
    });
    
    // Add tasks based on growth stages
    growthStages.forEach((stage, index) => {
      const stageStartDate = new Date(plantingDate);
      stageStartDate.setDate(stageStartDate.getDate() + stage.startDay);
      
      // Add stage-specific tasks
      if (stage.requiredTasks.includes('fertilizing')) {
        tasks.push({
          id: `task-${Date.now()}-${index}-fert`,
          cropId,
          taskType: TaskType.FERTILIZING,
          description: `Fertilize ${cropName} - ${stage.name} stage`,
          dueDate: stageStartDate,
          completed: false,
          priority: 'medium'
        });
      }
      
      if (stage.requiredTasks.includes('pruning')) {
        tasks.push({
          id: `task-${Date.now()}-${index}-prune`,
          cropId,
          taskType: TaskType.PRUNING,
          description: `Prune ${cropName} for optimal growth`,
          dueDate: new Date(stageStartDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          completed: false,
          priority: 'medium'
        });
      }
      
      if (stage.requiredTasks.includes('pest_monitoring')) {
        // Weekly pest checks during critical stages
        const weeklyChecks = Math.floor((stage.endDay - stage.startDay) / 7);
        for (let week = 0; week < weeklyChecks; week++) {
          const checkDate = new Date(stageStartDate);
          checkDate.setDate(checkDate.getDate() + (week * 7));
          
          tasks.push({
            id: `task-${Date.now()}-${index}-pest-${week}`,
            cropId,
            taskType: TaskType.PEST_CHECK,
            description: `Weekly pest inspection - ${stage.name} stage`,
            dueDate: checkDate,
            completed: false,
            priority: 'high'
          });
        }
      }
    });
    
    // Add harvest task
    const harvestDate = new Date(plantingDate);
    const plantingWindow = CROP_PLANTING_WINDOWS[cropName];
    if (plantingWindow) {
      harvestDate.setDate(
        harvestDate.getDate() + plantingWindow.daysToMaturity.min
      );
      
      tasks.push({
        id: `task-${Date.now()}-harvest`,
        cropId,
        taskType: TaskType.HARVESTING,
        description: `Check ${cropName} for harvest readiness`,
        dueDate: harvestDate,
        completed: false,
        priority: 'high',
        notes: 'Use visual indicators to determine optimal harvest time'
      });
    }
    
    return tasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }
  
  static getCurrentStage(daysSincePlanting: number, stages: any[]): string | null {
    for (const stage of stages) {
      if (daysSincePlanting >= stage.startDay && daysSincePlanting <= stage.endDay) {
        return stage.name;
      }
    }
    return null;
  }
  
  static getOptimalPlantingDates(
    cropName: string, 
    climateZone: string,
    year: number
  ): PlantingWindow | null {
    const baseWindow = CROP_PLANTING_WINDOWS[cropName];
    if (!baseWindow) return null;
    
    // Adjust dates for the specified year
    const adjustedWindow: PlantingWindow = {
      ...baseWindow,
      springPlanting: {
        start: new Date(year, baseWindow.springPlanting.start.getMonth(), baseWindow.springPlanting.start.getDate()),
        end: new Date(year, baseWindow.springPlanting.end.getMonth(), baseWindow.springPlanting.end.getDate())
      }
    };
    
    if (baseWindow.fallPlanting) {
      adjustedWindow.fallPlanting = {
        start: new Date(year, baseWindow.fallPlanting.start.getMonth(), baseWindow.fallPlanting.start.getDate()),
        end: new Date(year, baseWindow.fallPlanting.end.getMonth(), baseWindow.fallPlanting.end.getDate())
      };
    }
    
    // Adjust for climate zone differences
    adjustedWindow.climateZone = climateZone;
    
    return adjustedWindow;
  }
  
  static calculateHarvestReadiness(
    cropName: string,
    plantingDate: Date,
    currentImageAnalysis?: any
  ): {
    readinessScore: number;
    estimatedDaysToHarvest: number;
    indicators: string[];
  } {
    const daysSincePlanting = Math.floor(
      (new Date().getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const plantingWindow = CROP_PLANTING_WINDOWS[cropName];
    if (!plantingWindow) {
      return {
        readinessScore: 0,
        estimatedDaysToHarvest: 30,
        indicators: ['No data available for this crop']
      };
    }
    
    const minDays = plantingWindow.daysToMaturity.min;
    const maxDays = plantingWindow.daysToMaturity.max;
    
    // Calculate readiness based on days
    let readinessScore = 0;
    if (daysSincePlanting >= minDays) {
      readinessScore = Math.min(
        100,
        ((daysSincePlanting - minDays) / (maxDays - minDays)) * 100
      );
    }
    
    // Enhance with AI image analysis if available
    if (currentImageAnalysis?.harvestReadiness) {
      readinessScore = (readinessScore + currentImageAnalysis.harvestReadiness.readinessScore) / 2;
    }
    
    const estimatedDaysToHarvest = Math.max(0, minDays - daysSincePlanting);
    
    const indicators = HARVEST_INDICATORS[cropName]?.visualIndicators || [];
    
    return {
      readinessScore,
      estimatedDaysToHarvest,
      indicators
    };
  }
  
  static generateMonthlySchedule(
    greenhouseId: string,
    year: number,
    month: number,
    crops: CropCalendar[]
  ): CropSchedule {
    const plantingDates: ScheduledCrop[] = [];
    const harvestDates: ScheduledCrop[] = [];
    const tasks: CropTask[] = [];
    
    // Check each day of the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      
      // Check for planting windows
      Object.entries(CROP_PLANTING_WINDOWS).forEach(([cropName, window]) => {
        const optimalWindow = this.getOptimalPlantingDates(cropName, window.climateZone, year);
        if (!optimalWindow) return;
        
        // Check spring planting
        if (optimalWindow.springPlanting &&
            currentDate >= optimalWindow.springPlanting.start &&
            currentDate <= optimalWindow.springPlanting.end) {
          plantingDates.push({
            date: currentDate,
            cropName,
            bedId: 'suggested',
            quantity: 1,
            notes: 'Optimal spring planting window'
          });
        }
        
        // Check fall planting
        if (optimalWindow.fallPlanting &&
            currentDate >= optimalWindow.fallPlanting.start &&
            currentDate <= optimalWindow.fallPlanting.end) {
          plantingDates.push({
            date: currentDate,
            cropName,
            bedId: 'suggested',
            quantity: 1,
            notes: 'Optimal fall planting window'
          });
        }
      });
      
      // Check for expected harvests
      crops.forEach(crop => {
        if (crop.expectedHarvestDate.getMonth() === month &&
            crop.expectedHarvestDate.getDate() === day &&
            crop.expectedHarvestDate.getFullYear() === year) {
          harvestDates.push({
            date: currentDate,
            cropName: crop.cropName,
            bedId: crop.bedId,
            quantity: 1,
            notes: 'Expected harvest date'
          });
        }
        
        // Collect tasks for this day
        crop.tasks.forEach(task => {
          if (task.dueDate.getMonth() === month &&
              task.dueDate.getDate() === day &&
              task.dueDate.getFullYear() === year &&
              !task.completed) {
            tasks.push(task);
          }
        });
      });
    }
    
    return {
      year,
      month,
      plantingDates,
      harvestDates,
      tasks
    };
  }
  
  static getHarvestIndicators(cropName: string): HarvestIndicator | null {
    const indicators = HARVEST_INDICATORS[cropName];
    if (!indicators) return null;
    
    return {
      cropId: cropName,
      ...indicators
    };
  }
}