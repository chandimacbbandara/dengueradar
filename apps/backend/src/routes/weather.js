import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { getDistrictWeather, getAllDistrictWeather } from '../controllers/weatherController.js';

const router = Router();

// All weather endpoints require a valid JWT (any role: citizen or moh_officer)
router.use(authenticateJWT);

/**
 * GET /api/weather/all
 * Latest weather data for all 25 Sri Lankan districts.
 */
router.get('/all', getAllDistrictWeather);

/**
 * GET /api/weather/district/:district
 * Latest weather data for a specific district (case-insensitive).
 * Example: GET /api/weather/district/Colombo
 */
router.get('/district/:district', getDistrictWeather);

export default router;
