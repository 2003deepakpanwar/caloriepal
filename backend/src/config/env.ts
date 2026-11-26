import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  // AI provider — defaults to Groq (OpenAI-compatible, fast free tier).
  // Set AI_API_KEY from Groq (or OpenAI, Together, OpenRouter, etc.).
  // Old GEMINI_API_KEY is kept as a fallback for existing deploys.
  aiApiKey: process.env.AI_API_KEY ?? process.env.GROQ_API_KEY ?? process.env.GEMINI_API_KEY ?? '',
  aiBaseUrl: process.env.AI_BASE_URL ?? 'https://api.groq.com/openai/v1',
  aiVisionModel: process.env.AI_VISION_MODEL ?? 'qwen/qwen3.8-27b',
  aiTextModel: process.env.AI_TEXT_MODEL ?? 'openai/gpt-oss-20b',

  aiDailyLimit: Number(process.env.AI_DAILY_LIMIT ?? 20),

  usdaApiKey: process.env.USDA_API_KEY ?? '',

  cronSecret: process.env.CRON_SECRET ?? '',
  enableInProcessCron:
    (process.env.ENABLE_IN_PROCESS_CRON ?? 'true').toLowerCase() === 'true',
  dinnerCronSchedule: process.env.DINNER_CRON_SCHEDULE ?? '0 18 * * *',
  dinnerCronTimezone: process.env.DINNER_CRON_TIMEZONE ?? 'Asia/Kolkata',
};
