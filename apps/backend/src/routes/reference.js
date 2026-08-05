import { Router } from 'express';
import { getDistricts, getMohZones } from '../controllers/referenceController.js';

const router = Router();
router.get('/districts', getDistricts);
router.get('/moh-zones', getMohZones);
export default router;
