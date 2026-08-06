import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { getDashboard, updateProfile, getZoneTrend } from '../controllers/userController.js';

const router = Router();
router.use(authenticateJWT);
router.get('/dashboard', getDashboard);
router.get('/zone-trend', getZoneTrend);
router.patch('/profile', updateProfile);
export default router;
