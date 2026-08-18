import axios from 'axios';
import LiveWeather from '../models/LiveWeather.js';
import { SRI_LANKA_DISTRICTS } from '../data/sriLankaDistricts.js';

const OW_BASE = 'https://api.openweathermap.org/data/2.5/weather';
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches the last 28 days of daily weather from Open-Meteo (free, no API key).
 * Returns { rain_1w, rain_2w, rain_4w, temp_avg_4w, humidity_4w }.
 */
async function fetchDailyAggregates(lat, lon, retries = 3) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 28);

  const fmt = (d) => d.toISOString().split('T')[0];

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.get(OPEN_METEO_BASE, {
        params: {
          latitude: lat,
          longitude: lon,
          daily: 'precipitation_sum,temperature_2m_mean,relative_humidity_2m_mean',
          start_date: fmt(start),
          end_date: fmt(end),
          timezone: 'Asia/Colombo',
        },
        timeout: 15_000,
      });

      const daily = data.daily || {};
      const precip   = daily.precipitation_sum || [];
      const temps    = daily.temperature_2m_mean || [];
      const humidity = daily.relative_humidity_2m_mean || [];

      // Last 7 / 14 / 28 days of rainfall
      const rain_1w = precip.slice(-7).reduce((s, v) => s + (v ?? 0), 0);
      const rain_2w = precip.slice(-14).reduce((s, v) => s + (v ?? 0), 0);
      const rain_4w = precip.reduce((s, v) => s + (v ?? 0), 0);

      // 28-day average temperature and humidity
      const validTemps = temps.filter(v => v !== null && v !== undefined);
      const validHumid = humidity.filter(v => v !== null && v !== undefined);
      const temp_avg_4w = validTemps.length > 0 ? validTemps.reduce((s, v) => s + v, 0) / validTemps.length : null;
      const humidity_4w = validHumid.length > 0 ? validHumid.reduce((s, v) => s + v, 0) / validHumid.length : null;

      return { rain_1w, rain_2w, rain_4w, temp_avg_4w, humidity_4w };
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(1000 * attempt); // exponential backoff 1s, 2s
    }
  }
}

/**
 * Maps a raw OpenWeather API response to our LiveWeather schema fields.
 */
function mapWeatherData(district, data) {
  const rain = data.rain ?? {};
  const rainfall =
    rain['1h'] !== undefined ? rain['1h'] :
    rain['3h'] !== undefined ? rain['3h'] :
    0;

  return {
    district,
    temperature_mean:     data.main?.temp          ?? null,
    temperature_max:      data.main?.temp_max       ?? null,
    temperature_min:      data.main?.temp_min       ?? null,
    apparent_temperature: data.main?.feels_like     ?? null,
    humidity:             data.main?.humidity       ?? null,
    rainfall,
    wind_speed:           data.wind?.speed          ?? null,
    wind_direction:       data.wind?.deg            ?? null,
    weather_code:         data.weather?.[0]?.id     ?? null,
    fetched_at:           new Date(),
  };
}

/**
 * Fetches current weather for all 25 Sri Lankan districts and upserts
 * results into the live_weather MongoDB collection.
 *
 * Also fetches 28-day historical daily data from Open-Meteo to compute
 * proper weekly/multi-week rainfall totals and temperature/humidity averages.
 */
export async function fetchAllDistrictWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error('[WeatherFetcher] ❌ OPENWEATHER_API_KEY is not set. Skipping run.');
    return;
  }

  console.log(`[WeatherFetcher] 🚀 Starting weather fetch for ${SRI_LANKA_DISTRICTS.length} districts...`);

  let successCount = 0;
  let failCount = 0;

  for (const { district, lat, lon } of SRI_LANKA_DISTRICTS) {
    try {
      // 1. Fetch current snapshot from OpenWeather
      const { data } = await axios.get(OW_BASE, {
        params: { lat, lon, appid: apiKey, units: 'metric' },
        timeout: 10_000,
      });
      const doc = mapWeatherData(district, data);

      // 2. Fetch 28-day daily aggregates from Open-Meteo
      let aggregates = {};
      try {
        aggregates = await fetchDailyAggregates(lat, lon);
      } catch (meteoErr) {
        console.warn(`[WeatherFetcher] ⚠️  Open-Meteo failed for "${district}": ${meteoErr.message}. Using fallbacks.`);
      }

      // Merge aggregates into the document
      const mergedDoc = {
        ...doc,
        rain_1w:     aggregates.rain_1w     ?? doc.rainfall * 24 * 7,   // rough fallback: hourly × 168h
        rain_2w:     aggregates.rain_2w     ?? doc.rainfall * 24 * 14,
        rain_4w:     aggregates.rain_4w     ?? doc.rainfall * 24 * 28,
        temp_avg_4w: aggregates.temp_avg_4w ?? doc.temperature_mean,
        humidity_4w: aggregates.humidity_4w ?? doc.humidity,
      };

      await LiveWeather.findOneAndUpdate(
        { district },
        { $set: mergedDoc },
        { upsert: true, new: true, runValidators: true }
      );

      successCount++;
      await sleep(1000); // 1-second delay between districts to avoid rate limits
    } catch (err) {
      failCount++;
      const reason = err.response
        ? `HTTP ${err.response.status} — ${JSON.stringify(err.response.data)}`
        : err.message;
      console.error(`[WeatherFetcher] ⚠️  Failed for "${district}": ${reason}`);
    }
  }

  console.log(
    `[WeatherFetcher] ✅ Done — ${successCount}/${SRI_LANKA_DISTRICTS.length} districts updated` +
    (failCount > 0 ? ` | ${failCount} failed` : '')
  );

  // Trigger ML predictions automatically based on updated weather inputs
  try {
    const { runMLPredictionsAndAlerts } = await import('./predictionService.js');
    await runMLPredictionsAndAlerts();
  } catch (predErr) {
    console.error('[WeatherFetcher] ⚠️ Prediction trigger failed:', predErr.message);
  }
}
