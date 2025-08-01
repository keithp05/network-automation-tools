import {
  ClimateBatteryDesign,
  ClimateBatteryResults,
  PartItem,
  ADSTubing,
  GreenhouseGeometry
} from './climate-battery.types';

export class ClimateBatteryService {
  private static readonly ADS_TUBING_SPECS: ADSTubing[] = [
    { diameter: 12, ribSpacing: 1.96875 },
    { diameter: 15, ribSpacing: 2.625 },
    { diameter: 18, ribSpacing: 2.625 },
    { diameter: 24, ribSpacing: 3.375 },
    { diameter: 30, ribSpacing: 4.125 }
  ];

  private static readonly MASS_PER_CUBIC_FOOT = 120; // lbs/ft³ for soil
  private static readonly HEAT_CAPACITY = 1; // BTU/lb·°F
  private static readonly THERM_TO_BTU = 100000;

  static calculateGreenhouseVolume(geometry: GreenhouseGeometry): number {
    const boxVolume = geometry.boxSection.width * 
                     geometry.boxSection.length * 
                     geometry.boxSection.height;
    
    const roofVolume = (geometry.roofSection.width * 
                       geometry.roofSection.length * 
                       geometry.roofSection.peakHeight) / 2;
    
    return boxVolume + roofVolume;
  }

  static calculateAirChangesPerHour(totalCFM: number, airVolume: number): number {
    return (totalCFM * 60) / airVolume;
  }

  static calculateTubingLength(airVolume: number, tubingDiameter: number): number {
    // Based on the calculator's ballpark figure
    const baseLength = airVolume / 6.5;
    const diameterFactor = 4 / tubingDiameter;
    return baseLength * diameterFactor;
  }

  static calculateHeatStorage(volume: number): number {
    // Calculate mass of heat sink
    const mass = volume * this.MASS_PER_CUBIC_FOOT;
    // Heat stored with 1°F rise
    return mass * this.HEAT_CAPACITY;
  }

  static generatePartsList(design: ClimateBatteryDesign, results: ClimateBatteryResults): PartItem[] {
    const parts: PartItem[] = [];

    // ADS Tubing
    parts.push({
      category: 'Tubing',
      name: `ADS N-12 ${design.tubingDiameter}" Diameter Pipe`,
      description: `Perforated dual wall corrugated HDPE pipe with ${this.getADSRibSpacing(design.tubingDiameter)}" rib spacing`,
      quantity: Math.ceil(results.totalTubingLength),
      unitCost: design.costParameters.perFootTubingCost,
      totalCost: results.totalTubingCost,
      specifications: {
        diameter: design.tubingDiameter,
        type: 'Dual Wall Corrugated',
        material: 'HDPE',
        perforated: true
      }
    });

    // Risers
    parts.push({
      category: 'Risers',
      name: `${design.tubingDiameter}" to ${Math.max(15, design.tubingDiameter - 3)}" Reducer`,
      description: 'Vertical riser connection from tubing to manifold',
      quantity: design.numberOfRisers,
      unitCost: design.costParameters.riserCost,
      totalCost: design.numberOfRisers * design.costParameters.riserCost,
      specifications: {
        inletDiameter: design.tubingDiameter,
        outletDiameter: Math.max(15, design.tubingDiameter - 3),
        material: 'HDPE'
      }
    });

    // Manifolds
    parts.push({
      category: 'Manifolds',
      name: `${Math.max(15, design.tubingDiameter - 3)}" Manifold`,
      description: 'Air distribution manifold',
      quantity: design.numberOfManifolds,
      unitCost: design.costParameters.manifoldCost,
      totalCost: results.totalManifoldCost,
      specifications: {
        diameter: Math.max(15, design.tubingDiameter - 3),
        connections: design.numberOfRisers / design.numberOfManifolds
      }
    });

    // Fans
    parts.push({
      category: 'Fans',
      name: `${design.fanSpecs.cfmPerFan} CFM Inline Fan`,
      description: `${design.fanSpecs.voltage}V ${design.fanSpecs.wattage}W inline duct fan`,
      quantity: design.fanSpecs.numberOfFans,
      unitCost: design.costParameters.fanCost,
      totalCost: results.totalFanCost,
      specifications: {
        cfm: design.fanSpecs.cfmPerFan,
        voltage: design.fanSpecs.voltage,
        wattage: design.fanSpecs.wattage,
        amperage: design.fanSpecs.amperage
      }
    });

    // Control System
    parts.push({
      category: 'Controls',
      name: 'Climate Battery Control System',
      description: 'Temperature and humidity based fan control with timer',
      quantity: 1,
      unitCost: design.costParameters.controlsPackageCost,
      totalCost: design.costParameters.controlsPackageCost,
      specifications: {
        sensors: ['Temperature', 'Humidity'],
        outputs: design.fanSpecs.numberOfFans,
        programmable: true
      }
    });

    // Additional components
    parts.push({
      category: 'Fittings',
      name: `${design.tubingDiameter}" Couplers`,
      description: 'Pipe couplers for joining sections',
      quantity: Math.ceil(results.totalTubingLength / 20), // One every 20 feet
      unitCost: 15,
      totalCost: Math.ceil(results.totalTubingLength / 20) * 15
    });

    parts.push({
      category: 'Fittings',
      name: `${design.tubingDiameter}" End Caps`,
      description: 'Caps for pipe ends',
      quantity: design.numberOfRisers,
      unitCost: 10,
      totalCost: design.numberOfRisers * 10
    });

    parts.push({
      category: 'Installation',
      name: 'Geotextile Fabric',
      description: 'Filter fabric to wrap perforated pipes',
      quantity: Math.ceil(results.totalTubingLength / 300), // 300 ft rolls
      unitCost: 150,
      totalCost: Math.ceil(results.totalTubingLength / 300) * 150,
      specifications: {
        width: '6 feet',
        length: '300 feet per roll'
      }
    });

    parts.push({
      category: 'Installation',
      name: 'Pea Gravel',
      description: '3/8" to 5/8" drainage rock',
      quantity: Math.ceil(results.totalTubingLength * 0.5), // cubic yards
      unitCost: 35,
      totalCost: Math.ceil(results.totalTubingLength * 0.5) * 35,
      specifications: {
        size: '3/8" to 5/8"',
        unit: 'cubic yards'
      }
    });

    return parts;
  }

  private static getADSRibSpacing(diameter: number): number {
    const spec = this.ADS_TUBING_SPECS.find(s => s.diameter === diameter);
    return spec ? spec.ribSpacing : 0;
  }

  static calculate(design: ClimateBatteryDesign): ClimateBatteryResults {
    // Calculate air volume
    const totalAirVolume = this.calculateGreenhouseVolume(design.greenhouseGeometry);
    
    // Calculate total CFM
    const totalCFM = design.fanSpecs.numberOfFans * design.fanSpecs.cfmPerFan;
    
    // Calculate air changes per hour
    const airChangesPerHour = this.calculateAirChangesPerHour(totalCFM, totalAirVolume);
    
    // Calculate tubing length
    const totalTubingLength = design.totalTubingLength || 
                             this.calculateTubingLength(totalAirVolume, design.tubingDiameter);
    
    // Calculate costs
    const totalTubingCost = totalTubingLength * design.costParameters.perFootTubingCost;
    const totalManifoldCost = design.numberOfManifolds * design.costParameters.manifoldCost;
    const totalFanCost = design.fanSpecs.numberOfFans * design.costParameters.fanCost;
    const totalHardwareCost = totalTubingCost + totalManifoldCost + totalFanCost + 
                             design.costParameters.controlsPackageCost +
                             (design.numberOfRisers * design.costParameters.riserCost);
    
    // Calculate operating costs
    const dailyKWH = (design.fanSpecs.wattage * design.fanSpecs.dailyHours * 
                     design.fanSpecs.numberOfFans) / 1000;
    const annualFanOperatingCost = dailyKWH * 365 * design.costParameters.electricityRate;
    
    // Calculate heat storage and savings
    const heatStorageCapacity = this.calculateHeatStorage(totalAirVolume);
    const storedHeatValue = (heatStorageCapacity / this.THERM_TO_BTU) * 
                           design.costParameters.gasRate;
    const daysOfHeatGain = 180; // Typical value
    const yearlyGasValue = storedHeatValue * daysOfHeatGain;
    const yearlyNetSavings = yearlyGasValue - annualFanOperatingCost;
    const paybackYears = totalHardwareCost / yearlyNetSavings;
    
    // Generate parts list
    const results: ClimateBatteryResults = {
      totalAirVolume,
      totalCFM,
      airChangesPerHour,
      totalTubingCost,
      totalManifoldCost,
      totalFanCost,
      totalHardwareCost,
      annualFanOperatingCost,
      yearlyNetSavings,
      paybackYears,
      heatStorageCapacity,
      partsList: []
    };
    
    results.partsList = this.generatePartsList(design, results);
    
    return results;
  }
}