import { Pool } from 'pg';
import { logger } from '../utils/logger';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'greenhouse_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initializeDatabase() {
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connected successfully');
    await createTables();
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

async function createTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS greenhouses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      location JSONB,
      dimensions JSONB,
      type VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS zones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      greenhouse_id UUID REFERENCES greenhouses(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50),
      dimensions JSONB,
      position JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS sensors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50),
      model VARCHAR(255),
      calibration_date TIMESTAMP,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS sensor_readings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE,
      value DECIMAL(10, 3),
      unit VARCHAR(20),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS controllers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50),
      model VARCHAR(255),
      status VARCHAR(50) DEFAULT 'off',
      settings JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS plants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      scientific_name VARCHAR(255),
      type VARCHAR(50),
      growth_stage VARCHAR(50),
      planted_date DATE,
      expected_harvest_date DATE,
      position JSONB,
      companion_plants TEXT[],
      requirements JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS nutrient_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      greenhouse_id UUID REFERENCES greenhouses(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      active BOOLEAN DEFAULT false,
      schedule JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS climate_controls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      greenhouse_id UUID REFERENCES greenhouses(id) ON DELETE CASCADE,
      target_temperature DECIMAL(5, 2),
      target_humidity DECIMAL(5, 2),
      target_co2 INTEGER,
      fan_settings JSONB,
      geothermal_settings JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      greenhouse_id UUID REFERENCES greenhouses(id) ON DELETE CASCADE,
      type VARCHAR(50),
      category VARCHAR(50),
      message TEXT,
      acknowledged BOOLEAN DEFAULT false,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS plant_identifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      identification_id VARCHAR(255),
      is_plant BOOLEAN,
      is_plant_probability DECIMAL(3, 2),
      suggestions JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS plant_health_assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
      is_healthy BOOLEAN,
      health_probability DECIMAL(3, 2),
      diseases JSONB,
      assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS plant_care_info (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scientific_name VARCHAR(255) UNIQUE,
      common_name VARCHAR(255),
      family VARCHAR(255),
      growth_data JSONB,
      specifications JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_greenhouse ON alerts(greenhouse_id, acknowledged)`,
    `CREATE INDEX IF NOT EXISTS idx_plant_identifications ON plant_identifications(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_plant_health ON plant_health_assessments(plant_id, assessed_at DESC)`
  ];

  for (const query of queries) {
    try {
      await pool.query(query);
    } catch (error) {
      logger.error('Error creating table:', error);
      throw error;
    }
  }
  
  logger.info('Database tables created successfully');
}

export { pool };