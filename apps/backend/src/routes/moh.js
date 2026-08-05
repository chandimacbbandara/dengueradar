import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { authorizeRole } from '../middleware/authorizeRole.js';
import { getMohDashboard, getZoneReport, exportZoneReport } from '../controllers/mohController.js';

const router = Router();
router.use(authenticateJWT, authorizeRole(['moh_officer']));
router.get('/dashboard', getMohDashboard);
router.get('/reports/:mohZone', getZoneReport);
router.get('/reports/:mohZone/export', exportZoneReport);
export default router;
