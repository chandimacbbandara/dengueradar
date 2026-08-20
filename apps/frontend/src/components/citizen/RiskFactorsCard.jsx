import Icon from '../Icon.jsx';

export default function RiskFactorsCard({ riskInfo, weather }) {
  const getLevel = (val, thresholds) => {
    if (val == null) return { text: 'Unknown', color: 'var(--text-3)' };
    if (val >= thresholds[1]) return { text: 'HIGH', color: 'var(--risk-high)' };
    if (val >= thresholds[0]) return { text: 'MODERATE', color: 'var(--risk-mod)' };
    return { text: 'LOW', color: 'var(--risk-low)' };
  };

  const factors = [];
  if (weather) {
    factors.push({ name: 'Rainfall', icon: 'cloud-rain', value: getLevel(weather.rain_1w, [10, 50]) });
    factors.push({ name: 'Humidity', icon: 'droplet', value: getLevel(weather.humidity, [70, 85]) });
    factors.push({ name: 'Temperature', icon: 'thermometer', value: getLevel(weather.temperature_mean || weather.temp_avg, [26, 29]) });
  }
  
  if (riskInfo) {
    factors.push({ name: 'Dengue Activity', icon: 'activity', value: getLevel(riskInfo.riskScore, [20, 60]) });
  }

  return (
    <div className="card" style={{ padding: '24px', height: '100%' }}>
      <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '16px' }}>Why is my area at this risk?</h3>
      <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '16px' }}>
        Recent environmental and historical factors driving your current risk level.
      </p>
      
      {factors.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {factors.map((f, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--surface-2)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon name={f.icon} size={18} color="var(--teal)" />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{f.name}</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: f.value.color }}>{f.value.text}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '14px' }}>Data currently unavailable</div>
      )}
    </div>
  );
}
