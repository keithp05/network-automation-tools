export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;

  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;

  purchasePrice?: number;
  currentValue?: number;
  monthlyRent?: number;
  estimatedRent?: number;

  status: PropertyStatus;
  source?: string;
  externalId?: string;
  sourceUrl?: string;

  images: string[];

  cmaData?: CMAData;
  crimeData?: CrimeData;
  demographics?: DemographicsData;

  createdAt: Date;
  updatedAt: Date;
}

export enum PropertyType {
  SINGLE_FAMILY = 'SINGLE_FAMILY',
  MULTI_FAMILY = 'MULTI_FAMILY',
  CONDO = 'CONDO',
  TOWNHOUSE = 'TOWNHOUSE',
  APARTMENT = 'APARTMENT',
  COMMERCIAL = 'COMMERCIAL',
}

export enum PropertyStatus {
  SEARCHING = 'SEARCHING',
  ANALYZING = 'ANALYZING',
  UNDER_CONTRACT = 'UNDER_CONTRACT',
  OWNED = 'OWNED',
  RENTED = 'RENTED',
  FOR_SALE = 'FOR_SALE',
}

export interface CMAData {
  estimatedValue: number;
  confidence: number;
  comparables: Comparable[];
  marketTrends: {
    priceChange3Month: number;
    priceChange6Month: number;
    priceChange12Month: number;
  };
  recommendations: string;
}

export interface Comparable {
  address: string;
  soldPrice: number;
  soldDate: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  distance: number;
}

export interface CrimeData {
  crimeScore: number; // 0-100, lower is better
  totalIncidents: number;
  incidents: CrimeIncident[];
  trends: {
    change3Month: number;
    change6Month: number;
    change12Month: number;
  };
}

export interface CrimeIncident {
  type: string;
  date: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface DemographicsData {
  population: number;
  medianIncome: number;
  medianAge: number;
  educationLevel: string;
  employmentRate: number;
  rentalDemand: 'low' | 'medium' | 'high';
  appreciationForecast: number;
}

export interface PropertySearchParams {
  city?: string;
  state?: string;
  zipCode?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  propertyType?: PropertyType;
  sources?: string[]; // ['zillow', 'realtor', 'facebook']
}
