import { Router } from 'express';
import { GrowthTrackingController } from './growth-tracking.controller';
import { AuthMiddleware } from '../auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);

// Growth Measurement Routes
router.post('/measurements', 
  AuthMiddleware.sanitizeInput,
  GrowthTrackingController.recordMeasurement
);

router.post('/measurements/bulk',
  AuthMiddleware.sanitizeInput,
  GrowthTrackingController.bulkRecordMeasurements
);

router.get('/measurements/:id',
  GrowthTrackingController.getMeasurement
);

router.get('/measurements/bed/:bedId',
  GrowthTrackingController.getMeasurementsByBed
);

router.get('/measurements/crop/:cropId',
  GrowthTrackingController.getMeasurementsByCrop
);

router.delete('/measurements/:id',
  GrowthTrackingController.deleteMeasurement
);

// Timeline Routes
router.get('/timeline/:bedId/:cropId',
  GrowthTrackingController.getTimeline
);

router.put('/timeline/:bedId/:cropId',
  GrowthTrackingController.updateTimeline
);

// Milestone Routes
router.post('/milestones',
  AuthMiddleware.sanitizeInput,
  GrowthTrackingController.createMilestone
);

router.get('/milestones/:bedId/:cropId',
  GrowthTrackingController.getMilestones
);

router.put('/milestones/:id',
  AuthMiddleware.sanitizeInput,
  GrowthTrackingController.updateMilestone
);

// Alert Management Routes
router.get('/alerts',
  GrowthTrackingController.getAlerts
);

router.get('/alerts/summary',
  GrowthTrackingController.getAlertSummary
);

router.post('/alerts/bulk-action',
  AuthMiddleware.sanitizeInput,
  GrowthTrackingController.performBulkAlertAction
);

router.post('/alerts/clear-all',
  GrowthTrackingController.clearAllAlerts
);

// Growth Analysis Routes
router.get('/analysis/:bedId/:cropId',
  GrowthTrackingController.getGrowthAnalysis
);

router.get('/comparison/:bedId/:cropId',
  GrowthTrackingController.getGrowthComparison
);

// Photo Management Routes
router.post('/photos/upload',
  AuthMiddleware.sanitizeInput,
  GrowthTrackingController.uploadGrowthPhoto
);

// Dashboard Routes
router.get('/dashboard',
  GrowthTrackingController.getDashboardData
);

export { router as growthTrackingRoutes };