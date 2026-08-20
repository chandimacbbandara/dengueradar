import Icon from '../Icon.jsx';

export default function RecommendedActions({ riskLevel }) {
  const level = riskLevel?.toLowerCase() || 'low';
  
  let recs = [];
  if (level === 'critical') {
    recs = [
      'Follow current official public-health guidance.',
      'Take immediate preventive measures.',
      'Use mosquito repellents and wear long-sleeved clothing.',
      'Monitor official alerts and local health authorities closely.'
    ];
  } else if (level === 'high') {
    recs = [
      'Take additional mosquito prevention precautions.',
      'Remove breeding sites in your vicinity immediately.',
      'Use mosquito repellents when outdoors.',
      'Monitor official public-health updates.'
    ];
  } else if (level === 'moderate') {
    recs = [
      'Remove standing water around your home.',
      'Check containers and gutters for blockages.',
      'Increase general mosquito prevention measures.',
      'Monitor DengueRadar updates.'
    ];
  } else {
    recs = [
      'Continue routine removal of standing water.',
      'Keep outdoor water containers securely covered.',
      'Maintain clean surroundings.',
      'Monitor local risk periodically.'
    ];
  }

  return (
    <div className="card" style={{ padding: '24px', height: '100%', background: 'var(--surface-2)' }}>
      <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '16px' }}>What You Should Do Now</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {recs.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px' }}>
            <Icon name="check-circle" size={18} color="var(--teal)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.5 }}>{r}</span>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '24px', padding: '12px', background: 'var(--color-bg)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.4 }}>
        <strong>Note:</strong> These are general household prevention recommendations, not medical advice. For diagnosis or medical treatment, please consult a healthcare professional.
      </div>
    </div>
  );
}
