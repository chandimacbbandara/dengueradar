import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import {
  getAdminDashboard,
  getOfficers,
  approveOfficer,
  rejectOfficer,
  deleteOfficer,
  getCitizens,
} from '../controllers/adminController.js';

const router = Router();

/* All admin routes require a valid JWT + admin role */
const requireAdmin = [
  authenticateJWT,
  (req, res, next) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  },
];

router.get('/dashboard',             requireAdmin, getAdminDashboard);
router.get('/officers',              requireAdmin, getOfficers);
router.post('/officers/:id/approve', requireAdmin, approveOfficer);
router.post('/officers/:id/reject',  requireAdmin, rejectOfficer);
router.delete('/officers/:id',       requireAdmin, deleteOfficer);
router.get('/citizens',              requireAdmin, getCitizens);

export default router;
