import { Router } from 'express';
import {
  cronHandler,
  customHandler,
  generateHandler,
  getRecommendationHandler,
} from '../controllers/dinnerController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const dinnerRouter = Router();

// Public cron endpoint (secured by CRON_SECRET bearer token)
dinnerRouter.post('/cron', cronHandler);

dinnerRouter.use(requireAuth);
dinnerRouter.get('/recommendation', getRecommendationHandler);
dinnerRouter.post('/generate', generateHandler);
dinnerRouter.post('/custom', customHandler);
