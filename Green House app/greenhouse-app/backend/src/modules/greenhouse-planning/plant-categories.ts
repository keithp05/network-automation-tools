import { GrowBedType } from './greenhouse-planning.types';

export interface PlantCategory {
  category: string;
  description: string;
  plants: string[];
  requiredBedTypes: GrowBedType[];
  prohibitedBedTypes: GrowBedType[];
}

export const PLANT_CATEGORIES: PlantCategory[] = [
  {
    category: 'root_vegetables',
    description: 'Plants that develop edible roots or tubers below ground',
    plants: [
      'carrots', 'carrot',
      'radishes', 'radish',
      'beets', 'beet',
      'turnips', 'turnip',
      'potatoes', 'potato',
      'sweet potatoes', 'sweet potato',
      'parsnips', 'parsnip',
      'onions', 'onion',
      'garlic',
      'ginger',
      'turmeric'
    ],
    requiredBedTypes: [GrowBedType.STANDING_SOIL, GrowBedType.WICKING],
    prohibitedBedTypes: [GrowBedType.NFT, GrowBedType.DWC, GrowBedType.FILL_AND_DRAIN, GrowBedType.MEDIA_BED]
  },
  {
    category: 'leafy_greens',
    description: 'Plants grown primarily for their leaves',
    plants: [
      'lettuce', 'romaine', 'iceberg',
      'spinach',
      'kale',
      'chard', 'swiss chard',
      'arugula', 'rocket',
      'bok choy', 'pak choi',
      'cabbage',
      'collards', 'collard greens',
      'mustard greens'
    ],
    requiredBedTypes: [],
    prohibitedBedTypes: []
  },
  {
    category: 'herbs',
    description: 'Culinary and medicinal herbs',
    plants: [
      'basil',
      'cilantro', 'coriander',
      'parsley',
      'oregano',
      'thyme',
      'rosemary',
      'sage',
      'mint',
      'dill',
      'chives'
    ],
    requiredBedTypes: [],
    prohibitedBedTypes: []
  },
  {
    category: 'fruiting_vegetables',
    description: 'Plants that produce fruit above ground',
    plants: [
      'tomatoes', 'tomato',
      'peppers', 'pepper', 'bell pepper', 'hot pepper',
      'cucumbers', 'cucumber',
      'eggplant', 'aubergine',
      'squash', 'zucchini',
      'pumpkins', 'pumpkin',
      'melons', 'melon', 'watermelon', 'cantaloupe'
    ],
    requiredBedTypes: [],
    prohibitedBedTypes: []
  },
  {
    category: 'trees_and_perennials',
    description: 'Trees, shrubs, and perennial plants',
    plants: [
      'apple tree', 'apple',
      'pear tree', 'pear',
      'peach tree', 'peach',
      'cherry tree', 'cherry',
      'citrus tree', 'lemon tree', 'orange tree', 'lime tree',
      'avocado tree', 'avocado',
      'fig tree', 'fig',
      'berry bushes', 'blueberry', 'raspberry', 'blackberry',
      'grape vine', 'grapes',
      'strawberries', 'strawberry'
    ],
    requiredBedTypes: [GrowBedType.STANDING_SOIL],
    prohibitedBedTypes: [GrowBedType.NFT, GrowBedType.DWC, GrowBedType.FILL_AND_DRAIN, GrowBedType.MEDIA_BED, GrowBedType.WICKING]
  }
];

export function getPlantCategory(plantName: string): PlantCategory | undefined {
  const normalizedName = plantName.toLowerCase().trim();
  return PLANT_CATEGORIES.find(category => 
    category.plants.some(plant => normalizedName.includes(plant))
  );
}

export function isRootedPlant(plantName: string): boolean {
  const category = getPlantCategory(plantName);
  return category?.category === 'root_vegetables' || category?.category === 'trees_and_perennials';
}

export function validateBedTypeForPlant(plantName: string, bedType: GrowBedType): {
  isValid: boolean;
  reason?: string;
} {
  const category = getPlantCategory(plantName);
  
  if (!category) {
    // If we don't recognize the plant, allow any bed type
    return { isValid: true };
  }
  
  // Check if the bed type is in the prohibited list
  if (category.prohibitedBedTypes.includes(bedType)) {
    return {
      isValid: false,
      reason: `${category.description} cannot be grown in ${bedType} systems. They require ${category.requiredBedTypes.join(' or ')}.`
    };
  }
  
  // Check if the bed type is in the required list (if any)
  if (category.requiredBedTypes.length > 0 && !category.requiredBedTypes.includes(bedType)) {
    return {
      isValid: false,
      reason: `${category.description} must be grown in ${category.requiredBedTypes.join(' or ')} beds.`
    };
  }
  
  return { isValid: true };
}