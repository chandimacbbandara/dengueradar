import Icon from '../Icon.jsx';

const riskConfig = {
  low: { color: 'var(--risk-low)', bg: 'var(--risk-low-bg)', icon: 'shield', label: 'Low Risk' },
  moderate: { color: 'var(--risk-mod)', bg: 'var(--risk-mod-bg)', icon: 'alert-circle', label: 'Moderate Risk' },
  high: { color: 'var(--risk-high)', bg: 'var(--risk-high-bg)', icon: 'alert-triangle', label: 'High Risk' },
  critical: { color: 'var(--risk-crit)', bg: 'var(--risk-crit-bg)', icon: 'alert-octagon', label: 'Critical Risk' },
  unknown: { color: 'var(--text-3)', bg: 'var(--surface-2)', icon: 'help-circle', label: 'Data Unavailable' }
};

export default function CitizenRiskCard({ riskInfo, district, mohZone }) {
  const level = riskInfo?.riskLevel?.toLowerCase() || 'unknown';
  const config = riskConfig[level] || riskConfig.unknown;

  const timeAgo = riskInfo?.generatedAt ? new Date(riskInfo.generatedAt).toLocaleString() : 'Recently';

  return (
    <div className="card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '16px' }}>Your Area Risk</h3>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: config.bg, color: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={config.icon} size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: config.color }}>{config.label}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>{mohZone}, {district}</div>
          </div>
        </div>
        {riskInfo && (
          <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.5, marginTop: '8px' }}>
            Based on recent environmental conditions and historical data, the AI model has classified this zone as {config.label.toLowerCase()}.
          </p>
        )}
      </div>
      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-3)' }}>
        Risk status updated: {timeAgo}
      </div>
    </div>
  );
}
