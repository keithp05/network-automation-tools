import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './modules/auth/auth.routes';
import { growthTrackingRoutes } from './modules/growth-tracking/growth-tracking.routes';
import { climateBatteryRoutes } from './modules/climate-battery/climate-battery.routes';
import { greenhousePlanningRoutes } from './modules/greenhouse-planning/greenhouse-planning.routes';
import { monitoringRoutes } from './routes/monitoring.routes';
import sensorRoutes from './routes/sensor.routes';
import plantIdentificationRoutes from './routes/plantIdentification.routes';
import { initializeDatabase } from './config/database';
import { initializeMQTT } from './services/mqtt.service';
import { initializeScheduler } from './services/scheduler.service';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (HTML interfaces)
app.use(express.static(path.join(__dirname, '../../')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Authentication routes (no auth middleware)
app.use('/api/auth', authRoutes);

// Protected API routes
app.use('/api/growth-tracking', growthTrackingRoutes);
app.use('/api/climate-battery', climateBatteryRoutes);
app.use('/api/greenhouse-planning', greenhousePlanningRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/sensors', authMiddleware, sensorRoutes);
app.use('/api/plant-identification', authMiddleware, plantIdentificationRoutes);

// Serve HTML interfaces
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../greenhouse-auth.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../greenhouse-auth.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../../interactive-greenhouse-designer.html'));
});

app.get('/planner', (req, res) => {
  res.sendFile(path.join(__dirname, '../../greenhouse-planner-multiple-crops.html'));
});

app.get('/calendar', (req, res) => {
  res.sendFile(path.join(__dirname, '../../greenhouse-calendar-monitoring.html'));
});

app.get('/climate-battery', (req, res) => {
  res.sendFile(path.join(__dirname, '../../climate-battery-test.html'));
});

app.use(errorHandler);

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join-greenhouse', (greenhouseId: string) => {
    socket.join(`greenhouse-${greenhouseId}`);
    logger.info(`Client ${socket.id} joined greenhouse ${greenhouseId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

export { io };

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initializeDatabase();
    await initializeMQTT();
    await initializeScheduler();
    
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();