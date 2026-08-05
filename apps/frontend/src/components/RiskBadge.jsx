export default function RiskBadge({ level, score, className = '' }) {
  const icons = { low: '🟢', moderate: '🟡', high: '🔴' };
  return (
    <span className={`risk-badge ${level || 'low'} ${className}`}>
      {icons[level] || '⚪'}
      {level?.charAt(0).toUpperCase() + level?.slice(1) || 'Unknown'}
      {score !== undefined && <span style={{opacity:0.7, fontSize:'11px', marginLeft:'4px'}}>({Math.round(score)})</span>}
    </span>
  );
}
