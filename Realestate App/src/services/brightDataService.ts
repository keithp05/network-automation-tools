import axios from 'axios';
import { Property } from '@/types/property';

/**
 * Bright Data Service
 * Access to pre-scraped real estate datasets from Zillow, Realtor, MLS
 *
 * Cost: $250/100K records (one-time) or subscription
 * Sign up: https://brightdata.com/products/datasets/real-estate
 *
 * MUCH BETTER than RapidAPI for bulk data!
 */

interface BrightDataConfig {
  apiToken: string;
  datasetId?: string;
}

interface BrightDataProperty {
  zpid?: string; // Zillow property ID
  property_id?: string; // Realtor property ID
  address: string;
  city: string;
  state: string;
  zip_code: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  lot_size: number;
  year_built: number;
  property_type: string;
  listing_date: string;
  status: string;
  images: string[];
  latitude: number;
  longitude: number;
  listing_url: string;
  description?: string;
  days_on_market?: number;
  price_per_sqft?: number;
  hoa_fee?: number;
  tax_amount?: number;
}

export class BrightDataService {
  private apiToken: string;
  private baseUrl = 'https://api.brightdata.com/datasets/v3';

  constructor(config?: BrightDataConfig) {
    this.apiToken = config?.apiToken || process.env.BRIGHT_DATA_API_TOKEN || '';
  }

  /**
   * Search properties using Bright Data's dataset
   * Much cheaper than per-request APIs for bulk searches!
   */
  async searchProperties(params: {
    city: string;
    state: string;
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
  }): Promise<Property[]> {
    try {
      // Option 1: Query the dataset API
      const response = await axios.post(
        `${this.baseUrl}/trigger`,
        {
          dataset_id: 'gd_lwh4f6i08oqu8aw1q5', // Zillow dataset ID
          filters: {
            city: params.city,
            state: params.state,
            ...(params.minPrice && { price_min: params.minPrice }),
            ...(params.maxPrice && { price_max: params.maxPrice }),
            ...(params.minBedrooms && { bedrooms_min: params.minBedrooms }),
          },
          format: 'json',
          limit: 1000, // Get up to 1000 results
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const snapshotId = response.data.snapshot_id;

      // Wait for results (or poll until ready)
      const results = await this.getSnapshotResults(snapshotId);

      return this.normalizeProperties(results);
    } catch (error) {
      console.error('Bright Data API error:', error);
      return [];
    }
  }

  /**
   * Download entire dataset (one-time purchase)
   * Best for getting massive amounts of data upfront
   */
  async downloadDataset(datasetId: string): Promise<BrightDataProperty[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/download/${datasetId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
          responseType: 'stream',
        }
      );

      // Process the CSV/JSON stream
      // You can save to file or load into database
      return this.processDatasetStream(response.data);
    } catch (error) {
      console.error('Dataset download error:', error);
      return [];
    }
  }

  /**
   * Use Bright Data's Web Scraper API
   * For real-time scraping with proxy rotation
   * Cost: $0.75/1K requests (cheaper than RapidAPI!)
   */
  async scrapeLiveData(url: string): Promise<any> {
    try {
      const response = await axios.post(
        'https://api.brightdata.com/dca/trigger',
        {
          zone: 'real_estate',
          url: url,
          format: 'json',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Scraper API error:', error);
      return null;
    }
  }

  /**
   * Bulk import dataset into your database
   * Do this once, then use your local copy!
   */
  async importDatasetToDatabase(datasetId: string, prisma: any): Promise<number> {
    console.log('Downloading Bright Data dataset...');

    const properties = await this.downloadDataset(datasetId);

    console.log(`Importing ${properties.length} properties to database...`);

    // Batch insert for performance
    const batchSize = 1000;
    let imported = 0;

    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);

      await prisma.property.createMany({
        data: batch.map(prop => this.toPropertyModel(prop)),
        skipDuplicates: true,
      });

      imported += batch.length;
      console.log(`Imported ${imported}/${properties.length} properties...`);
    }

    console.log(`✅ Import complete! ${imported} properties added.`);
    return imported;
  }

  /**
   * Get snapshot results
   */
  private async getSnapshotResults(snapshotId: string, maxRetries = 10): Promise<any[]> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/snapshot/${snapshotId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
            },
          }
        );

        if (response.data.status === 'ready') {
          return response.data.data || [];
        }

        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error fetching snapshot:', error);
      }
    }

    throw new Error('Snapshot timeout - results not ready');
  }

  /**
   * Process dataset stream
   */
  private async processDatasetStream(stream: any): Promise<BrightDataProperty[]> {
    // This is a simplified version
    // In production, you'd use a streaming JSON/CSV parser
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf-8');
        const properties = JSON.parse(data);
        resolve(properties);
      });
      stream.on('error', reject);
    });
  }

  /**
   * Normalize Bright Data properties to our format
   */
  private normalizeProperties(data: BrightDataProperty[]): Property[] {
    return data.map((prop) => ({
      id: `brightdata-${prop.zpid || prop.property_id || Date.now()}`,
      address: prop.address,
      city: prop.city,
      state: prop.state,
      zipCode: prop.zip_code,
      latitude: prop.latitude,
      longitude: prop.longitude,
      propertyType: this.mapPropertyType(prop.property_type),
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      squareFeet: prop.square_feet,
      lotSize: prop.lot_size,
      yearBuilt: prop.year_built,
      purchasePrice: prop.price,
      currentValue: prop.price,
      status: 'SEARCHING',
      source: 'bright-data',
      externalId: prop.zpid || prop.property_id,
      sourceUrl: prop.listing_url,
      images: prop.images || [],
      description: prop.description,
      metadata: {
        daysOnMarket: prop.days_on_market,
        pricePerSqft: prop.price_per_sqft,
        hoaFee: prop.hoa_fee,
        taxAmount: prop.tax_amount,
        dataSource: 'Bright Data',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  /**
   * Convert to Prisma model format
   */
  private toPropertyModel(prop: BrightDataProperty): any {
    return {
      address: prop.address,
      city: prop.city,
      state: prop.state,
      zipCode: prop.zip_code,
      latitude: prop.latitude,
      longitude: prop.longitude,
      propertyType: this.mapPropertyType(prop.property_type),
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      squareFeet: prop.square_feet,
      lotSize: prop.lot_size,
      yearBuilt: prop.year_built,
      purchasePrice: prop.price,
      currentValue: prop.price,
      status: 'SEARCHING',
    };
  }

  /**
   * Map property types
   */
  private mapPropertyType(type: string): any {
    const typeMap: Record<string, string> = {
      'single_family': 'SINGLE_FAMILY',
      'multi_family': 'MULTI_FAMILY',
      'condo': 'CONDO',
      'townhouse': 'TOWNHOUSE',
      'apartment': 'APARTMENT',
    };

    return typeMap[type?.toLowerCase()] || 'SINGLE_FAMILY';
  }

  /**
   * Get available datasets
   */
  async listDatasets(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/datasets`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error listing datasets:', error);
      return [];
    }
  }
}

export const brightDataService = new BrightDataService();
