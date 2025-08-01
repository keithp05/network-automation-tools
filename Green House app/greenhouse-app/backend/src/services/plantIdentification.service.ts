import { logger } from '../utils/logger';
import { pool } from '../config/database';
import axios from 'axios';
import FormData from 'form-data';
import sharp from 'sharp';

interface PlantIdentificationResult {
  suggestions: Array<{
    id: string;
    plant_name: string;
    plant_details: {
      common_names: string[];
      scientific_name: string;
      structured_name: {
        genus: string;
        species: string;
      };
      wiki_description?: {
        value: string;
        citation: string;
      };
    };
    probability: number;
    confirmed: boolean;
    similar_images?: Array<{
      id: string;
      similarity: number;
      url: string;
    }>;
  }>;
  is_plant: boolean;
  is_plant_probability: number;
}

interface PlantHealthResult {
  health_assessment: {
    is_healthy: boolean;
    is_healthy_probability: number;
    diseases: Array<{
      name: string;
      disease_details: {
        description: string;
        treatment: {
          chemical: string[];
          biological: string[];
          prevention: string[];
        };
      };
      probability: number;
    }>;
  };
}

export class PlantIdentificationService {
  private apiKey: string;
  private apiUrl: string = 'https://api.plant.id/v3';

  constructor() {
    this.apiKey = process.env.PLANT_ID_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('Plant.id API key not configured');
    }
  }

  async identifyPlant(imageBuffer: Buffer, options: {
    includeHealth?: boolean;
    includeSimilarImages?: boolean;
    language?: string;
  } = {}): Promise<PlantIdentificationResult & Partial<PlantHealthResult>> {
    try {
      // Resize and optimize image
      const optimizedImage = await sharp(imageBuffer)
        .resize(1024, 1024, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const base64Image = optimizedImage.toString('base64');

      const requestBody = {
        images: [base64Image],
        modifiers: ['crops_fast', 'similar_images'],
        plant_details: ['common_names', 'url', 'wiki_description'],
        language: options.language || 'en',
      };

      if (options.includeHealth) {
        requestBody.modifiers.push('health_all');
      }

      const response = await axios.post(
        `${this.apiUrl}/identification`,
        requestBody,
        {
          headers: {
            'Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = response.data;

      // Store identification in database
      await this.storeIdentification(result);

      return result;
    } catch (error) {
      logger.error('Plant identification error:', error);
      throw new Error('Failed to identify plant');
    }
  }

  async identifyPlantHealth(imageBuffer: Buffer, knownPlantName?: string): Promise<PlantHealthResult> {
    try {
      const optimizedImage = await sharp(imageBuffer)
        .resize(1024, 1024, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const base64Image = optimizedImage.toString('base64');

      const requestBody = {
        images: [base64Image],
        modifiers: ['health_all'],
        disease_details: ['description', 'treatment'],
        language: 'en',
      };

      if (knownPlantName) {
        requestBody['plant_details'] = ['common_names'];
        requestBody['custom_id'] = knownPlantName;
      }

      const response = await axios.post(
        `${this.apiUrl}/health_assessment`,
        requestBody,
        {
          headers: {
            'Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Plant health assessment error:', error);
      throw new Error('Failed to assess plant health');
    }
  }

  async getPlantCareInfo(scientificName: string): Promise<any> {
    try {
      // Query internal database first
      const query = `
        SELECT * FROM plant_care_info
        WHERE scientific_name = $1
      `;
      
      const result = await pool.query(query, [scientificName]);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // If not in database, fetch from external API
      const response = await axios.get(
        `https://trefle.io/api/v1/species/search?q=${encodeURIComponent(scientificName)}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.TREFLE_API_KEY}`,
          },
        }
      );

      if (response.data.data && response.data.data.length > 0) {
        const plantData = response.data.data[0];
        const careInfo = {
          scientific_name: plantData.scientific_name,
          common_name: plantData.common_name,
          family: plantData.family,
          growth: {
            light: plantData.growth.light,
            atmospheric_humidity: plantData.growth.atmospheric_humidity,
            growth_months: plantData.growth.growth_months,
            bloom_months: plantData.growth.bloom_months,
            fruit_months: plantData.growth.fruit_months,
            minimum_temperature: plantData.growth.minimum_temperature,
            maximum_temperature: plantData.growth.maximum_temperature,
            soil_ph_minimum: plantData.growth.soil_ph_minimum,
            soil_ph_maximum: plantData.growth.soil_ph_maximum,
          },
          specifications: {
            ligneous_type: plantData.specifications.ligneous_type,
            growth_form: plantData.specifications.growth_form,
            growth_habit: plantData.specifications.growth_habit,
            growth_rate: plantData.specifications.growth_rate,
            average_height: plantData.specifications.average_height,
            maximum_height: plantData.specifications.maximum_height,
            toxicity: plantData.specifications.toxicity,
          },
        };

        // Store in database for future use
        await this.storePlantCareInfo(careInfo);
        
        return careInfo;
      }

      return null;
    } catch (error) {
      logger.error('Error fetching plant care info:', error);
      return null;
    }
  }

  private async storeIdentification(result: PlantIdentificationResult) {
    try {
      const query = `
        INSERT INTO plant_identifications (
          identification_id,
          is_plant,
          is_plant_probability,
          suggestions,
          created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;

      await pool.query(query, [
        result.id || `id-${Date.now()}`,
        result.is_plant,
        result.is_plant_probability,
        JSON.stringify(result.suggestions),
      ]);
    } catch (error) {
      logger.error('Error storing identification:', error);
    }
  }

  private async storePlantCareInfo(careInfo: any) {
    try {
      const query = `
        INSERT INTO plant_care_info (
          scientific_name,
          common_name,
          family,
          growth_data,
          specifications,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (scientific_name) DO UPDATE
        SET growth_data = $4, specifications = $5, updated_at = CURRENT_TIMESTAMP
      `;

      await pool.query(query, [
        careInfo.scientific_name,
        careInfo.common_name,
        careInfo.family,
        JSON.stringify(careInfo.growth),
        JSON.stringify(careInfo.specifications),
      ]);
    } catch (error) {
      logger.error('Error storing plant care info:', error);
    }
  }

  async analyzeGrowthConditions(plantId: string, currentConditions: {
    temperature: number;
    humidity: number;
    ph: number;
    light: number;
  }): Promise<{
    suitable: boolean;
    recommendations: string[];
    warnings: string[];
  }> {
    try {
      // Get plant requirements
      const plantQuery = await pool.query(
        'SELECT requirements FROM plants WHERE id = $1',
        [plantId]
      );

      if (plantQuery.rows.length === 0) {
        throw new Error('Plant not found');
      }

      const requirements = plantQuery.rows[0].requirements;
      const recommendations: string[] = [];
      const warnings: string[] = [];
      let suitable = true;

      // Check temperature
      if (currentConditions.temperature < requirements.temperature.min) {
        warnings.push(`Temperature too low. Increase to at least ${requirements.temperature.min}°C`);
        suitable = false;
      } else if (currentConditions.temperature > requirements.temperature.max) {
        warnings.push(`Temperature too high. Reduce to below ${requirements.temperature.max}°C`);
        suitable = false;
      }

      // Check humidity
      if (currentConditions.humidity < requirements.humidity.min) {
        recommendations.push(`Consider increasing humidity to ${requirements.humidity.optimal}%`);
      } else if (currentConditions.humidity > requirements.humidity.max) {
        recommendations.push(`Consider reducing humidity to ${requirements.humidity.optimal}%`);
      }

      // Check pH
      if (currentConditions.ph < requirements.ph.min || currentConditions.ph > requirements.ph.max) {
        warnings.push(`pH outside optimal range (${requirements.ph.min}-${requirements.ph.max})`);
        suitable = false;
      }

      // Check light
      if (currentConditions.light < requirements.light.intensity * 0.8) {
        recommendations.push('Increase light intensity or duration');
      }

      return { suitable, recommendations, warnings };
    } catch (error) {
      logger.error('Error analyzing growth conditions:', error);
      throw error;
    }
  }
}

export const plantIdentificationService = new PlantIdentificationService();