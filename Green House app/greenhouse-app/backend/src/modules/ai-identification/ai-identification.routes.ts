import { Router } from 'express';
import { AIIdentificationController } from './ai-identification.controller';
import { AuthMiddleware } from '../auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);

// Initialize AI providers (admin only)
router.post('/providers/initialize',
  AuthMiddleware.requireAdmin,
  AuthMiddleware.sanitizeInput,
  AIIdentificationController.initializeProviders
);

// Main image analysis endpoint
router.post('/analyze',
  AuthMiddleware.sanitizeInput,
  AIIdentificationController.analyzeImage
);

// Quick plant identification (faster, basic info)
router.post('/identify/quick',
  AuthMiddleware.sanitizeInput,
  AIIdentificationController.quickIdentify
);

// Comprehensive health assessment
router.post('/assess/health',
  AuthMiddleware.sanitizeInput,
  AIIdentificationController.assessHealth
);

// Pest and disease diagnosis
router.post('/diagnose/pest-disease',
  AuthMiddleware.sanitizeInput,
  AIIdentificationController.diagnosePestDisease
);

// Growth stage analysis
router.post('/analyze/growth',
  AuthMiddleware.sanitizeInput,
  AIIdentificationController.analyzeGrowth
);

// Image comparison for growth tracking
router.post('/compare',
  AuthMiddleware.sanitizeInput,
  AIIdentificationController.compareImages
);

// Get analysis history
router.get('/history',
  AIIdentificationController.getAnalysisHistory
);

// Get specific analysis result
router.get('/result/:id',
  AIIdentificationController.getAnalysisResult
);

export { router as aiIdentificationRoutes };