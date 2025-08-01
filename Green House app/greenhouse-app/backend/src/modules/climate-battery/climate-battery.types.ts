export interface GreenhouseGeometry {
  boxSection: {
    width: number;
    length: number;
    height: number;
  };
  roofSection: {
    width: number;
    length: number;
    peakHeight: number;
  };
  totalVolume?: number;
}

export interface ADSTubing {
  diameter: number;
  ribSpacing: number;
}

export interface FanSpecification {
  numberOfFans: number;
  cfmPerFan: number;
  voltage: number;
  amperage: number;
  wattage: number;
  dailyHours: number;
}

export interface CostParameters {
  perFootTubingCost: number;
  riserCost: number;
  manifoldCost: number;
  fanCost: number;
  controlsPackageCost: number;
  electricityRate: number;
  gasRate: number;
}

export interface ClimateData {
  heatingDegreeDays: number;
  coolingDegreeDays: number;
  averageYearlyLow: number;
  averageYearlyHigh: number;
}

export interface InsulationData {
  glazedRoofArea: number;
  insulatedRoofArea: number;
  glazedWallsArea: number;
  insulatedWallsArea: number;
  glazedRoofRValue: number;
  insulatedRoofRValue: number;
  glazedWallRValue: number;
  insulatedWallRValue: number;
  interiorDesignTemp: number;
  glazingSolarHeatGainCoeff: number;
}

export interface ClimateBatteryDesign {
  greenhouseGeometry: GreenhouseGeometry;
  fanSpecs: FanSpecification;
  tubingDiameter: number;
  totalTubingLength: number;
  numberOfRisers: number;
  numberOfManifolds: number;
  costParameters: CostParameters;
  climateData: ClimateData;
  insulationData: InsulationData;
}

export interface ClimateBatteryResults {
  totalAirVolume: number;
  totalCFM: number;
  airChangesPerHour: number;
  totalTubingCost: number;
  totalManifoldCost: number;
  totalFanCost: number;
  totalHardwareCost: number;
  annualFanOperatingCost: number;
  yearlyNetSavings: number;
  paybackYears: number;
  heatStorageCapacity: number;
  partsList: PartItem[];
}

export interface PartItem {
  category: string;
  name: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  specifications?: Record<string, any>;
}