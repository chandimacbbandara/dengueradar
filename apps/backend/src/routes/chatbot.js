import { Router } from 'express';
import { getChatbotPrediction, getChatbotZoneList } from '../controllers/chatbotController.js';

const router = Router();

// Public endpoints — no JWT required (chatbot is an external system)
router.get('/predict/:mohCode', getChatbotPrediction);
router.get('/zones', getChatbotZoneList);

export default router;
