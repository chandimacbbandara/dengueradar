import mongoose from 'mongoose';

/**
 * LiveWeather — one document per district, upserted on every cron run.
 * Always reflects the latest reading from OpenWeatherMap.
 */
const liveWeatherSchema = new mongoose.Schema(
  {
    district: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    temperature_mean: { type: Number, default: null },   // main.temp (°C)
    temperature_max:  { type: Number, default: null },   // main.temp_max
    temperature_min:  { type: Number, default: null },   // main.temp_min
    apparent_temperature: { type: Number, default: null }, // main.feels_like
    humidity:         { type: Number, default: null },   // main.humidity (%)
    rainfall:         { type: Number, default: 0 },      // rain.1h → rain.3h → 0 (mm)
    // Accumulated weather aggregates (computed from Open-Meteo daily history)
    rain_1w:          { type: Number, default: 0 },      // Total rainfall last 7 days (mm)
    rain_2w:          { type: Number, default: 0 },      // Total rainfall last 14 days (mm)
    rain_4w:          { type: Number, default: 0 },      // Total rainfall last 28 days (mm)
    temp_avg_4w:      { type: Number, default: null },   // Avg temperature last 28 days (°C)
    humidity_4w:      { type: Number, default: null },   // Avg humidity last 28 days (%)

    wind_speed:       { type: Number, default: null },   // wind.speed (m/s)
    wind_direction:   { type: Number, default: null },   // wind.deg (°)
    weather_code:     { type: Number, default: null },   // weather[0].id
    fetched_at:       { type: Date,   default: Date.now },
  },
  {
    collection: 'live_weather',
    // No createdAt/updatedAt — fetched_at is the single source of truth
    timestamps: false,
  }
);

export default mongoose.model('LiveWeather', liveWeatherSchema);
