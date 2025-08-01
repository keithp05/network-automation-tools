import { PlantingWindow, GrowthStage } from './crop-calendar.types';

export const CROP_PLANTING_WINDOWS: Record<string, PlantingWindow> = {
  'Tomatoes': {
    crop: 'Tomatoes',
    climateZone: '6b',
    springPlanting: {
      start: new Date(2024, 4, 15), // May 15
      end: new Date(2024, 5, 15)    // June 15
    },
    indoorStart: { weeksBeforeLastFrost: 6 },
    transplantTime: { weeksAfterIndoorStart: 6 },
    daysToMaturity: { min: 60, max: 85 },
    optimalTemp: { min: 65, max: 85 }
  },
  'Lettuce': {
    crop: 'Lettuce',
    climateZone: '6b',
    springPlanting: {
      start: new Date(2024, 3, 1),  // April 1
      end: new Date(2024, 4, 31)    // May 31
    },
    fallPlanting: {
      start: new Date(2024, 7, 1),  // August 1
      end: new Date(2024, 8, 15)    // September 15
    },
    daysToMaturity: { min: 30, max: 60 },
    optimalTemp: { min: 45, max: 75 }
  },
  'Peppers': {
    crop: 'Peppers',
    climateZone: '6b',
    springPlanting: {
      start: new Date(2024, 4, 20), // May 20
      end: new Date(2024, 5, 10)    // June 10
    },
    indoorStart: { weeksBeforeLastFrost: 8 },
    transplantTime: { weeksAfterIndoorStart: 8 },
    daysToMaturity: { min: 60, max: 90 },
    optimalTemp: { min: 70, max: 85 }
  },
  'Cucumbers': {
    crop: 'Cucumbers',
    climateZone: '6b',
    springPlanting: {
      start: new Date(2024, 4, 15), // May 15
      end: new Date(2024, 6, 1)     // July 1
    },
    daysToMaturity: { min: 50, max: 70 },
    optimalTemp: { min: 65, max: 85 }
  },
  'Basil': {
    crop: 'Basil',
    climateZone: '6b',
    springPlanting: {
      start: new Date(2024, 4, 10), // May 10
      end: new Date(2024, 6, 31)    // July 31
    },
    indoorStart: { weeksBeforeLastFrost: 4 },
    daysToMaturity: { min: 25, max: 35 },
    optimalTemp: { min: 65, max: 85 }
  },
  'Spinach': {
    crop: 'Spinach',
    climateZone: '6b',
    springPlanting: {
      start: new Date(2024, 2, 15), // March 15
      end: new Date(2024, 3, 30)    // April 30
    },
    fallPlanting: {
      start: new Date(2024, 7, 15), // August 15
      end: new Date(2024, 8, 30)    // September 30
    },
    daysToMaturity: { min: 30, max: 45 },
    optimalTemp: { min: 35, max: 70 }
  },
  'Kale': {
    crop: 'Kale',
    climateZone: '6b',
    springPlanting: {
      start: new Date(2024, 2, 20), // March 20
      end: new Date(2024, 4, 15)    // May 15
    },
    fallPlanting: {
      start: new Date(2024, 6, 15), // July 15
      end: new Date(2024, 8, 15)    // September 15
    },
    daysToMaturity: { min: 50, max: 65 },
    optimalTemp: { min: 40, max: 75 }
  },
  'Carrots': {
    crop: 'Carrots',
    climateZone: '6b',
    springPlanting: {
      start: new Date(2024, 3, 1),  // April 1
      end: new Date(2024, 5, 30)    // June 30
    },
    fallPlanting: {
      start: new Date(2024, 6, 1),  // July 1
      end: new Date(2024, 7, 31)    // August 31
    },
    daysToMaturity: { min: 60, max: 80 },
    optimalTemp: { min: 45, max: 75 }
  },
  'Beans': {
    crop: 'Beans',
    climateZone: '6b',
    springPlanting: {
      start: new Date(2024, 4, 10), // May 10
      end: new Date(2024, 6, 15)    // July 15
    },
    daysToMaturity: { min: 50, max: 65 },
    optimalTemp: { min: 65, max: 85 }
  },
  'Strawberries': {
    crop: 'Strawberries',
    climateZone: '6b',
    springPlanting: {
      start: new Date(2024, 3, 15), // April 15
      end: new Date(2024, 4, 31)    // May 31
    },
    daysToMaturity: { min: 60, max: 365 }, // Perennial
    optimalTemp: { min: 60, max: 80 }
  }
};

export const GROWTH_STAGES: Record<string, GrowthStage[]> = {
  'Tomatoes': [
    {
      name: 'Germination',
      startDay: 0,
      endDay: 14,
      description: 'Seeds germinate and first true leaves appear',
      requiredTasks: ['watering', 'temperature_control'],
      optimalConditions: {
        temperature: { min: 70, max: 80 },
        humidity: { min: 60, max: 70 },
        lightHours: 14
      }
    },
    {
      name: 'Seedling',
      startDay: 14,
      endDay: 35,
      description: 'Development of true leaves and root system',
      requiredTasks: ['watering', 'fertilizing', 'thinning'],
      optimalConditions: {
        temperature: { min: 65, max: 75 },
        humidity: { min: 50, max: 60 },
        lightHours: 16
      }
    },
    {
      name: 'Vegetative',
      startDay: 35,
      endDay: 55,
      description: 'Rapid growth of stems and leaves',
      requiredTasks: ['watering', 'fertilizing', 'pruning', 'staking'],
      optimalConditions: {
        temperature: { min: 65, max: 85 },
        humidity: { min: 40, max: 60 },
        lightHours: 14
      }
    },
    {
      name: 'Flowering',
      startDay: 55,
      endDay: 70,
      description: 'Flower development and pollination',
      requiredTasks: ['watering', 'fertilizing', 'pollination_assist'],
      optimalConditions: {
        temperature: { min: 65, max: 75 },
        humidity: { min: 40, max: 50 },
        lightHours: 12
      }
    },
    {
      name: 'Fruiting',
      startDay: 70,
      endDay: 85,
      description: 'Fruit development and ripening',
      requiredTasks: ['watering', 'fertilizing', 'pest_monitoring', 'harvest_check'],
      optimalConditions: {
        temperature: { min: 65, max: 85 },
        humidity: { min: 40, max: 60 },
        lightHours: 12
      }
    }
  ],
  'Lettuce': [
    {
      name: 'Germination',
      startDay: 0,
      endDay: 7,
      description: 'Seeds germinate',
      requiredTasks: ['watering', 'temperature_control'],
      optimalConditions: {
        temperature: { min: 60, max: 70 },
        humidity: { min: 50, max: 60 },
        lightHours: 12
      }
    },
    {
      name: 'Seedling',
      startDay: 7,
      endDay: 21,
      description: 'First true leaves develop',
      requiredTasks: ['watering', 'thinning'],
      optimalConditions: {
        temperature: { min: 55, max: 70 },
        humidity: { min: 50, max: 60 },
        lightHours: 14
      }
    },
    {
      name: 'Head Formation',
      startDay: 21,
      endDay: 45,
      description: 'Leaves form dense head',
      requiredTasks: ['watering', 'fertilizing', 'pest_monitoring'],
      optimalConditions: {
        temperature: { min: 45, max: 75 },
        humidity: { min: 50, max: 70 },
        lightHours: 12
      }
    }
  ]
};

export const HARVEST_INDICATORS = {
  'Tomatoes': {
    visualIndicators: [
      'Fruit has reached full size',
      'Color changes from green to red/pink/yellow depending on variety',
      'Slight softness when gently squeezed',
      'Easy separation from stem'
    ],
    sizeIndicators: {
      diameter: 2.5, // inches for standard varieties
    },
    colorIndicators: ['Deep red', 'Pink blush', 'Yellow/orange for specialty varieties'],
    textureIndicators: ['Firm but yields to gentle pressure', 'Glossy skin'],
    daysFromFlowering: 20
  },
  'Lettuce': {
    visualIndicators: [
      'Firm, dense head formation',
      'Leaves are full-sized',
      'Morning harvest for crispness'
    ],
    sizeIndicators: {
      diameter: 6, // inches for head lettuce
    },
    colorIndicators: ['Deep green', 'No yellowing'],
    textureIndicators: ['Crisp leaves', 'No wilting']
  },
  'Peppers': {
    visualIndicators: [
      'Fruit reaches variety-specific size',
      'Firm and glossy skin',
      'Color appropriate for variety'
    ],
    sizeIndicators: {
      length: 4, // inches for bell peppers
    },
    colorIndicators: ['Green for early harvest', 'Red/yellow/orange for full ripeness'],
    textureIndicators: ['Firm walls', 'Glossy skin', 'Thick flesh']
  },
  'Cucumbers': {
    visualIndicators: [
      'Uniform shape and color',
      'Firm texture',
      'No yellowing'
    ],
    sizeIndicators: {
      length: 6, // inches for slicing varieties
    },
    colorIndicators: ['Dark green', 'No yellow spots'],
    textureIndicators: ['Firm', 'Bumpy skin for pickling varieties']
  }
};