import { useState, useEffect } from 'react';
import { weatherAPI } from '../services/api.js';

/* OpenWeather weather_code → icon + description */
function describeWeather(code) {
  if (!code) return { icon: '🌡️', desc: 'Weather data loading...' };
  if (code === 800)             return { icon: '☀️',  desc: 'Clear sky' };
  if (code > 800)               return { icon: '☁️',  desc: 'Cloudy' };
  if (code >= 700)              return { icon: '🌫️', desc: 'Foggy / Haze' };
  if (code >= 600)              return { icon: '❄️',  desc: 'Snow' };
  if (code >= 500)              return { icon: '🌧️', desc: 'Rain' };
  if (code >= 300)              return { icon: '🌦️', desc: 'Drizzle' };
  if (code >= 200)              return { icon: '⛈️',  desc: 'Thunderstorm' };
  return { icon: '🌡️', desc: 'Unknown' };
}

function compassDir(deg) {
  if (deg == null) return '—';
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export default function WeatherWidget({ district }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!district) return;
    weatherAPI.getDistrict(district)
      .then(res => setWeather(res.data.data))
      .catch(() => setWeather(null))   // silently fail — API key may not be active yet
      .finally(() => setLoading(false));
  }, [district]);

  /* Not yet active or failed silently → render nothing rather than an ugly error */
  if (!loading && !weather) return null;

  const { icon, desc } = describeWeather(weather?.weather_code);
  const temp       = weather?.temperature_mean != null ? `${Math.round(weather.temperature_mean)}°C` : '—';
  const feelsLike  = weather?.apparent_temperature != null ? `${Math.round(weather.apparent_temperature)}°C` : '—';
  const humidity   = weather?.humidity != null ? `${weather.humidity}%` : '—';
  const wind       = weather?.wind_speed != null
    ? `${weather.wind_speed.toFixed(1)} m/s ${compassDir(weather.wind_direction)}`
    : '—';
  const rainfall   = weather?.rainfall > 0 ? `${weather.rainfall.toFixed(1)} mm` : 'No rain';
  const updatedAt  = weather?.fetched_at
    ? new Date(weather.fetched_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div id="weather-widget" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      background: 'linear-gradient(135deg, #0d1f3c 0%, #0f3460 100%)',
      borderRadius: '16px',
      padding: '0',
      border: '1px solid rgba(14,165,165,0.2)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      overflow: 'hidden',
      marginBottom: '20px',
      minHeight: '90px',
    }}>
      {/* Big temp block */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 28px',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        minWidth: '130px',
      }}>
        {loading
          ? <div className="spinner" style={{ borderTopColor: '#0EA5A5' }} />
          : <>
              <span style={{ fontSize: '36px', lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#F1F5F9', lineHeight: 1.2, marginTop: '4px' }}>{temp}</span>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{desc}</span>
            </>
        }
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        flex: 1,
        flexWrap: 'wrap',
      }}>
        {[
          { icon: '🤔', label: 'Feels like', value: feelsLike },
          { icon: '💧', label: 'Humidity',   value: humidity },
          { icon: '💨', label: 'Wind',        value: wind },
          { icon: '🌧️', label: 'Rainfall',   value: rainfall },
        ].map(({ icon: ic, label, value }) => (
          <div key={label} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'flex-start', justifyContent: 'center',
            padding: '14px 20px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            flex: '1 0 auto',
            minWidth: '100px',
          }}>
            {loading
              ? <div style={{ width: 40, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
              : <>
                  <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    {ic} {label}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#CBD5E1' }}>{value}</span>
                </>
            }
          </div>
        ))}
      </div>

      {/* District + updated */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        justifyContent: 'center', padding: '14px 20px', whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: '12px', color: '#0EA5A5', fontWeight: 700 }}>📍 {district}</span>
        {updatedAt && (
          <span style={{ fontSize: '10px', color: '#334155', marginTop: '4px' }}>
            Updated {updatedAt}
          </span>
        )}
        <span style={{ fontSize: '10px', color: '#1e3a5f', marginTop: '2px' }}>OpenWeatherMap</span>
      </div>
    </div>
  );
}
