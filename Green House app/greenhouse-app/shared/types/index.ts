export interface SensorReading {
  id: string;
  sensorId: string;
  type: 'ph' | 'dissolved_oxygen' | 'water_temp' | 'air_temp' | 'humidity' | 'co2';
  value: number;
  unit: string;
  timestamp: Date;
  greenhouseId: string;
  zoneId?: string;
}

export interface Greenhouse {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  type: 'hydroponic' | 'aquaponic' | 'hybrid';
  zones: Zone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Zone {
  id: string;
  greenhouseId: string;
  name: string;
  type: 'growbed' | 'fish_tank' | 'nursery' | 'fodder';
  dimensions: {
    length: number;
    width: number;
    height?: number;
  };
  position: {
    x: number;
    y: number;
  };
  sensors: Sensor[];
  controllers: Controller[];
}

export interface Sensor {
  id: string;
  name: string;
  type: SensorReading['type'];
  model: string;
  calibrationDate?: Date;
  status: 'active' | 'inactive' | 'error';
  zoneId: string;
}

export interface Controller {
  id: string;
  name: string;
  type: 'pump' | 'light' | 'fan' | 'heater' | 'cooler' | 'nutrient_doser' | 'ph_adjuster';
  model: string;
  status: 'on' | 'off' | 'error';
  settings: Record<string, any>;
  zoneId: string;
}

export interface Plant {
  id: string;
  name: string;
  scientificName: string;
  type: 'vegetable' | 'herb' | 'fruit' | 'flower' | 'fodder';
  growthStage: 'seed' | 'germination' | 'seedling' | 'vegetative' | 'flowering' | 'harvest';
  plantedDate: Date;
  expectedHarvestDate: Date;
  zoneId: string;
  position?: {
    row: number;
    column: number;
  };
  companionPlants?: string[];
  requirements: PlantRequirements;
}

export interface PlantRequirements {
  temperature: {
    min: number;
    max: number;
    optimal: number;
  };
  humidity: {
    min: number;
    max: number;
    optimal: number;
  };
  ph: {
    min: number;
    max: number;
    optimal: number;
  };
  light: {
    intensity: number;
    hoursPerDay: number;
  };
  nutrients: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
}

export interface NutrientSchedule {
  id: string;
  name: string;
  greenhouseId: string;
  active: boolean;
  schedule: {
    time: string;
    nutrients: {
      type: string;
      amount: number;
      unit: 'ml' | 'g';
    }[];
  }[];
}

export interface ClimateControl {
  id: string;
  greenhouseId: string;
  targetTemperature: number;
  targetHumidity: number;
  targetCO2?: number;
  fanSettings: {
    intakeFans: number[];
    exhaustFans: number[];
    circulationFans: number[];
  };
  geothermalSettings?: {
    enabled: boolean;
    targetDepth: number;
    flowRate: number;
  };
}

export interface Alert {
  id: string;
  greenhouseId: string;
  type: 'warning' | 'critical' | 'info';
  category: 'sensor' | 'controller' | 'plant' | 'system';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}