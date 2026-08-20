import Icon from '../Icon.jsx';
import { useTranslation } from 'react-i18next';

const riskConfig = {
  low: { color: 'var(--risk-low)', bg: 'var(--risk-low-bg)', icon: 'shield', label: t('dashboard_components.risk_card.levels.low') },
  moderate: { color: 'var(--risk-mod)', bg: 'var(--risk-mod-bg)', icon: 'alert-circle', label: t('dashboard_components.risk_card.levels.moderate') },
  high: { color: 'var(--risk-high)', bg: 'var(--risk-high-bg)', icon: 'alert-triangle', label: t('dashboard_components.risk_card.levels.high') },
  critical: { color: 'var(--risk-crit)', bg: 'var(--risk-crit-bg)', icon: 'alert-octagon', label: t('dashboard_components.risk_card.levels.critical') },
  unknown: { color: 'var(--text-3)', bg: 'var(--surface-2)', icon: 'help-circle', label: t('dashboard_components.risk_card.levels.unknown') }
};

export default function CitizenRiskCard({ riskInfo, district, mohZone }) {
  const { t } = useTranslation();
  const level = riskInfo?.riskLevel?.toLowerCase() || 'unknown';
  const config = riskConfig[level] || riskConfig.unknown;

  const timeAgo = riskInfo?.generatedAt ? new Date(riskInfo.generatedAt).toLocaleString() : t('dashboard_components.risk_card.recently');

  return (
    <div className="card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '16px' }}>{t('dashboard_components.risk_card.title')}</h3>
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
            {t('dashboard_components.risk_card.description', { level: config.label.toLowerCase() })}
          </p>
        )}
      </div>
      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-3)' }}>
        {t('dashboard_components.risk_card.updated')}: {timeAgo}
      </div>
    </div>
  );
}
