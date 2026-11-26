import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { authRouter } from './routes/authRoutes.js';
import { profileRouter } from './routes/profileRoutes.js';
import { foodRouter } from './routes/foodRoutes.js';
import { calorieRouter } from './routes/calorieRoutes.js';
import { dinnerRouter } from './routes/dinnerRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { startDinnerScheduler } from './jobs/dinnerScheduler.js';

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'caloriepal-backend' });
});

app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/food', foodRouter);
app.use('/api/calories', calorieRouter);
app.use('/api/dinner', dinnerRouter);

app.use(errorHandler);

async function start(): Promise<void> {
  await connectDb();
  startDinnerScheduler();
  app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
