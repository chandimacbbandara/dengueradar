export default function RiskBadge({ level, score, className = '' }) {
  const l = (level || 'low').toLowerCase();
  const normalizedLevel = l === 'medium' ? 'moderate' : l;
  const icons = { low: '🟢', moderate: '🟡', high: '🔴' };
  const label = normalizedLevel.charAt(0).toUpperCase() + normalizedLevel.slice(1);

  return (
    <span className={`risk-badge ${normalizedLevel} ${className}`}>
      {icons[normalizedLevel] || '⚪'} {label} Risk
      {score !== undefined && <span style={{ opacity: 0.7, fontSize: '11px', marginLeft: '4px' }}>({Math.round(score)})</span>}
    </span>
  );
}
