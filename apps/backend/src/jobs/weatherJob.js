import cron from 'node-cron';
import { fetchAllDistrictWeather } from '../services/weatherFetcher.js';

const CRON_SCHEDULE = '0 */4 * * *'; // Every 4 hours (00:00, 04:00, 08:00, …)

/**
 * Starts the weather background job.
 *
 * - Fires one immediate run on startup so the collection is populated
 *   before the first scheduled tick.
 * - Then runs on `CRON_SCHEDULE` (every 4 hours).
 *
 * Call this once after the DB connection is established.
 */
export function startWeatherJob() {
  // Immediate first run
  console.log('[WeatherJob] ⏱  Scheduling weather fetch job (every 4 hours).');
  fetchAllDistrictWeather().catch((err) =>
    console.error('[WeatherJob] Startup fetch failed:', err.message)
  );

  // Recurring cron
  cron.schedule(CRON_SCHEDULE, async () => {
    console.log(`[WeatherJob] ⏰ Cron triggered at ${new Date().toISOString()}`);
    try {
      await fetchAllDistrictWeather();
    } catch (err) {
      console.error('[WeatherJob] Unhandled error during cron run:', err.message);
    }
  });
}
