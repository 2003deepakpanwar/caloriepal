import { Router } from 'express';
import { summary } from '../controllers/calorieController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const calorieRouter = Router();

calorieRouter.use(requireAuth);
calorieRouter.get('/summary', summary);
