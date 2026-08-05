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
        setStats(res.data);
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
    <div className="stats-strip">
      <div className="stats-strip-inner">
        <div className="stat-item">
          <div className="stat-value"><AnimatedCounter value={stats?.totalUsers || 0} /></div>
          <div className="stat-label">Active Users</div>
        </div>
        <div className="stat-item">
          <div className="stat-value"><AnimatedCounter value={stats?.districtsMonitored || 25} /></div>
          <div className="stat-label">Districts Monitored</div>
        </div>
        <div className="stat-item">
          <div className="stat-value"><AnimatedCounter value={stats?.highRiskZones || 0} /></div>
          <div className="stat-label">High-Risk Zones Today</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{fontSize: '24px', display:'flex', alignItems:'center', justifyContent:'center', height:'100%'}}>
            Live
            <span className="dot dot-high" style={{marginLeft:'8px', animation:'pulse 2s infinite'}}></span>
          </div>
          <div className="stat-label">System Status</div>
          <div className="stat-sublabel">Updated: {updatedAt}</div>
        </div>
      </div>
    </div>
  );
}
