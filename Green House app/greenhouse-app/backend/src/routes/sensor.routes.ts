import { Router } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();

const sensorSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('ph', 'dissolved_oxygen', 'water_temp', 'air_temp', 'humidity', 'co2').required(),
  model: Joi.string().required(),
  zoneId: Joi.string().uuid().required()
});

router.get('/', async (req, res, next) => {
  try {
    const { greenhouseId, zoneId, type } = req.query;
    
    let query = `
      SELECT s.*, z.name as zone_name, g.name as greenhouse_name
      FROM sensors s
      JOIN zones z ON s.zone_id = z.id
      JOIN greenhouses g ON z.greenhouse_id = g.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (greenhouseId) {
      params.push(greenhouseId);
      query += ` AND g.id = $${params.length}`;
    }
    
    if (zoneId) {
      params.push(zoneId);
      query += ` AND s.zone_id = $${params.length}`;
    }
    
    if (type) {
      params.push(type);
      query += ` AND s.type = $${params.length}`;
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const query = `
      SELECT s.*, z.name as zone_name, g.name as greenhouse_name
      FROM sensors s
      JOIN zones z ON s.zone_id = z.id
      JOIN greenhouses g ON z.greenhouse_id = g.id
      WHERE s.id = $1
    `;
    
    const result = await pool.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/readings', async (req, res, next) => {
  try {
    const { from, to, limit = 100 } = req.query;
    
    let query = `
      SELECT * FROM sensor_readings
      WHERE sensor_id = $1
    `;
    
    const params: any[] = [req.params.id];
    
    if (from) {
      params.push(from);
      query += ` AND timestamp >= $${params.length}`;
    }
    
    if (to) {
      params.push(to);
      query += ` AND timestamp <= $${params.length}`;
    }
    
    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit as string));
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { error, value } = sensorSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const query = `
      INSERT INTO sensors (name, type, model, zone_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      value.name,
      value.type,
      value.model,
      value.zoneId
    ]);
    
    logger.info(`Sensor created: ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, status, calibrationDate } = req.body;
    
    const query = `
      UPDATE sensors
      SET name = COALESCE($1, name),
          status = COALESCE($2, status),
          calibration_date = COALESCE($3, calibration_date)
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name,
      status,
      calibrationDate,
      req.params.id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM sensors WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;