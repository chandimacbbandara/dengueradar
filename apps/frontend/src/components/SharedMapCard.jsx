import React from 'react';
import SriLankaMap from './SriLankaMap.jsx';
import { useTranslation } from 'react-i18next';
import Icon from './Icon.jsx';

export default function SharedMapCard({ riskData, title, description, selectedDistrict, children }) {
  const { t } = useTranslation();
  
  return (
    <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-subtle)' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="map" size={20} color="var(--color-primary)" />
            {title || t('map.title')}
          </h3>
          {description && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{description}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
          <span className="dot dot-high animate-pulse"></span>
          {t('map.lastUpdated')}: {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      <div style={{ height: '520px', width: '100%', position: 'relative', zIndex: 1, flexShrink: 0 }}>
        <SriLankaMap riskData={riskData} selectedDistrict={selectedDistrict} />
      </div>

      <div style={{ padding: '16px 20px', background: 'var(--color-bg-card)', borderTop: '1px solid var(--color-border-light)', display: 'flex', gap: '16px', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-risk-low)', display: 'inline-block' }}></span>
          {t('map.riskLow')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
          <span style={{ width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '12px solid var(--color-risk-moderate)', display: 'inline-block' }}></span>
          {t('map.riskModerate')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
          <span style={{ width: '12px', height: '12px', background: 'var(--color-risk-high)', display: 'inline-block' }}></span>
          {t('map.riskHigh')}
        </div>
      </div>

      {children && (
        <div style={{ padding: '20px', flexGrow: 1, background: 'var(--color-bg-subtle)', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      )}
    </div>
  );
}
