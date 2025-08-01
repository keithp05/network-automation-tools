import { Request, Response } from 'express';
import { GreenhousePlanningService } from './greenhouse-planning.service';
import { AIIntegrationService } from './ai-integration.service';
import { validateBedTypeForPlant, getPlantCategory } from './plant-categories';
import { GrowBedType } from './greenhouse-planning.types';

export class GreenhousePlanningController {
  
  static async getGreenhouseTypes(req: Request, res: Response) {
    try {
      const types = GreenhousePlanningService.getAllGreenhouseTypes();
      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      console.error('Error fetching greenhouse types:', error);
      res.status(500).json({
        error: 'Failed to fetch greenhouse types',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  static async createPlan(req: Request, res: Response) {
    try {
      const planData = req.body;
      
      // Validate required fields
      if (!planData.type || !planData.dimensions || !planData.location || !planData.selectedCropNames?.length) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['type', 'dimensions', 'location', 'selectedCropNames (array)']
        });
      }
      
      const plan = await GreenhousePlanningService.createGreenhousePlan(planData);
      
      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('Error creating greenhouse plan:', error);
      res.status(500).json({
        error: 'Failed to create greenhouse plan',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  static async getMultipleCropPlan(req: Request, res: Response) {
    try {
      const { selectedCropNames, greenhouseType, location, bedsPerCrop } = req.body;
      
      if (!selectedCropNames || !Array.isArray(selectedCropNames) || selectedCropNames.length === 0) {
        return res.status(400).json({
          error: 'selectedCropNames array is required'
        });
      }
      
      const mockPlan = {
        type: greenhouseType || 'hoop_house',
        location: location || { 
          latitude: 40.7128, 
          longitude: -74.0060, 
          climate_zone: '6b' 
        },
        dimensions: { length: 30, width: 20, height: 12 },
        growBeds: [],
        crops: { selectedCrops: [] },
        features: {
          hasClimateBattery: false,
          hasAutomation: false,
          hasAquaponics: false,
          hasHydroponics: false
        }
      };
      
      const cropPlan = await AIIntegrationService.getMultipleCropPlan(
        selectedCropNames, 
        mockPlan, 
        bedsPerCrop || {}
      );
      
      res.json({
        success: true,
        data: cropPlan
      });
    } catch (error) {
      console.error('Error creating crop plan:', error);
      res.status(500).json({
        error: 'Failed to create crop plan',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  static async recommendGrowBeds(req: Request, res: Response) {
    try {
      const { crop, greenhouseType, dimensions } = req.body;
      
      if (!crop) {
        return res.status(400).json({
          error: 'Crop is required'
        });
      }
      
      const recommendations = await AIIntegrationService.recommendGrowBeds(
        crop,
        greenhouseType || 'hoop_house'
      );
      
      let optimalDimensions;
      if (dimensions) {
        optimalDimensions = await AIIntegrationService.getOptimalBedDimensions(
          recommendations.recommended,
          dimensions,
          crop
        );
      }
      
      res.json({
        success: true,
        data: {
          ...recommendations,
          optimalDimensions,
          specifications: GreenhousePlanningService.getGrowBedSpecs(recommendations.recommended)
        }
      });
    } catch (error) {
      console.error('Error recommending grow beds:', error);
      res.status(500).json({
        error: 'Failed to recommend grow beds',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  static async calculateMaterials(req: Request, res: Response) {
    try {
      const plan = req.body;
      
      if (!plan.type || !plan.dimensions) {
        return res.status(400).json({
          error: 'Plan type and dimensions are required'
        });
      }
      
      const materials = GreenhousePlanningService.calculateMaterials(plan);
      
      res.json({
        success: true,
        data: materials
      });
    } catch (error) {
      console.error('Error calculating materials:', error);
      res.status(500).json({
        error: 'Failed to calculate materials',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  static async exportPlan(req: Request, res: Response) {
    try {
      const { plan, format = 'json' } = req.body;
      
      if (!plan) {
        return res.status(400).json({
          error: 'Plan data is required'
        });
      }
      
      const materials = GreenhousePlanningService.calculateMaterials(plan);
      
      if (format === 'csv') {
        let csv = 'Category,Item,Quantity,Unit,Unit Cost,Total Cost\n';
        
        // Add structural materials
        materials.structuralMaterials.forEach(item => {
          csv += `Structural,"${item.name}",${item.quantity},${item.unit},${item.unitCost},${item.totalCost}\n`;
        });
        
        // Add grow bed materials
        materials.growBedMaterials.forEach(item => {
          csv += `Grow Beds,"${item.name}",${item.quantity},${item.unit},${item.unitCost},${item.totalCost}\n`;
        });
        
        // Add climate battery materials if present
        if (materials.climateBatteryMaterials) {
          materials.climateBatteryMaterials.forEach(item => {
            csv += `Climate Battery,"${item.name}",${item.quantity},${item.unit || 'ea'},${item.unitCost},${item.totalCost}\n`;
          });
        }
        
        csv += `\nTotal Estimated Cost,,,,,${materials.totalEstimatedCost}\n`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=greenhouse-plan.csv');
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: {
            plan,
            materials
          }
        });
      }
    } catch (error) {
      console.error('Error exporting plan:', error);
      res.status(500).json({
        error: 'Failed to export plan',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  static async validateBedType(req: Request, res: Response) {
    try {
      const { plantName, bedType } = req.body;
      
      if (!plantName || !bedType) {
        return res.status(400).json({
          error: 'Both plantName and bedType are required'
        });
      }
      
      // Validate the bed type enum
      if (!Object.values(GrowBedType).includes(bedType as GrowBedType)) {
        return res.status(400).json({
          error: 'Invalid bed type',
          validTypes: Object.values(GrowBedType)
        });
      }
      
      const validation = validateBedTypeForPlant(plantName, bedType as GrowBedType);
      const category = getPlantCategory(plantName);
      
      res.json({
        success: true,
        data: {
          plantName,
          bedType,
          isValid: validation.isValid,
          reason: validation.reason,
          plantCategory: category ? {
            category: category.category,
            description: category.description,
            requiredBedTypes: category.requiredBedTypes,
            prohibitedBedTypes: category.prohibitedBedTypes
          } : null
        }
      });
    } catch (error) {
      console.error('Error validating bed type:', error);
      res.status(500).json({
        error: 'Failed to validate bed type',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}