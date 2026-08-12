import { Router } from 'express';
import { getLiveStats, getNationalRisk, getNationalTrends, getTopZones } from '../controllers/publicController.js';

const router = Router();
router.get('/stats/live', getLiveStats);
router.get('/risk/national', getNationalRisk);
router.get('/risk/top-zones', getTopZones);
router.get('/trends/national', getNationalTrends);
export default router;
