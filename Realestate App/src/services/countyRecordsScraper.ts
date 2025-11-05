import axios from 'axios';
import * as cheerio from 'cheerio';
import { Property } from '@/types/property';

/**
 * County Records Scraper
 * Scrapes public county assessor records for off-market properties
 * 100% FREE - Public data
 */

interface CountyConfig {
  name: string;
  state: string;
  searchUrl: string;
  selectors: {
    propertyCard: string;
    address: string;
    owner: string;
    value: string;
    yearBuilt: string;
    sqft: string;
  };
}

// Pre-configured counties (easily expandable)
const COUNTY_CONFIGS: Record<string, CountyConfig> = {
  'travis-tx': {
    name: 'Travis',
    state: 'TX',
    searchUrl: 'https://www.traviscad.org/property-search/',
    selectors: {
      propertyCard: '.property-result',
      address: '.property-address',
      owner: '.owner-name',
      value: '.market-value',
      yearBuilt: '.year-built',
      sqft: '.square-feet'
    }
  },
  'maricopa-az': {
    name: 'Maricopa',
    state: 'AZ',
    searchUrl: 'https://mcassessor.maricopa.gov/',
    selectors: {
      propertyCard: '.parcel-info',
      address: '.address',
      owner: '.owner',
      value: '.assessed-value',
      yearBuilt: '.year',
      sqft: '.sqft'
    }
  },
  // Add more counties as needed
};

export class CountyRecordsScraper {

  /**
   * Search county records by location
   */
  async searchByLocation(city: string, state: string): Promise<Property[]> {
    const countyKey = this.findCountyKey(city, state);

    if (!countyKey) {
      console.log(`No county configuration found for ${city}, ${state}`);
      return [];
    }

    return this.scrapeCounty(countyKey, city);
  }

  /**
   * Scrape a specific county
   */
  private async scrapeCounty(countyKey: string, city: string): Promise<Property[]> {
    const config = COUNTY_CONFIGS[countyKey];

    try {
      console.log(`Scraping ${config.name} County, ${config.state}...`);

      // Use a generic search API approach
      const properties = await this.scrapeGenericCounty(config, city);

      return properties;
    } catch (error) {
      console.error(`Error scraping ${config.name} County:`, error);
      return [];
    }
  }

  /**
   * Generic county scraper
   */
  private async scrapeGenericCounty(config: CountyConfig, city: string): Promise<Property[]> {
    try {
      // Most counties have a public search interface
      const response = await axios.get(config.searchUrl, {
        params: {
          city: city,
          limit: 50
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RealEstateApp/1.0)',
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const properties: Property[] = [];

      $(config.selectors.propertyCard).each((_, element) => {
        try {
          const address = $(element).find(config.selectors.address).text().trim();
          const owner = $(element).find(config.selectors.owner).text().trim();
          const value = this.parsePrice($(element).find(config.selectors.value).text());
          const yearBuilt = parseInt($(element).find(config.selectors.yearBuilt).text().trim()) || undefined;
          const sqft = parseInt($(element).find(config.selectors.sqft).text().replace(/[^\d]/g, '')) || undefined;

          if (address) {
            properties.push({
              id: `county-${config.state.toLowerCase()}-${Date.now()}-${properties.length}`,
              address,
              city,
              state: config.state,
              zipCode: '',
              propertyType: 'SINGLE_FAMILY',
              currentValue: value,
              purchasePrice: value,
              yearBuilt,
              squareFeet: sqft,
              status: 'SEARCHING',
              source: `county-${config.name.toLowerCase()}`,
              sourceUrl: config.searchUrl,
              images: [],
              metadata: {
                owner,
                dataSource: 'County Assessor',
                isOffMarket: true,
                lastAssessed: new Date()
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Property);
          }
        } catch (err) {
          console.error('Error parsing property:', err);
        }
      });

      console.log(`Found ${properties.length} properties in ${config.name} County`);
      return properties;
    } catch (error) {
      console.error(`Error fetching county data:`, error);
      return [];
    }
  }

  /**
   * Alternative: Use county API if available
   */
  async searchViaCountyAPI(county: string, state: string, city: string): Promise<Property[]> {
    // Many counties now offer REST APIs
    // Example: Travis County, TX has a public API
    const apiUrls: Record<string, string> = {
      'travis-tx': 'https://data.texas.gov/resource/property-data.json',
      'maricopa-az': 'https://mcassessor.maricopa.gov/api/property',
    };

    const apiUrl = apiUrls[`${county.toLowerCase()}-${state.toLowerCase()}`];

    if (!apiUrl) {
      return [];
    }

    try {
      const response = await axios.get(apiUrl, {
        params: {
          city,
          $limit: 100,
        }
      });

      return this.normalizeCountyAPIData(response.data, state);
    } catch (error) {
      console.error('County API error:', error);
      return [];
    }
  }

  /**
   * Normalize county API data
   */
  private normalizeCountyAPIData(data: any[], state: string): Property[] {
    return data.map((record: any) => ({
      id: `county-api-${record.parcel_id || Date.now()}`,
      address: record.address || record.property_address,
      city: record.city,
      state,
      zipCode: record.zip || record.zipcode,
      propertyType: 'SINGLE_FAMILY',
      currentValue: parseFloat(record.market_value || record.assessed_value),
      purchasePrice: parseFloat(record.market_value || record.assessed_value),
      yearBuilt: parseInt(record.year_built),
      squareFeet: parseInt(record.square_feet || record.living_area),
      bedrooms: parseInt(record.bedrooms) || undefined,
      bathrooms: parseInt(record.bathrooms) || undefined,
      status: 'SEARCHING',
      source: 'county-api',
      sourceUrl: record.url,
      images: [],
      metadata: {
        owner: record.owner_name,
        parcelId: record.parcel_id,
        dataSource: 'County API',
        isOffMarket: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  /**
   * Find county configuration key
   */
  private findCountyKey(city: string, state: string): string | null {
    // Simple mapping - can be enhanced with a database
    const cityToCounty: Record<string, string> = {
      'austin': 'travis-tx',
      'phoenix': 'maricopa-az',
      'scottsdale': 'maricopa-az',
      'mesa': 'maricopa-az',
      // Add more as needed
    };

    return cityToCounty[city.toLowerCase()] || null;
  }

  /**
   * Parse price from text
   */
  private parsePrice(text: string): number {
    const cleaned = text.replace(/[$,]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Get list of supported counties
   */
  getSupportedCounties(): string[] {
    return Object.keys(COUNTY_CONFIGS).map(key => {
      const config = COUNTY_CONFIGS[key];
      return `${config.name} County, ${config.state}`;
    });
  }
}

export const countyRecordsScraper = new CountyRecordsScraper();
