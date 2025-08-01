import { Router } from 'express';
import multer from 'multer';
import { plantIdentificationService } from '../services/plantIdentification.service';
import { logger } from '../utils/logger';
import { pool } from '../config/database';

const router = Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.post('/identify', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { includeHealth, zoneId } = req.body;

    const result = await plantIdentificationService.identifyPlant(
      req.file.buffer,
      {
        includeHealth: includeHealth === 'true',
        includeSimilarImages: true,
      }
    );

    if (result.is_plant && result.suggestions.length > 0) {
      const topSuggestion = result.suggestions[0];
      
      // If confidence is high enough and zone is specified, create plant record
      if (topSuggestion.probability > 0.7 && zoneId) {
        const plantQuery = `
          INSERT INTO plants (
            zone_id, 
            name, 
            scientific_name, 
            type, 
            growth_stage, 
            planted_date,
            requirements
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6)
          RETURNING *
        `;

        const plantType = determineP lantType(topSuggestion.plant_details.common_names);
        const requirements = await generatePlantRequirements(topSuggestion.plant_details.scientific_name);

        const plantResult = await pool.query(plantQuery, [
          zoneId,
          topSuggestion.plant_details.common_names[0] || topSuggestion.plant_name,
          topSuggestion.plant_details.scientific_name,
          plantType,
          'seedling',
          JSON.stringify(requirements)
        ]);

        return res.json({
          ...result,
          created_plant: plantResult.rows[0]
        });
      }
    }

    res.json(result);
  } catch (error) {
    logger.error('Plant identification error:', error);
    next(error);
  }
});

router.post('/health-check', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { plantId, plantName } = req.body;

    const result = await plantIdentificationService.identifyPlantHealth(
      req.file.buffer,
      plantName
    );

    // Store health assessment
    if (plantId) {
      const query = `
        INSERT INTO plant_health_assessments (
          plant_id,
          is_healthy,
          health_probability,
          diseases,
          assessed_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;

      await pool.query(query, [
        plantId,
        result.health_assessment.is_healthy,
        result.health_assessment.is_healthy_probability,
        JSON.stringify(result.health_assessment.diseases)
      ]);

      // Create alerts for diseases
      if (!result.health_assessment.is_healthy && result.health_assessment.diseases.length > 0) {
        for (const disease of result.health_assessment.diseases) {
          if (disease.probability > 0.5) {
            const alertQuery = `
              INSERT INTO alerts (greenhouse_id, type, category, message)
              SELECT z.greenhouse_id, 'warning', 'plant', $1
              FROM plants p
              JOIN zones z ON p.zone_id = z.id
              WHERE p.id = $2
            `;

            await pool.query(alertQuery, [
              `Plant disease detected: ${disease.name} (${Math.round(disease.probability * 100)}% confidence)`,
              plantId
            ]);
          }
        }
      }
    }

    res.json(result);
  } catch (error) {
    logger.error('Plant health check error:', error);
    next(error);
  }
});

router.post('/batch-identify', upload.array('images', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const { zoneId } = req.body;
    const results = [];

    for (const file of req.files as Express.Multer.File[]) {
      try {
        const result = await plantIdentificationService.identifyPlant(
          file.buffer,
          { includeHealth: false }
        );
        results.push({
          filename: file.originalname,
          ...result
        });
      } catch (error) {
        results.push({
          filename: file.originalname,
          error: 'Failed to identify plant'
        });
      }
    }

    res.json({ results });
  } catch (error) {
    logger.error('Batch identification error:', error);
    next(error);
  }
});

router.get('/plant-care/:scientificName', async (req, res, next) => {
  try {
    const careInfo = await plantIdentificationService.getPlantCareInfo(
      req.params.scientificName
    );

    if (!careInfo) {
      return res.status(404).json({ error: 'Plant care information not found' });
    }

    res.json(careInfo);
  } catch (error) {
    next(error);
  }
});

router.post('/analyze-conditions/:plantId', async (req, res, next) => {
  try {
    const { temperature, humidity, ph, light } = req.body;

    const analysis = await plantIdentificationService.analyzeGrowthConditions(
      req.params.plantId,
      { temperature, humidity, ph, light }
    );

    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

function determinePlantType(commonNames: string[]): string {
  const name = commonNames[0]?.toLowerCase() || '';
  
  if (name.includes('tomato') || name.includes('pepper') || name.includes('cucumber')) {
    return 'vegetable';
  } else if (name.includes('basil') || name.includes('mint') || name.includes('oregano')) {
    return 'herb';
  } else if (name.includes('strawberry') || name.includes('berry')) {
    return 'fruit';
  } else if (name.includes('flower') || name.includes('rose') || name.includes('orchid')) {
    return 'flower';
  } else if (name.includes('grass') || name.includes('fodder')) {
    return 'fodder';
  }
  
  return 'vegetable'; // default
}

async function generatePlantRequirements(scientificName: string): Promise<any> {
  // Default requirements - in production, fetch from plant database
  return {
    temperature: { min: 18, max: 28, optimal: 23 },
    humidity: { min: 50, max: 80, optimal: 65 },
    ph: { min: 5.5, max: 7.5, optimal: 6.5 },
    light: { intensity: 400, hoursPerDay: 14 },
    nutrients: { nitrogen: 150, phosphorus: 50, potassium: 200 }
  };
}

export default router;