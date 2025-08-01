import { Router } from 'express';
import { CameraIntegrationController } from './camera-integration.controller';

const router = Router();
const cameraController = new CameraIntegrationController();

// Camera management routes
router.post('/cameras', (req, res) => cameraController.addCamera(req, res));
router.get('/cameras', (req, res) => cameraController.getCameras(req, res));
router.get('/cameras/:cameraId', (req, res) => cameraController.getCamera(req, res));
router.put('/cameras/:cameraId', (req, res) => cameraController.updateCamera(req, res));
router.delete('/cameras/:cameraId', (req, res) => cameraController.deleteCamera(req, res));

// UniFi Protect specific routes
router.post('/unifi/discover', (req, res) => cameraController.discoverUniFiCameras(req, res));
router.post('/unifi/test-connection', (req, res) => cameraController.testUniFiConnection(req, res));

// Streaming routes
router.get('/cameras/:cameraId/stream', (req, res) => cameraController.getStreamUrl(req, res));
router.post('/cameras/:cameraId/stream/start', (req, res) => cameraController.startStream(req, res));
router.post('/cameras/:cameraId/stream/stop', (req, res) => cameraController.stopStream(req, res));

// Capture routes
router.post('/cameras/:cameraId/capture', (req, res) => cameraController.captureSnapshot(req, res));
router.post('/capture/bulk', (req, res) => cameraController.bulkCapture(req, res));

// Motion detection routes
router.post('/cameras/:cameraId/motion-detection', (req, res) => cameraController.setMotionDetection(req, res));
router.get('/cameras/:cameraId/motion-events', (req, res) => cameraController.getMotionEvents(req, res));

// Status and health routes
router.get('/cameras/:cameraId/status', (req, res) => cameraController.getCameraStatus(req, res));
router.post('/cameras/:cameraId/status/refresh', (req, res) => cameraController.refreshCameraStatus(req, res));

// Greenhouse integration routes
router.post('/cameras/:cameraId/integrate/greenhouse', (req, res) => 
  cameraController.integrateCameraWithGreenhouse(req, res));
router.get('/greenhouse/:greenhouseId/integrations', (req, res) => 
  cameraController.getGreenhouseIntegrations(req, res));

// AI Analysis integration routes
router.post('/cameras/:cameraId/capture-analyze', (req, res) => 
  cameraController.captureAndAnalyze(req, res));
router.get('/cameras/:cameraId/analysis/history', (req, res) => 
  cameraController.getAnalysisHistory(req, res));

export { router as cameraIntegrationRoutes };