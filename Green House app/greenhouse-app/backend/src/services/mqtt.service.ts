import mqtt from 'mqtt';
import { logger } from '../utils/logger';
import { pool } from '../config/database';
import { io } from '../index';
import { SensorReading } from '../../../shared/types';

let mqttClient: mqtt.MqttClient;

export async function initializeMQTT() {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  
  mqttClient = mqtt.connect(brokerUrl, {
    clientId: `greenhouse-backend-${Date.now()}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  });

  mqttClient.on('connect', () => {
    logger.info('Connected to MQTT broker');
    
    mqttClient.subscribe('sensors/+/reading', { qos: 1 });
    mqttClient.subscribe('controllers/+/status', { qos: 1 });
    mqttClient.subscribe('alerts/+', { qos: 1 });
  });

  mqttClient.on('message', async (topic, payload) => {
    try {
      const message = JSON.parse(payload.toString());
      await handleMQTTMessage(topic, message);
    } catch (error) {
      logger.error('Error processing MQTT message:', error);
    }
  });

  mqttClient.on('error', (error) => {
    logger.error('MQTT client error:', error);
  });
}

async function handleMQTTMessage(topic: string, message: any) {
  const topicParts = topic.split('/');
  
  if (topicParts[0] === 'sensors' && topicParts[2] === 'reading') {
    await handleSensorReading(topicParts[1], message);
  } else if (topicParts[0] === 'controllers' && topicParts[2] === 'status') {
    await handleControllerStatus(topicParts[1], message);
  } else if (topicParts[0] === 'alerts') {
    await handleAlert(topicParts[1], message);
  }
}

async function handleSensorReading(sensorId: string, reading: any) {
  try {
    const query = `
      INSERT INTO sensor_readings (sensor_id, value, unit)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(query, [sensorId, reading.value, reading.unit]);
    const savedReading = result.rows[0];
    
    const sensorQuery = await pool.query(
      'SELECT z.greenhouse_id FROM sensors s JOIN zones z ON s.zone_id = z.id WHERE s.id = $1',
      [sensorId]
    );
    
    if (sensorQuery.rows.length > 0) {
      const greenhouseId = sensorQuery.rows[0].greenhouse_id;
      io.to(`greenhouse-${greenhouseId}`).emit('sensor-reading', {
        sensorId,
        ...savedReading
      });
    }
    
    await checkAlertConditions(sensorId, reading);
  } catch (error) {
    logger.error('Error handling sensor reading:', error);
  }
}

async function handleControllerStatus(controllerId: string, status: any) {
  try {
    const query = `
      UPDATE controllers 
      SET status = $1, settings = $2
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [status.status, status.settings, controllerId]);
    
    if (result.rows.length > 0) {
      const controller = result.rows[0];
      const zoneQuery = await pool.query(
        'SELECT greenhouse_id FROM zones WHERE id = $1',
        [controller.zone_id]
      );
      
      if (zoneQuery.rows.length > 0) {
        const greenhouseId = zoneQuery.rows[0].greenhouse_id;
        io.to(`greenhouse-${greenhouseId}`).emit('controller-update', controller);
      }
    }
  } catch (error) {
    logger.error('Error handling controller status:', error);
  }
}

async function handleAlert(greenhouseId: string, alert: any) {
  try {
    const query = `
      INSERT INTO alerts (greenhouse_id, type, category, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      greenhouseId,
      alert.type,
      alert.category,
      alert.message
    ]);
    
    const savedAlert = result.rows[0];
    io.to(`greenhouse-${greenhouseId}`).emit('alert', savedAlert);
  } catch (error) {
    logger.error('Error handling alert:', error);
  }
}

async function checkAlertConditions(sensorId: string, reading: any) {
  // Implementation for checking if sensor readings trigger alerts
  // This would check against thresholds and create alerts if needed
}

export function publishToMQTT(topic: string, message: any) {
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, JSON.stringify(message), { qos: 1 });
  }
}

export { mqttClient };