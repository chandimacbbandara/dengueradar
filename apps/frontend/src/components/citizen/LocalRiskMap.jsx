import SriLankaMap from '../SriLankaMap.jsx';
import { useTranslation } from 'react-i18next';

export default function LocalRiskMap({ nationalRiskData, district }) {
  const { t } = useTranslation();
  return (
    <div className="card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '16px' }}>{t('dashboard_components.local_map.title')}</h3>
      <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '16px' }}>
        {t('dashboard_components.local_map.subtitle', { district })}
      </p>
      <div style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <SriLankaMap riskData={nationalRiskData} selectedDistrict={district} />
      </div>
    </div>
  );
}
