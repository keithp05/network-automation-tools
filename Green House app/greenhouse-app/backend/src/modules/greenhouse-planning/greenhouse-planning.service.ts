import { 
  GreenhousePlan, 
  GreenhouseType, 
  GrowBedConfig,
  GreenhouseTypeSpecs
} from './greenhouse-planning.types';
import { GREENHOUSE_TYPES, GROW_BED_SPECIFICATIONS } from './greenhouse-data';
import { AIIntegrationService } from './ai-integration.service';
import { BedLayoutService } from './bed-layout.service';
import { ClimateBatteryService } from '../climate-battery/climate-battery.service';

export class GreenhousePlanningService {
  
  static async createGreenhousePlan(planData: Partial<GreenhousePlan>): Promise<GreenhousePlan> {
    // Get greenhouse type specifications
    const greenhouseSpecs = this.getGreenhouseTypeSpecs(planData.type!);
    
    // Get multiple crop plan with AI recommendations
    const cropSelection = await AIIntegrationService.getMultipleCropPlan(
      planData.selectedCropNames || [],
      planData as GreenhousePlan,
      planData.bedsPerCrop || {}
    );
    
    // Calculate bed layout using standard 4x8 beds with walkways
    const { layout, bedConfigs } = BedLayoutService.calculateBedLayout(
      planData.dimensions!,
      cropSelection.selectedCrops
    );
    
    // Complete the plan
    const completePlan: GreenhousePlan = {
      type: planData.type!,
      dimensions: planData.dimensions!,
      location: planData.location!,
      growBeds: bedConfigs,
      crops: cropSelection,
      features: planData.features || {
        hasClimateBattery: false,
        hasAutomation: false,
        hasAquaponics: false,
        hasHydroponics: cropSelection.selectedCrops.some(crop => crop.recommendedBedType !== 'standing_soil')
      }
    };
    
    return completePlan;
  }
  
  static getGreenhouseTypeSpecs(type: GreenhouseType): GreenhouseTypeSpecs {
    const specs = GREENHOUSE_TYPES.find(g => g.type === type);
    if (!specs) {
      throw new Error(`Unknown greenhouse type: ${type}`);
    }
    return specs;
  }
  
  static getAllGreenhouseTypes(): GreenhouseTypeSpecs[] {
    return GREENHOUSE_TYPES;
  }
  
  static getGrowBedSpecs(type: string) {
    return GROW_BED_SPECIFICATIONS[type];
  }
  
  static calculateMaterials(plan: GreenhousePlan): {
    structuralMaterials: any[];
    growBedMaterials: any[];
    climateBatteryMaterials?: any[];
    totalEstimatedCost: number;
  } {
    const greenhouseSpecs = this.getGreenhouseTypeSpecs(plan.type);
    const area = plan.dimensions.length * plan.dimensions.width;
    
    // Calculate structural materials based on greenhouse type
    const structuralMaterials = this.calculateStructuralMaterials(plan, greenhouseSpecs);
    
    // Calculate grow bed materials
    const growBedMaterials = this.calculateGrowBedMaterials(plan.growBeds);
    
    // Calculate climate battery materials if applicable
    let climateBatteryMaterials;
    if (plan.features.hasClimateBattery) {
      const cbDesign = {
        greenhouseGeometry: {
          boxSection: {
            width: plan.dimensions.width,
            length: plan.dimensions.length,
            height: plan.dimensions.sidewallHeight || plan.dimensions.height
          },
          roofSection: {
            width: plan.dimensions.width,
            length: plan.dimensions.length,
            peakHeight: plan.dimensions.ridgeHeight || 8
          }
        },
        fanSpecs: {
          numberOfFans: 2,
          cfmPerFan: 2000,
          voltage: 120,
          amperage: 2,
          wattage: 240,
          dailyHours: 8
        },
        tubingDiameter: 4,
        numberOfRisers: 2,
        numberOfManifolds: 2,
        costParameters: {
          perFootTubingCost: 0.65,
          riserCost: 250,
          manifoldCost: 200,
          fanCost: 150,
          controlsPackageCost: 1000,
          electricityRate: 0.103,
          gasRate: 1.47
        },
        climateData: {
          heatingDegreeDays: 5000,
          coolingDegreeDays: 500,
          averageYearlyLow: 20,
          averageYearlyHigh: 85
        },
        insulationData: {
          glazedRoofArea: area,
          insulatedRoofArea: 0,
          glazedWallsArea: 0,
          insulatedWallsArea: 0,
          glazedRoofRValue: 1.43,
          insulatedRoofRValue: 15,
          glazedWallRValue: 1.63,
          insulatedWallRValue: 15,
          interiorDesignTemp: 40,
          glazingSolarHeatGainCoeff: 0.82
        }
      };
      
      const cbResults = ClimateBatteryService.calculate(cbDesign);
      climateBatteryMaterials = cbResults.partsList;
    }
    
    // Calculate total estimated cost
    const structuralCost = area * ((greenhouseSpecs.estimatedCostRange.min + greenhouseSpecs.estimatedCostRange.max) / 2);
    const growBedCost = growBedMaterials.reduce((sum, item) => sum + item.totalCost, 0);
    const climateBatteryCost = climateBatteryMaterials ? 
      climateBatteryMaterials.reduce((sum, item) => sum + item.totalCost, 0) : 0;
    
    const totalEstimatedCost = structuralCost + growBedCost + climateBatteryCost;
    
    return {
      structuralMaterials,
      growBedMaterials,
      climateBatteryMaterials,
      totalEstimatedCost
    };
  }
  
  private static calculateStructuralMaterials(plan: GreenhousePlan, specs: GreenhouseTypeSpecs): any[] {
    const materials = [];
    const perimeter = 2 * (plan.dimensions.length + plan.dimensions.width);
    
    switch (plan.type) {
      case GreenhouseType.HOOP_HOUSE:
        materials.push({
          name: 'PVC or Steel Hoops',
          quantity: Math.ceil(plan.dimensions.length / 4),
          unit: 'pieces',
          unitCost: 50,
          totalCost: Math.ceil(plan.dimensions.length / 4) * 50
        });
        materials.push({
          name: 'Polyethylene Film (6 mil)',
          quantity: (plan.dimensions.length + 10) * (plan.dimensions.width + 10),
          unit: 'sq ft',
          unitCost: 0.15,
          totalCost: (plan.dimensions.length + 10) * (plan.dimensions.width + 10) * 0.15
        });
        break;
        
      case GreenhouseType.TRADITIONAL_GABLE:
        materials.push({
          name: 'Foundation Materials',
          quantity: perimeter,
          unit: 'linear ft',
          unitCost: 15,
          totalCost: perimeter * 15
        });
        materials.push({
          name: 'Frame Lumber/Steel',
          quantity: perimeter * 3,
          unit: 'linear ft',
          unitCost: 8,
          totalCost: perimeter * 3 * 8
        });
        materials.push({
          name: 'Polycarbonate Panels',
          quantity: plan.dimensions.length * plan.dimensions.width * 1.3,
          unit: 'sq ft',
          unitCost: 2.5,
          totalCost: plan.dimensions.length * plan.dimensions.width * 1.3 * 2.5
        });
        break;
        
      // Add more greenhouse types as needed
    }
    
    // Common materials
    materials.push({
      name: 'End Wall Framing',
      quantity: 2,
      unit: 'sets',
      unitCost: 300,
      totalCost: 600
    });
    
    materials.push({
      name: 'Ventilation System',
      quantity: Math.ceil(plan.dimensions.length / 30),
      unit: 'units',
      unitCost: 200,
      totalCost: Math.ceil(plan.dimensions.length / 30) * 200
    });
    
    return materials;
  }
  
  private static calculateGrowBedMaterials(growBeds: GrowBedConfig[]): any[] {
    const materials = [];
    
    growBeds.forEach(bed => {
      const volume = bed.dimensions.length * bed.dimensions.width * bed.dimensions.depth;
      const specs = GROW_BED_SPECIFICATIONS[bed.type];
      
      // Bed frame materials
      materials.push({
        name: `${bed.type} Bed Frame Materials`,
        quantity: bed.count,
        unit: 'beds',
        unitCost: 200,
        totalCost: bed.count * 200
      });
      
      // Growing medium
      if (bed.type === 'standing_soil') {
        materials.push({
          name: 'Soil Mix',
          quantity: volume * bed.count / 27, // cubic yards
          unit: 'cubic yards',
          unitCost: 50,
          totalCost: (volume * bed.count / 27) * 50
        });
      } else if (bed.type === 'fill_and_drain' || bed.type === 'media_bed') {
        materials.push({
          name: 'Expanded Clay/Hydroton',
          quantity: volume * bed.count / 2, // 50 lb bags
          unit: 'bags',
          unitCost: 25,
          totalCost: (volume * bed.count / 2) * 25
        });
      }
      
      // System-specific components
      if (bed.type === 'fill_and_drain' || bed.type === 'nft' || bed.type === 'dwc') {
        materials.push({
          name: 'Pump and Timer System',
          quantity: bed.count,
          unit: 'systems',
          unitCost: 150,
          totalCost: bed.count * 150
        });
        materials.push({
          name: 'Plumbing and Fittings',
          quantity: bed.count,
          unit: 'sets',
          unitCost: 75,
          totalCost: bed.count * 75
        });
      }
    });
    
    return materials;
  }
}