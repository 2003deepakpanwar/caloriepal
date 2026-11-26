import cron from 'node-cron';
import { env } from '../config/env.js';
import { generateForAllActiveUsers } from '../services/dinnerService.js';

export function startDinnerScheduler(): void {
  if (!env.enableInProcessCron) {
    console.log('[cron] in-process scheduler disabled (ENABLE_IN_PROCESS_CRON != true)');
    return;
  }

  const schedule = env.dinnerCronSchedule; // e.g. '0 18 * * *'
  const timezone = env.dinnerCronTimezone; // e.g. 'Asia/Kolkata'

  if (!cron.validate(schedule)) {
    console.error(`[cron] invalid schedule "${schedule}" — scheduler not started`);
    return;
  }

  cron.schedule(
    schedule,
    async () => {
      const startedAt = new Date().toISOString();
      try {
        const { generated } = await generateForAllActiveUsers();
        console.log(`[cron ${startedAt}] dinner recommendations generated for ${generated} user(s)`);
      } catch (err) {
        console.error(`[cron ${startedAt}] failed`, err);
      }
    },
    { timezone },
  );

  console.log(`[cron] dinner scheduler armed for "${schedule}" ${timezone}`);
}
