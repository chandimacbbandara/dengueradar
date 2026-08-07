import React from 'react';

export default function LiveTicker({ riskData }) {
  if (!riskData || riskData.length === 0) return null;

  // Filter high and moderate risk zones for the ticker
  const alerts = riskData.filter(r => r.riskLevel === 'high' || r.riskLevel === 'moderate');
  
  // Create a continuous array of ticker items
  // We duplicate the array to allow for seamless infinite scrolling
  const tickerItems = [...alerts, ...alerts, ...alerts].map((alert, idx) => {
    const isHigh = alert.riskLevel === 'high';
    const color = isHigh ? '#EF4444' : '#F59E0B';
    const icon = isHigh ? '🚨' : '⚠️';
    
    return (
      <div key={`${alert.district}-${alert.mohZone}-${idx}`} className="live-ticker-item">
        <span>{icon}</span>
        <span style={{ color: '#fff' }}>{alert.mohZone}</span>
        <span>({alert.district})</span>
        <span>escalated to</span>
        <span style={{ color, fontWeight: 700 }}>{alert.riskLevel.toUpperCase()} RISK</span>
      </div>
    );
  });

  return (
    <div className="live-ticker-wrap">
      <div className="live-ticker-track">
        {tickerItems}
      </div>
    </div>
  );
}
