import { Router } from 'express';
import { GreenhousePlanningController } from './greenhouse-planning.controller';

const router = Router();

// Get all greenhouse types
router.get('/greenhouse-types', GreenhousePlanningController.getGreenhouseTypes);

// Create a greenhouse plan
router.post('/create-plan', GreenhousePlanningController.createPlan);

// Get multiple crop plan with companions and compatibility
router.post('/multiple-crop-plan', GreenhousePlanningController.getMultipleCropPlan);

// Get grow bed recommendations
router.post('/recommend-grow-beds', GreenhousePlanningController.recommendGrowBeds);

// Calculate materials for a plan
router.post('/calculate-materials', GreenhousePlanningController.calculateMaterials);

// Export plan
router.post('/export', GreenhousePlanningController.exportPlan);

// Validate bed type for a plant
router.post('/validate-bed-type', GreenhousePlanningController.validateBedType);

export default router;