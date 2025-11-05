import axios from 'axios';
import { CrimeData, CrimeIncident } from '@/types/property';

/**
 * Crime Data Service
 * Fetches crime statistics and police reports for property locations
 */

export class CrimeDataService {

  /**
   * Get crime data for a specific location
   */
  async getCrimeData(latitude: number, longitude: number, address: string): Promise<CrimeData> {
    try {
      // Combine data from multiple sources
      const [spotCrimeData, fbiData] = await Promise.allSettled([
        this.getSpotCrimeData(latitude, longitude),
        this.getFBICrimeData(address),
      ]);

      const incidents: CrimeIncident[] = [];

      if (spotCrimeData.status === 'fulfilled') {
        incidents.push(...spotCrimeData.value);
      }

      if (fbiData.status === 'fulfilled') {
        incidents.push(...fbiData.value);
      }

      const crimeScore = this.calculateCrimeScore(incidents);

      return {
        crimeScore,
        totalIncidents: incidents.length,
        incidents: incidents.slice(0, 50), // Limit to 50 most recent
        trends: this.analyzeTrends(incidents),
      };
    } catch (error) {
      console.error('Crime data fetch error:', error);
      throw new Error('Failed to fetch crime data');
    }
  }

  /**
   * Fetch data from SpotCrime API (FREE - No key required for basic use)
   */
  private async getSpotCrimeData(latitude: number, longitude: number): Promise<CrimeIncident[]> {
    try {
      // SpotCrime Public API - FREE for non-commercial use
      // Alternative: Use their RSS feed which is completely free
      const response = await axios.get('https://spotcrime.com/crimes.cfm', {
        params: {
          lat: latitude,
          lon: longitude,
          radius: 0.5, // 0.5 miles
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RealEstateApp/1.0)',
        },
        timeout: 10000,
      });

      // Parse RSS/HTML response
      return this.parseSpotCrimeResponse(response.data);
    } catch (error) {
      console.error('SpotCrime API error:', error);
      // Fallback: Try scraping public SpotCrime data
      return this.scrapeSpotCrime(latitude, longitude);
    }
  }

  /**
   * Parse SpotCrime HTML/RSS response
   */
  private parseSpotCrimeResponse(data: string): CrimeIncident[] {
    const incidents: CrimeIncident[] = [];

    // Parse the response (SpotCrime provides RSS feeds)
    const crimeMatches = data.matchAll(/<item>(.*?)<\/item>/gs);

    for (const match of crimeMatches) {
      const item = match[1];
      const typeMatch = item.match(/<title>(.*?)<\/title>/);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description>(.*?)<\/description>/);

      if (typeMatch) {
        incidents.push({
          type: typeMatch[1],
          date: dateMatch ? dateMatch[1] : new Date().toISOString(),
          description: descMatch ? descMatch[1] : typeMatch[1],
          severity: this.mapSeverity(typeMatch[1]),
        });
      }
    }

    return incidents;
  }

  /**
   * Scrape public SpotCrime data (backup method)
   */
  private async scrapeSpotCrime(latitude: number, longitude: number): Promise<CrimeIncident[]> {
    try {
      // SpotCrime's public map data
      const url = `https://spotcrime.com/map.html?lat=${latitude}&lon=${longitude}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RealEstateApp/1.0)',
        },
      });

      // Parse the map data from their public interface
      // This is simplified - in production, you'd parse the actual HTML/JSON
      return [];
    } catch (error) {
      console.error('SpotCrime scraping error:', error);
      return [];
    }
  }

  /**
   * Fetch FBI Crime Data
   */
  private async getFBICrimeData(address: string): Promise<CrimeIncident[]> {
    try {
      // FBI Crime Data API
      const response = await axios.get('https://api.usa.gov/crime/fbi/cde/', {
        params: {
          location: address,
          api_key: process.env.FBI_CRIME_DATA_API_KEY,
        },
      });

      return response.data.incidents?.map((incident: any) => ({
        type: incident.offense,
        date: incident.data_year,
        description: incident.offense_name,
        severity: this.mapSeverity(incident.offense),
      })) || [];
    } catch (error) {
      console.error('FBI Crime Data API error:', error);
      return [];
    }
  }

  /**
   * Alternative: CrimeReports.com API
   */
  private async getCrimeReportsData(latitude: number, longitude: number): Promise<CrimeIncident[]> {
    try {
      const response = await axios.get('https://www.crimereports.com/api/crimes', {
        params: {
          lat: latitude,
          lng: longitude,
          distance: 1, // 1 mile radius
          days: 90, // Last 90 days
        },
        headers: {
          'X-API-Key': process.env.CRIME_REPORTS_API_KEY,
        },
      });

      return response.data.map((crime: any) => ({
        type: crime.type,
        date: crime.timestamp,
        description: crime.description,
        severity: this.mapSeverity(crime.type),
      }));
    } catch (error) {
      console.error('CrimeReports API error:', error);
      return [];
    }
  }

  /**
   * Map crime types to severity levels
   */
  private mapSeverity(crimeType: string): 'low' | 'medium' | 'high' {
    const type = crimeType.toLowerCase();

    const highSeverity = ['homicide', 'murder', 'assault', 'robbery', 'rape', 'shooting', 'arson'];
    const mediumSeverity = ['burglary', 'theft', 'vehicle theft', 'breaking and entering', 'vandalism'];

    if (highSeverity.some(s => type.includes(s))) return 'high';
    if (mediumSeverity.some(s => type.includes(s))) return 'medium';
    return 'low';
  }

  /**
   * Calculate overall crime score (0-100, lower is better)
   */
  private calculateCrimeScore(incidents: CrimeIncident[]): number {
    if (incidents.length === 0) return 10; // Best score if no data

    const weights = {
      high: 10,
      medium: 5,
      low: 1,
    };

    const totalWeight = incidents.reduce((sum, incident) => {
      return sum + weights[incident.severity];
    }, 0);

    // Normalize to 0-100 scale (arbitrary scaling)
    const score = Math.min(100, totalWeight / 2);

    return Math.round(score);
  }

  /**
   * Analyze crime trends over time
   */
  private analyzeTrends(incidents: CrimeIncident[]): {
    change3Month: number;
    change6Month: number;
    change12Month: number;
  } {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const recent3 = incidents.filter(i => new Date(i.date) > threeMonthsAgo).length;
    const recent6 = incidents.filter(i => new Date(i.date) > sixMonthsAgo).length;
    const recent12 = incidents.filter(i => new Date(i.date) > twelveMonthsAgo).length;

    return {
      change3Month: this.calculateChange(recent3, incidents.length),
      change6Month: this.calculateChange(recent6, incidents.length),
      change12Month: this.calculateChange(recent12, incidents.length),
    };
  }

  /**
   * Calculate percentage change
   */
  private calculateChange(recent: number, total: number): number {
    if (total === 0) return 0;
    return ((recent / total) - 0.5) * 200; // -100 to +100
  }

  /**
   * Get safety grade based on crime score
   */
  getSafetyGrade(crimeScore: number): string {
    if (crimeScore < 20) return 'A+ (Excellent)';
    if (crimeScore < 35) return 'A (Very Good)';
    if (crimeScore < 50) return 'B (Good)';
    if (crimeScore < 65) return 'C (Average)';
    if (crimeScore < 80) return 'D (Below Average)';
    return 'F (Poor)';
  }
}

export const crimeDataService = new CrimeDataService();
