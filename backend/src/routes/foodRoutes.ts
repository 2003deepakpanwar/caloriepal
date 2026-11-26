import { Router } from 'express';
import {
  createManual,
  listDaily,
  updateLog,
  deleteLogHandler,
  analyzeImage,
  getAiUsage,
} from '../controllers/foodController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { uploadImage } from '../middleware/uploadMiddleware.js';

export const foodRouter = Router();

foodRouter.use(requireAuth);
foodRouter.post('/manual', createManual);
foodRouter.get('/daily', listDaily);
foodRouter.get('/ai-usage', getAiUsage);
foodRouter.post('/analyze', uploadImage.single('image'), analyzeImage);
foodRouter.put('/:id', updateLog);
foodRouter.delete('/:id', deleteLogHandler);
