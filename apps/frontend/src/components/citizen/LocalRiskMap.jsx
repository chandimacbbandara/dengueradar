import SriLankaMap from '../SriLankaMap.jsx';

export default function LocalRiskMap({ nationalRiskData, district }) {
  return (
    <div className="card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '16px' }}>Risk Around You</h3>
      <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '16px' }}>
        Explore the current dengue risk levels in {district} and surrounding districts.
      </p>
      <div style={{ flex: 1, minHeight: '350px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <SriLankaMap riskData={nationalRiskData} selectedDistrict={district} />
      </div>
    </div>
  );
}
