import axios from 'axios';
import LiveWeather from '../models/LiveWeather.js';
import { SRI_LANKA_DISTRICTS } from '../data/sriLankaDistricts.js';

const OW_BASE = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Maps a raw OpenWeather API response to our LiveWeather schema fields.
 * @param {string} district - District name
 * @param {object} data     - Raw API response body
 * @returns {object}        - Shaped document ready for upsert
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
 * Per-district failures are logged and skipped — the run continues.
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
      const { data } = await axios.get(OW_BASE, {
        params: { lat, lon, appid: apiKey, units: 'metric' },
        timeout: 10_000, // 10 s per request
      });

      const doc = mapWeatherData(district, data);

      await LiveWeather.findOneAndUpdate(
        { district },
        { $set: doc },
        { upsert: true, new: true, runValidators: true }
      );

      successCount++;
    } catch (err) {
      failCount++;
      const reason = err.response
        ? `HTTP ${err.response.status} — ${JSON.stringify(err.response.data)}`
        : err.message;
      console.error(`[WeatherFetcher] ⚠️  Failed for "${district}": ${reason}`);
      // Continue to next district
    }
  }

  console.log(
    `[WeatherFetcher] ✅ Done — ${successCount}/${SRI_LANKA_DISTRICTS.length} districts updated` +
    (failCount > 0 ? ` | ${failCount} failed` : '')
  );
}
