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

  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',

  aiDailyLimit: Number(process.env.AI_DAILY_LIMIT ?? 10),

  usdaApiKey: process.env.USDA_API_KEY ?? '',

  cronSecret: process.env.CRON_SECRET ?? '',
  enableInProcessCron:
    (process.env.ENABLE_IN_PROCESS_CRON ?? 'true').toLowerCase() === 'true',
  dinnerCronSchedule: process.env.DINNER_CRON_SCHEDULE ?? '0 18 * * *',
  dinnerCronTimezone: process.env.DINNER_CRON_TIMEZONE ?? 'Asia/Kolkata',
};
