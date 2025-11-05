import axios from 'axios';
import * as cheerio from 'cheerio';
import { Property } from '@/types/property';

/**
 * Craigslist Scraper
 * Finds owner-financed and FSBO properties
 * 100% FREE - No API needed
 */

interface CraigslistListing {
  title: string;
  url: string;
  price: number;
  location: string;
  date: Date;
  hasOwnerFinance: boolean;
}

export class CraigslistScraper {

  /**
   * Search for owner-financed properties
   */
  async searchOwnerFinance(city: string, state: string): Promise<Property[]> {
    const queries = [
      'owner finance',
      'seller finance',
      'owner financing',
      'no bank financing',
      'owner carry',
    ];

    const allResults: Property[] = [];

    for (const query of queries) {
      const results = await this.searchCraigslist(city, state, query);
      allResults.push(...results);
    }

    return this.deduplicateListings(allResults);
  }

  /**
   * Search FSBO (For Sale By Owner)
   */
  async searchFSBO(city: string, state: string): Promise<Property[]> {
    return this.searchCraigslist(city, state, 'FSBO owner');
  }

  /**
   * Search Craigslist
   */
  private async searchCraigslist(
    city: string,
    state: string,
    query: string
  ): Promise<Property[]> {
    try {
      // Craigslist URL format: https://[city].craigslist.org/search/rea
      const craigslistCity = this.getCraigslistCity(city);
      const url = `https://${craigslistCity}.craigslist.org/search/rea`;

      console.log(`Searching Craigslist: ${url} for "${query}"`);

      const response = await axios.get(url, {
        params: {
          query,
          sort: 'date',
          availabilityMode: 0,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      return this.parseListings(response.data, city, state, craigslistCity);
    } catch (error) {
      console.error('Craigslist search error:', error);
      return [];
    }
  }

  /**
   * Parse Craigslist HTML response
   */
  private parseListings(html: string, city: string, state: string, craigslistCity: string): Property[] {
    const $ = cheerio.load(html);
    const properties: Property[] = [];

    $('.result-row').each((_, element) => {
      try {
        const $el = $(element);

        const title = $el.find('.result-title').text().trim();
        const url = $el.find('.result-title').attr('href') || '';
        const priceText = $el.find('.result-price').text().trim();
        const price = this.parsePrice(priceText);
        const location = $el.find('.result-hood').text().trim();
        const dateStr = $el.find('time').attr('datetime') || '';
        const date = dateStr ? new Date(dateStr) : new Date();

        // Check if listing mentions owner financing
        const hasOwnerFinance = this.detectOwnerFinancing(title);

        if (title && price > 0) {
          properties.push({
            id: `craigslist-${this.generateId(url)}`,
            address: location || city,
            city,
            state,
            zipCode: '',
            propertyType: this.detectPropertyType(title),
            purchasePrice: price,
            currentValue: price,
            status: 'SEARCHING',
            source: 'craigslist',
            externalId: this.extractPostId(url),
            sourceUrl: url.startsWith('http') ? url : `https://${craigslistCity}.craigslist.org${url}`,
            images: [],
            metadata: {
              title,
              isOwnerFinance: hasOwnerFinance,
              isFSBO: true,
              postedDate: date,
              dataSource: 'Craigslist'
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Property);
        }
      } catch (err) {
        console.error('Error parsing Craigslist listing:', err);
      }
    });

    console.log(`Found ${properties.length} Craigslist listings`);
    return properties;
  }

  /**
   * Get detailed listing info
   */
  async getListingDetails(url: string): Promise<any> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      // Extract additional details
      const description = $('#postingbody').text().trim();
      const images: string[] = [];

      $('#thumbs a').each((_, el) => {
        const imgUrl = $(el).attr('href');
        if (imgUrl) images.push(imgUrl);
      });

      // Parse bedrooms/bathrooms from description
      const bedroomMatch = description.match(/(\d+)\s*(?:br|bed|bedroom)/i);
      const bathroomMatch = description.match(/(\d+)\s*(?:ba|bath|bathroom)/i);
      const sqftMatch = description.match(/(\d+)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i);

      return {
        description,
        images,
        bedrooms: bedroomMatch ? parseInt(bedroomMatch[1]) : undefined,
        bathrooms: bathroomMatch ? parseInt(bathroomMatch[1]) : undefined,
        squareFeet: sqftMatch ? parseInt(sqftMatch[1]) : undefined,
      };
    } catch (error) {
      console.error('Error fetching listing details:', error);
      return null;
    }
  }

  /**
   * Detect if listing mentions owner financing
   */
  private detectOwnerFinancing(text: string): boolean {
    const keywords = [
      'owner financ',
      'seller financ',
      'owner carry',
      'seller carry',
      'no bank',
      'financing available',
      'flexible financing',
    ];

    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Detect property type from title
   */
  private detectPropertyType(title: string): any {
    const lower = title.toLowerCase();

    if (lower.includes('condo')) return 'CONDO';
    if (lower.includes('townhouse') || lower.includes('townhome')) return 'TOWNHOUSE';
    if (lower.includes('apartment') || lower.includes('duplex')) return 'MULTI_FAMILY';
    if (lower.includes('land') || lower.includes('lot')) return 'LAND';

    return 'SINGLE_FAMILY';
  }

  /**
   * Get Craigslist city subdomain
   */
  private getCraigslistCity(city: string): string {
    // Map common cities to their Craigslist subdomains
    const cityMap: Record<string, string> = {
      'austin': 'austin',
      'houston': 'houston',
      'dallas': 'dallas',
      'san antonio': 'sanantonio',
      'phoenix': 'phoenix',
      'los angeles': 'losangeles',
      'san diego': 'sandiego',
      'new york': 'newyork',
      'chicago': 'chicago',
      'miami': 'miami',
      'atlanta': 'atlanta',
      'seattle': 'seattle',
      'denver': 'denver',
      'portland': 'portland',
      'las vegas': 'lasvegas',
      // Add more as needed
    };

    return cityMap[city.toLowerCase()] || city.toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Parse price from text
   */
  private parsePrice(text: string): number {
    const cleaned = text.replace(/[$,]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Extract post ID from URL
   */
  private extractPostId(url: string): string {
    const match = url.match(/\/(\d+)\.html/);
    return match ? match[1] : '';
  }

  /**
   * Generate ID from URL
   */
  private generateId(url: string): string {
    return this.extractPostId(url) || Date.now().toString();
  }

  /**
   * Remove duplicate listings
   */
  private deduplicateListings(properties: Property[]): Property[] {
    const seen = new Map<string, Property>();

    properties.forEach(prop => {
      const key = `${prop.sourceUrl}`;
      if (!seen.has(key)) {
        seen.set(key, prop);
      }
    });

    return Array.from(seen.values());
  }

  /**
   * Search specific Craigslist section
   */
  async searchBySection(
    city: string,
    state: string,
    section: 'rea' | 'reo' | 'apa' = 'rea'
  ): Promise<Property[]> {
    // rea = real estate for sale
    // reo = real estate wanted
    // apa = apartments / housing for rent
    return this.searchCraigslist(city, state, '');
  }
}

export const craigslistScraper = new CraigslistScraper();
