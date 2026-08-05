import { Router } from 'express';
import { getLiveStats, getNationalRisk, getNationalTrends } from '../controllers/publicController.js';

const router = Router();
router.get('/stats/live', getLiveStats);
router.get('/risk/national', getNationalRisk);
router.get('/trends/national', getNationalTrends);
export default router;
