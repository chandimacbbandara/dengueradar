import { useState, useEffect } from 'react';
import { weatherAPI } from '../services/api.js';
import Icon from './Icon.jsx';
import { useTranslation } from 'react-i18next';

/* OpenWeather weather_code → icon + description */
function describeWeather(code, t) {
  if (!code) return { icon: 'thermometer', desc: t('dashboard_components.weather.loading') };
  if (code === 800)             return { icon: 'sun',  desc: t('dashboard_components.weather.clear') };
  if (code > 800)               return { icon: 'cloud',  desc: t('dashboard_components.weather.cloudy') };
  if (code >= 700)              return { icon: 'cloud-fog', desc: t('dashboard_components.weather.foggy') };
  if (code >= 600)              return { icon: 'snowflake',  desc: t('dashboard_components.weather.snow') };
  if (code >= 500)              return { icon: 'cloud-rain', desc: t('dashboard_components.weather.rain') };
  if (code >= 300)              return { icon: 'cloud-drizzle', desc: t('dashboard_components.weather.drizzle') };
  if (code >= 200)              return { icon: 'cloud-lightning',  desc: t('dashboard_components.weather.thunder') };
  return { icon: 'thermometer', desc: t('dashboard_components.weather.unknown') };
}

function compassDir(deg) {
  if (deg == null) return '—';
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export default function WeatherWidget({ district, weatherData, loading: externalLoading }) {
  const { t } = useTranslation();
  const [weather, setWeather] = useState(weatherData || null);
  const [loading, setLoading] = useState(externalLoading !== undefined ? externalLoading : true);

  useEffect(() => {
    if (weatherData !== undefined) {
      setWeather(weatherData);
      setLoading(externalLoading);
      return;
    }
    if (!district) return;
    weatherAPI.getDistrict(district)
      .then(res => setWeather(res.data.data))
      .catch(() => setWeather(null))   // silently fail — API key may not be active yet
      .finally(() => setLoading(false));
  }, [district, weatherData, externalLoading]);

  /* Not yet active or failed silently → render nothing rather than an ugly error */
  if (!loading && !weather) return null;

  const { icon, desc } = describeWeather(weather?.weather_code, t);
  const temp       = weather?.temperature_mean != null ? `${Math.round(weather.temperature_mean)}°C` : '—';
  const feelsLike  = weather?.apparent_temperature != null ? `${Math.round(weather.apparent_temperature)}°C` : '—';
  const humidity   = weather?.humidity != null ? `${weather.humidity}%` : '—';
  const wind       = weather?.wind_speed != null
    ? `${weather.wind_speed.toFixed(1)} m/s ${compassDir(weather.wind_direction)}`
    : '—';
  const rainfall   = weather?.rainfall > 0 ? `${weather.rainfall.toFixed(1)} mm` : t('dashboard_components.weather.norain');
  const updatedAt  = weather?.fetched_at
    ? new Date(weather.fetched_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div id="weather-widget" className="card" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      padding: '0',
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
        borderRight: '1px solid var(--border)',
        minWidth: '130px',
        background: 'var(--surface-2)'
      }}>
        {loading
          ? <div className="spinner" style={{ borderTopColor: 'var(--brand)' }} />
          : <>
              <div style={{ color: 'var(--brand)' }}>
                <Icon name={icon} size={36} />
              </div>
              <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, marginTop: '4px' }}>{temp}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>{desc}</span>
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
          { icName: 'thermometer', label: t('dashboard_components.weather.feels'), value: feelsLike },
          { icName: 'droplet', label: t('dashboard_components.weather.humidity'),   value: humidity },
          { icName: 'wind', label: t('dashboard_components.weather.wind'),        value: wind },
          { icName: 'cloud-rain', label: t('dashboard_components.weather.rainfall'),   value: rainfall },
        ].map(({ icName, label, value }) => (
          <div key={label} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'flex-start', justifyContent: 'center',
            padding: '14px 20px',
            borderRight: '1px solid var(--border)',
            flex: '1 0 auto',
            minWidth: '100px',
          }}>
            {loading
              ? <div style={{ width: 40, height: 12, borderRadius: 6, background: 'var(--border)' }} />
              : <>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    <Icon name={icName} size={14} /> {label}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{value}</span>
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
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--brand)', fontWeight: 700 }}>
          <Icon name="map-pin" size={14} /> {district}
        </span>
        {updatedAt && (
          <span style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '4px' }}>
            Updated {updatedAt}
          </span>
        )}
        <span style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>OpenWeatherMap</span>
      </div>
    </div>
  );
}
