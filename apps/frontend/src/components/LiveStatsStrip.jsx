import { useState, useEffect, useRef } from 'react';
import { publicAPI } from '../services/api.js';

function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 1500;
    const startValue = prevValue.current;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * (value - startValue) + startValue));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        prevValue.current = value;
      }
    };
    window.requestAnimationFrame(step);
  }, [value]);

  return <>{count.toLocaleString()}</>;
}

export default function LiveStatsStrip() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await publicAPI.getLiveStats();
        setStats(res.data.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="stats-strip">
        <div className="stats-strip-inner">
          {[1,2,3,4].map(i => (
            <div key={i} className="stat-item skeleton" style={{height:'80px'}}></div>
          ))}
        </div>
      </div>
    );
  }

  const updatedAt = stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Recently';

  return (
    <div className="container" style={{ position: 'relative', top: '-40px', zIndex: 10 }}>
      <div className="radar-glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', padding: '32px' }}>
        <div className="stat-item" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#0EA5A5' }}><AnimatedCounter value={stats?.totalUsers || 0} /></div>
          <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>Active Users</div>
        </div>
        <div className="stat-item" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#0EA5A5' }}><AnimatedCounter value={stats?.districtsMonitored || 25} /></div>
          <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>Districts Monitored</div>
        </div>
        <div className="stat-item" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#EF4444' }}><AnimatedCounter value={stats?.activeHighRiskZones || 0} /></div>
          <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>High-Risk Zones Today</div>
        </div>
        <div className="stat-item" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px' }}>
            Live
            <span className="dot dot-high" style={{ marginLeft: '12px', animation: 'pulse 2s infinite', background: '#10B981', boxShadow: '0 0 12px #10B981' }}></span>
          </div>
          <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>System Status</div>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>Updated: {updatedAt}</div>
        </div>
      </div>
    </div>
  );
}
