import { Router } from 'express';
import { ClimateBatteryController } from './climate-battery.controller';

const router = Router();

// Calculate climate battery design
router.post('/calculate', ClimateBatteryController.calculateDesign);

// Get parts list
router.post('/parts-list', ClimateBatteryController.getPartsList);

// Export parts list
router.post('/export', ClimateBatteryController.exportPartsList);

export default router;