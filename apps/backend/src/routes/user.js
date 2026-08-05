import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { getDashboard, updateProfile } from '../controllers/userController.js';

const router = Router();
router.use(authenticateJWT);
router.get('/dashboard', getDashboard);
router.patch('/profile', updateProfile);
export default router;
