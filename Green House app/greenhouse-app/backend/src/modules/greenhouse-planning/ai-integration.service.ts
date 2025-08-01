import axios from 'axios';
import { CropSelection, GreenhousePlan, GrowBedType, SelectedCrop } from './greenhouse-planning.types';
import { COMPANION_PLANTING_DATA, GROW_BED_SPECIFICATIONS } from './greenhouse-data';
import { getPlantCategory, validateBedTypeForPlant } from './plant-categories';

export class AIIntegrationService {
  private static readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  static async getMultipleCropPlan(
    selectedCropNames: string[], 
    greenhousePlan: GreenhousePlan,
    bedsPerCrop: { [cropName: string]: number } = {}
  ): Promise<CropSelection> {
    const selectedCrops: SelectedCrop[] = [];
    const incompatibleCombinations: string[] = [];

    // Process each selected crop
    for (let i = 0; i < selectedCropNames.length; i++) {
      const cropName = selectedCropNames[i];
      const isPrimary = i === 0; // First crop is considered primary
      const bedsAllocated = bedsPerCrop[cropName] || 1;

      // Get crop data from local database
      const localData = COMPANION_PLANTING_DATA[cropName];
      const companions = localData ? localData.companions.map(c => c.plant) : [];
      const incompatible = localData ? localData.antagonists.map(a => a.plant) : [];

      // Get recommended bed type
      const bedRecommendation = await this.recommendGrowBeds(cropName, greenhousePlan.type);
      
      // Get growing conditions
      const growingConditions = await this.getGrowingConditions(cropName);

      const selectedCrop: SelectedCrop = {
        name: cropName,
        isPrimary,
        companionCrops: companions,
        incompatibleCrops: incompatible,
        recommendedBedType: bedRecommendation.recommended,
        bedsAllocated,
        growingConditions
      };

      selectedCrops.push(selectedCrop);

      // Check for incompatibilities with other selected crops
      selectedCropNames.forEach((otherCrop, j) => {
        if (i !== j && incompatible.includes(otherCrop)) {
          incompatibleCombinations.push(`${cropName} and ${otherCrop} are not compatible`);
        }
      });
    }

    // Use OpenAI API for advanced recommendations if available
    if (this.OPENAI_API_KEY && selectedCropNames.length > 1) {
      try {
        const prompt = `I'm planning a ${greenhousePlan.type} greenhouse in climate zone ${greenhousePlan.location.climate_zone} with these crops: ${selectedCropNames.join(', ')}.
        
        Please analyze:
        1. Crop compatibility issues
        2. Suggested companion plants for each crop
        3. Optimal bed layout recommendations
        4. Any conflicts in growing conditions
        
        Format as JSON:
        {
          "compatibility_issues": ["issue1", "issue2"],
          "recommendations": [
            {
              "crop": "cropname",
              "companions": ["plant1", "plant2"],
              "bed_count_suggestion": number
            }
          ],
          "overall_advice": "general advice"
        }`;

        const response = await axios.post(
          this.OPENAI_API_URL,
          {
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are an expert in greenhouse horticulture and companion planting.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 800
          },
          {
            headers: {
              'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const aiResponse = JSON.parse(response.data.choices[0].message.content);
        
        // Enhance selected crops with AI recommendations
        aiResponse.recommendations.forEach((rec: any) => {
          const crop = selectedCrops.find(c => c.name.toLowerCase().includes(rec.crop.toLowerCase()));
          if (crop) {
            crop.companionCrops = [...new Set([...crop.companionCrops, ...rec.companions])];
          }
        });

        incompatibleCombinations.push(...aiResponse.compatibility_issues);
      } catch (error) {
        console.error('OpenAI API error:', error);
      }
    }

    return {
      selectedCrops,
      incompatibleCombinations
    };
  }

  static async recommendGrowBeds(crop: string, greenhouseType: string): Promise<{
    recommended: GrowBedType;
    alternatives: GrowBedType[];
    reasoning: string;
  }> {
    // Get plant category for validation
    const plantCategory = getPlantCategory(crop);
    
    // Check if crop matches known categories
    const leafyGreens = ['lettuce', 'spinach', 'kale', 'chard', 'arugula'];
    const herbs = ['basil', 'cilantro', 'parsley', 'oregano', 'thyme'];
    const rootVegetables = ['carrots', 'radishes', 'beets', 'turnips', 'potatoes'];
    const largeVining = ['tomatoes', 'cucumbers', 'peppers', 'eggplant'];
    const trees = ['apple', 'pear', 'peach', 'cherry', 'citrus', 'avocado', 'fig'];

    let recommended: GrowBedType;
    let alternatives: GrowBedType[] = [];
    let reasoning = '';

    // Handle plants with specific requirements first
    if (plantCategory?.requiredBedTypes.length > 0) {
      recommended = plantCategory.requiredBedTypes[0];
      alternatives = plantCategory.requiredBedTypes.slice(1);
      reasoning = `${plantCategory.description} require specific bed types for proper growth.`;
    } else if (leafyGreens.includes(crop.toLowerCase())) {
      recommended = GrowBedType.NFT;
      alternatives = [GrowBedType.DWC, GrowBedType.FILL_AND_DRAIN];
      reasoning = 'Leafy greens grow excellently in NFT systems with fast growth and efficient water use.';
    } else if (herbs.includes(crop.toLowerCase())) {
      recommended = GrowBedType.WICKING;
      alternatives = [GrowBedType.FILL_AND_DRAIN, GrowBedType.STANDING_SOIL];
      reasoning = 'Herbs prefer consistent moisture levels that wicking beds provide, promoting steady growth.';
    } else if (rootVegetables.includes(crop.toLowerCase())) {
      recommended = GrowBedType.STANDING_SOIL;
      alternatives = [GrowBedType.WICKING];
      reasoning = 'Root vegetables need deep, loose soil for proper development.';
    } else if (trees.some(tree => crop.toLowerCase().includes(tree))) {
      recommended = GrowBedType.STANDING_SOIL;
      alternatives = [];
      reasoning = 'Trees and perennials require deep soil beds for their extensive root systems.';
    } else if (largeVining.includes(crop.toLowerCase())) {
      recommended = GrowBedType.FILL_AND_DRAIN;
      alternatives = [GrowBedType.MEDIA_BED, GrowBedType.STANDING_SOIL];
      reasoning = 'Large plants benefit from the excellent oxygenation and nutrient delivery of ebb and flow systems.';
    } else {
      // Default recommendation
      recommended = GrowBedType.FILL_AND_DRAIN;
      alternatives = [GrowBedType.STANDING_SOIL, GrowBedType.WICKING];
      reasoning = 'Fill and drain systems are versatile and suitable for most crops.';
    }

    // Validate the recommendation
    const validation = validateBedTypeForPlant(crop, recommended);
    if (!validation.isValid && alternatives.length > 0) {
      // If recommended bed type is invalid, use the first valid alternative
      for (const alt of alternatives) {
        const altValidation = validateBedTypeForPlant(crop, alt);
        if (altValidation.isValid) {
          alternatives = [recommended, ...alternatives.filter(a => a !== alt)];
          recommended = alt;
          reasoning = validation.reason || reasoning;
          break;
        }
      }
    }

    return { recommended, alternatives, reasoning };
  }

  static async getOptimalBedDimensions(
    bedType: GrowBedType, 
    greenhouseDimensions: any,
    cropType: string
  ): Promise<{ length: number; width: number; depth: number; count: number }> {
    const specs = GROW_BED_SPECIFICATIONS[bedType];
    
    // Calculate optimal bed dimensions based on greenhouse size
    const walkwayWidth = 3; // feet
    const maxBedWidth = 4; // feet for easy reach
    
    // Calculate how many beds can fit
    const availableWidth = greenhouseDimensions.width - (2 * walkwayWidth);
    const bedCount = Math.floor(availableWidth / (maxBedWidth + walkwayWidth));
    
    // Bed length is greenhouse length minus space for equipment
    const bedLength = greenhouseDimensions.length - 6; // 6 feet for equipment/access
    
    return {
      length: bedLength,
      width: maxBedWidth,
      depth: specs.idealDepth.min,
      count: Math.max(1, bedCount)
    };
  }

  private static async getGrowingConditions(crop: string): Promise<any> {
    // Default growing conditions - in production, this would query a database or API
    const conditions = {
      'Tomatoes': {
        optimalTemp: { min: 65, max: 85 },
        optimalHumidity: { min: 60, max: 70 },
        lightRequirement: 'full_sun' as const,
        wateringFrequency: 'medium' as const
      },
      'Lettuce': {
        optimalTemp: { min: 60, max: 70 },
        optimalHumidity: { min: 50, max: 70 },
        lightRequirement: 'partial_shade' as const,
        wateringFrequency: 'high' as const
      },
      'Peppers': {
        optimalTemp: { min: 70, max: 85 },
        optimalHumidity: { min: 50, max: 60 },
        lightRequirement: 'full_sun' as const,
        wateringFrequency: 'medium' as const
      }
    };

    return conditions[crop] || {
      optimalTemp: { min: 60, max: 75 },
      optimalHumidity: { min: 50, max: 70 },
      lightRequirement: 'full_sun' as const,
      wateringFrequency: 'medium' as const
    };
  }
}