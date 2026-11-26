import { Router } from 'express';
import {
  createManual,
  listDaily,
  updateLog,
  deleteLogHandler,
} from '../controllers/foodController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const foodRouter = Router();

foodRouter.use(requireAuth);
foodRouter.post('/manual', createManual);
foodRouter.get('/daily', listDaily);
foodRouter.put('/:id', updateLog);
foodRouter.delete('/:id', deleteLogHandler);
