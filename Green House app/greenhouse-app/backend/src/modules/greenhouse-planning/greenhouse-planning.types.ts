export enum GreenhouseType {
  HOOP_HOUSE = 'hoop_house',
  GEODESIC_DOME = 'geodesic_dome',
  TRADITIONAL_GABLE = 'traditional_gable',
  QUONSET = 'quonset',
  GOTHIC_ARCH = 'gothic_arch',
  LEAN_TO = 'lean_to',
  PIT_GREENHOUSE = 'pit_greenhouse',
  A_FRAME = 'a_frame'
}

export enum GrowBedType {
  FILL_AND_DRAIN = 'fill_and_drain',
  STANDING_SOIL = 'standing_soil',
  WICKING = 'wicking',
  NFT = 'nft',
  DWC = 'dwc',
  MEDIA_BED = 'media_bed'
}

export interface GreenhouseDimensions {
  length: number;
  width: number;
  height: number;
  // Additional dimensions based on type
  domeRadius?: number;
  sidewallHeight?: number;
  ridgeHeight?: number;
}

export interface GrowBedConfig {
  type: GrowBedType;
  count: number;
  dimensions: {
    length: number; // Standard 8 feet
    width: number;  // Standard 4 feet
    depth: number;
  };
  cropAssignment?: string; // Which crop this bed is for
  layout?: BedLayout;
}

export interface BedLayout {
  totalBeds: number;
  bedsPerRow: number;
  rows: number;
  walkwayWidth: number; // Space around all sides
  totalFootprint: {
    length: number;
    width: number;
  };
}

export interface CropSelection {
  selectedCrops: SelectedCrop[];
  incompatibleCombinations?: string[];
}

export interface SelectedCrop {
  name: string;
  isPrimary: boolean;
  companionCrops: string[];
  incompatibleCrops?: string[];
  recommendedBedType: GrowBedType;
  bedsAllocated: number;
  growingConditions: {
    optimalTemp: { min: number; max: number };
    optimalHumidity: { min: number; max: number };
    lightRequirement: 'full_sun' | 'partial_shade' | 'shade';
    wateringFrequency: 'high' | 'medium' | 'low';
  };
}

export interface GreenhousePlan {
  type: GreenhouseType;
  dimensions: GreenhouseDimensions;
  location: {
    latitude: number;
    longitude: number;
    climate_zone: string;
  };
  growBeds: GrowBedConfig[];
  crops: CropSelection;
  features: {
    hasClimateBattery: boolean;
    hasAutomation: boolean;
    hasAquaponics: boolean;
    hasHydroponics: boolean;
  };
}

export interface GreenhouseTypeSpecs {
  type: GreenhouseType;
  name: string;
  description: string;
  advantages: string[];
  disadvantages: string[];
  bestFor: string[];
  typicalDimensions: {
    minWidth: number;
    maxWidth: number;
    minLength: number;
    maxLength: number;
    typicalHeight: number;
  };
  structuralRequirements: string[];
  estimatedCostRange: {
    min: number;
    max: number;
    unit: string;
  };
}

export interface CompanionPlantingGuide {
  crop: string;
  companions: {
    plant: string;
    benefit: string;
  }[];
  antagonists: {
    plant: string;
    reason: string;
  }[];
}

export interface GrowBedRecommendation {
  cropType: string;
  recommendedBedType: GrowBedType;
  reasoning: string;
  specifications: {
    minDepth: number;
    idealDepth: number;
    spacing: number;
    plantsPerSquareFoot: number;
  };
}