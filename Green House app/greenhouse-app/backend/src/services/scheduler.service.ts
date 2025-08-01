import cron from 'node-cron';
import { logger } from '../utils/logger';
import { pool } from '../config/database';
import { publishToMQTT } from './mqtt.service';

export async function initializeScheduler() {
  logger.info('Initializing scheduler service');
  
  cron.schedule('*/5 * * * *', async () => {
    await checkNutrientSchedules();
  });
  
  cron.schedule('*/10 * * * *', async () => {
    await checkClimateControls();
  });
  
  cron.schedule('0 */6 * * *', async () => {
    await checkPlantGrowthStages();
  });
  
  cron.schedule('0 0 * * *', async () => {
    await generateDailyReports();
  });
}

async function checkNutrientSchedules() {
  try {
    const query = `
      SELECT ns.*, g.id as greenhouse_id
      FROM nutrient_schedules ns
      JOIN greenhouses g ON ns.greenhouse_id = g.id
      WHERE ns.active = true
    `;
    
    const result = await pool.query(query);
    const currentTime = new Date().toTimeString().slice(0, 5);
    
    for (const schedule of result.rows) {
      const scheduleData = schedule.schedule;
      
      for (const entry of scheduleData) {
        if (entry.time === currentTime) {
          for (const nutrient of entry.nutrients) {
            publishToMQTT(`controllers/${schedule.greenhouse_id}/nutrient-doser`, {
              action: 'dose',
              nutrient: nutrient.type,
              amount: nutrient.amount,
              unit: nutrient.unit
            });
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error checking nutrient schedules:', error);
  }
}

async function checkClimateControls() {
  try {
    const query = `
      SELECT cc.*, g.id as greenhouse_id
      FROM climate_controls cc
      JOIN greenhouses g ON cc.greenhouse_id = g.id
    `;
    
    const controls = await pool.query(query);
    
    for (const control of controls.rows) {
      const latestReadings = await getLatestSensorReadings(control.greenhouse_id);
      
      if (latestReadings.air_temp && control.target_temperature) {
        const tempDiff = latestReadings.air_temp - control.target_temperature;
        
        if (Math.abs(tempDiff) > 2) {
          const action = tempDiff > 0 ? 'cool' : 'heat';
          publishToMQTT(`controllers/${control.greenhouse_id}/climate`, {
            action,
            targetTemp: control.target_temperature,
            currentTemp: latestReadings.air_temp
          });
        }
      }
      
      if (latestReadings.humidity && control.target_humidity) {
        const humidityDiff = latestReadings.humidity - control.target_humidity;
        
        if (Math.abs(humidityDiff) > 5) {
          const action = humidityDiff > 0 ? 'dehumidify' : 'humidify';
          publishToMQTT(`controllers/${control.greenhouse_id}/climate`, {
            action,
            targetHumidity: control.target_humidity,
            currentHumidity: latestReadings.humidity
          });
        }
      }
    }
  } catch (error) {
    logger.error('Error checking climate controls:', error);
  }
}

async function getLatestSensorReadings(greenhouseId: string) {
  const query = `
    SELECT s.type, sr.value
    FROM sensor_readings sr
    JOIN sensors s ON sr.sensor_id = s.id
    JOIN zones z ON s.zone_id = z.id
    WHERE z.greenhouse_id = $1
    AND sr.timestamp > NOW() - INTERVAL '15 minutes'
    ORDER BY sr.timestamp DESC
  `;
  
  const result = await pool.query(query, [greenhouseId]);
  
  const readings: Record<string, number> = {};
  result.rows.forEach(row => {
    if (!readings[row.type]) {
      readings[row.type] = row.value;
    }
  });
  
  return readings;
}

async function checkPlantGrowthStages() {
  try {
    const query = `
      SELECT p.*, z.greenhouse_id
      FROM plants p
      JOIN zones z ON p.zone_id = z.id
      WHERE p.growth_stage != 'harvest'
    `;
    
    const plants = await pool.query(query);
    
    for (const plant of plants.rows) {
      const daysSincePlanting = Math.floor(
        (Date.now() - new Date(plant.planted_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      let newStage = plant.growth_stage;
      
      switch (plant.growth_stage) {
        case 'seed':
          if (daysSincePlanting >= 3) newStage = 'germination';
          break;
        case 'germination':
          if (daysSincePlanting >= 7) newStage = 'seedling';
          break;
        case 'seedling':
          if (daysSincePlanting >= 21) newStage = 'vegetative';
          break;
        case 'vegetative':
          if (daysSincePlanting >= 45) newStage = 'flowering';
          break;
        case 'flowering':
          if (daysSincePlanting >= 70) newStage = 'harvest';
          break;
      }
      
      if (newStage !== plant.growth_stage) {
        await pool.query(
          'UPDATE plants SET growth_stage = $1 WHERE id = $2',
          [newStage, plant.id]
        );
        
        publishToMQTT(`alerts/${plant.greenhouse_id}`, {
          type: 'info',
          category: 'plant',
          message: `${plant.name} has reached ${newStage} stage`
        });
      }
    }
  } catch (error) {
    logger.error('Error checking plant growth stages:', error);
  }
}

async function generateDailyReports() {
  logger.info('Generating daily reports');
  // Implementation for daily report generation
}