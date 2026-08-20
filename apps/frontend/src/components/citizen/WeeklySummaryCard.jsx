export default function WeeklySummaryCard({ riskInfo, trendData, weather }) {
  const { t } = useTranslation();
  
  const getTrendIcon = () => {
    if (!trendData || trendData.length < 2) return { icon: '→', text: 'Stable', color: 'var(--risk-mod)' };
    const last = trendData[trendData.length - 1].cases || 0;
    const prev = trendData[trendData.length - 2].cases || 0;
    if (last > prev + 2) return { icon: '↑', text: 'Increasing', color: 'var(--risk-high)' };
    if (last < prev - 2) return { icon: '↓', text: 'Decreasing', color: 'var(--risk-low)' };
    return { icon: '→', text: 'Stable', color: 'var(--risk-mod)' };
  };

  const getRainStatus = () => {
    if (!weather) return 'Unknown';
    if (weather.rain_1w > 30) return 'Above Average';
    if (weather.rain_1w > 5) return 'Average';
    return 'Below Average';
  };

  const trend = getTrendIcon();
  const riskLabel = riskInfo?.riskLevel ? (riskInfo.riskLevel.charAt(0).toUpperCase() + riskInfo.riskLevel.slice(1)) : 'Unknown';
  
  let summaryText = 'Environmental conditions are currently stable.';
  if (riskInfo?.riskLevel === 'high' || riskInfo?.riskLevel === 'critical') {
    summaryText = 'Conditions are highly favorable for dengue transmission. Take immediate precautions.';
  } else if (weather?.rain_1w > 30 || trend.text === 'Increasing') {
    summaryText = 'Environmental conditions are becoming more favorable for dengue transmission.';
  } else if (trend.text === 'Decreasing') {
    summaryText = 'Dengue activity appears to be decreasing in your area.';
  }

  return (
    <div className="card" style={{ padding: '24px', height: '100%' }}>
      <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '16px' }}>{t('dashboard_components.summary_card.title')}</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-2)' }}>Dengue Risk</span>
          <strong style={{ color: 'var(--text)' }}>{riskLabel}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-2)' }}>Trend</span>
          <strong style={{ color: trend.color }}>{trend.icon} {trend.text}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-2)' }}>{t('dashboard_components.summary_card.rain')}</span>
          <strong style={{ color: 'var(--text)' }}>{getRainStatus()}</strong>
        </div>
      </div>

      <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', lineHeight: 1.5, borderLeft: '3px solid var(--teal)' }}>
        {summaryText}
      </div>
    </div>
  );
}
