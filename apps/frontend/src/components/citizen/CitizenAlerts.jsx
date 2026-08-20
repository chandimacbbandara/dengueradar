import { useState } from 'react';
import Icon from '../Icon.jsx';

export default function CitizenAlerts({ alerts }) {
  const [expanded, setExpanded] = useState(false);

  if (!alerts || alerts.length === 0) {
    return (
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="bell" size={16} /> Recent Alerts
        </h3>
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)', fontSize: '14px' }}>
          No recent alerts for your area.
        </div>
      </div>
    );
  }

  const visibleAlerts = expanded ? alerts : alerts.slice(0, 2);

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon name="bell" size={16} /> Recent Alerts
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {visibleAlerts.map(alert => {
          const isHigh = alert.severity === 'high' || alert.riskLevel === 'high' || alert.riskLevel === 'critical';
          const iconColor = isHigh ? 'var(--risk-high)' : 'var(--risk-mod)';
          const bgColor = isHigh ? 'var(--risk-high-bg)' : 'var(--risk-mod-bg)';
          const iconName = isHigh ? 'alert-triangle' : 'info';
          
          return (
            <div key={alert._id} style={{ display: 'flex', gap: '16px', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px', borderLeft: `4px solid ${iconColor}` }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: bgColor, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={iconName} size={20} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                  {alert.title || (alert.type === 'escalation' ? 'Risk Increased' : 'Dengue Alert')}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '8px' }}>
                  {alert.message || `Risk level in your zone changed to ${alert.riskLevel?.toUpperCase()}.`}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                  {new Date(alert.sentAt || alert.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {alerts.length > 2 && (
        <button 
          onClick={() => setExpanded(!expanded)}
          style={{ 
            marginTop: '16px', width: '100%', padding: '12px', background: 'var(--surface-2)', 
            border: 'none', borderRadius: '8px', color: 'var(--text-2)', fontSize: '13px', 
            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
          }}>
          {expanded ? 'Show Less' : `View all ${alerts.length} alerts`}
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} />
        </button>
      )}
    </div>
  );
}
