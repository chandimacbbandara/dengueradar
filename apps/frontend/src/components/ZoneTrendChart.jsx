import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { userAPI } from '../services/api.js';

/* ─── Constants ─────────────────────────────────────────────────── */
const PERIODS = [
  { key: 'daily',   labelKey: 'dashboard_components.trend.daily',   sub: '30 days' },
  { key: 'weekly',  labelKey: 'dashboard_components.trend.weekly',  sub: '12 weeks' },
  { key: 'monthly', labelKey: 'dashboard_components.trend.monthly', sub: '12 months' },
];

const RISK_COLOR = { high: '#EF4444', moderate: '#F59E0B', low: '#10B981' };
const RISK_LABEL = { high: '🔴 High Risk', moderate: '🟡 Moderate Risk', low: '🟢 Low Risk' };

/* ─── Custom tooltip ────────────────────────────────────────────── */
function CryptoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  
  // Pick the valid data point (if cases is null, use predictedCases)
  const data = payload.find(p => p.value != null) || payload[0];
  
  const isPredicted = data.dataKey === 'predictedCases';
  const cases = data.value ?? 0;
  const riskLevel = data.payload?.riskLevel;

  return (
    <div style={{
      background: 'rgba(15,23,42,0.97)',
      backdropFilter: 'blur(16px)',
      border: `1px solid ${isPredicted ? 'rgba(245,158,11,0.35)' : 'rgba(14,165,165,0.35)'}`,
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      minWidth: '150px',
    }}>
      <p style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '6px', fontWeight: 600 }}>
        {label} {isPredicted && <span style={{color: '#F59E0B', marginLeft: '4px'}}>(AI Forecast)</span>}
      </p>
      <p style={{ color: isPredicted ? '#F59E0B' : '#0EA5A5', fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>
        {cases.toLocaleString()}
      </p>
      <p style={{ color: '#475569', fontSize: '11px', marginTop: '4px' }}>
        dengue cases {riskLevel ? `— Risk: ${riskLevel.toUpperCase()}` : ''}
      </p>
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{
      height: 420, borderRadius: '20px',
      background: 'linear-gradient(90deg, #0d1f3c 25%, #0f2d4a 50%, #0d1f3c 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
    }} />
  );
}

/* ─── Animated counter ──────────────────────────────────────────── */
function LiveTicker({ value }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    let start = null;
    const duration = 800;
    const from = display;
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + eased * (value - from)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

/* ─── Period tab button ─────────────────────────────────────────── */
function PeriodTab({ p, active, onClick }) {
  return (
    <button
      id={`period-tab-${p.key}`}
      onClick={() => onClick(p.key)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '7px 16px',
        borderRadius: '10px',
        border: 'none',
        background: active ? 'rgba(14,165,165,0.18)' : 'transparent',
        boxShadow: active ? '0 0 0 1px rgba(14,165,165,0.4)' : 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 700, color: active ? '#0EA5A5' : '#475569', lineHeight: 1 }}>
        {p.label}
      </span>
      <span style={{ fontSize: '10px', color: active ? '#2dd4bf' : '#334155', marginTop: '2px' }}>
        {p.sub}
      </span>
    </button>
  );
}

/* ─── Main component ────────────────────────────────────────────── */
export default function ZoneTrendChart({ district, mohZone }) {
  const { t } = useTranslation();
  const [period, setPeriod]       = useState('monthly');
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const loadData = useCallback((p, dist, zone) => {
    setLoading(true);
    setError(null);
    userAPI.getZoneTrend(p, dist, zone)
      .then(res => setTrendData(res.data.data))
      .catch(err => setError(err.response?.data?.message || 'Could not load trend data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(period, district, mohZone); }, [period, district, mohZone, loadData]);

  const handlePeriod = (p) => {
    if (p === period) return;
    setPeriod(p);
  };

  if (loading && !trendData) return <Skeleton />;

  if (error) {
    return (
      <div style={{
        height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(239,68,68,0.05)', borderRadius: '16px',
        border: '1px dashed rgba(239,68,68,0.3)',
      }}>
        <p style={{ color: '#EF4444', fontSize: '14px' }}>⚠ {error}</p>
      </div>
    );
  }

  const { zone, district: dataDistrict, riskInfo, trend = [], predictedTrend = [] } = trendData ?? {};
  const combinedTrend = [...trend, ...predictedTrend];
  const totalCases    = trend.reduce((s, d) => s + (d.cases || 0), 0);
  const peakPoint     = trend.reduce((a, b) => (b.cases > a.cases ? b : a), { cases: 0 });
  const last          = trend[trend.length - 1] ?? {};
  const prev          = trend[trend.length - 2] ?? {};
  const delta         = (last.cases || 0) - (prev.cases || 0);
  const deltaPos      = delta >= 0;
  const rawRiskLevel  = (riskInfo?.riskLevel ?? 'low').toLowerCase();
  const riskLevel     = rawRiskLevel === 'medium' ? 'moderate' : rawRiskLevel;
  const riskScore     = riskInfo?.riskScore ?? 0;
  const riskColor     = RISK_COLOR[riskLevel] || '#10B981';

  // Unique gradient ID per zone to avoid SVG conflicts
  const gradId = `ztc-grad-${(zone ?? 'x').replace(/\W+/g, '')}`;

  // X-axis tick thinning for dense periods
  const tickInterval = period === 'daily'  ? Math.ceil(combinedTrend.length / 10) :
                       period === 'weekly' ? 2 : 'preserveStartEnd';

  return (
    <div style={{
      background: 'linear-gradient(145deg, #0d1f3c 0%, #0f2d4a 60%, #0a1a2e 100%)',
      borderRadius: '20px',
      padding: '28px',
      border: '1px solid rgba(14,165,165,0.2)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      position: 'relative',
      overflow: 'hidden',
      opacity: loading ? 0.7 : 1,
      transition: 'opacity 0.3s ease',
    }}>

      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '-60px', right: '-60px',
        width: '220px', height: '220px', borderRadius: '50%',
        background: `radial-gradient(circle, ${riskColor}22 0%, transparent 70%)`,
        pointerEvents: 'none', transition: 'background 0.6s ease',
      }} />

      {/* ── Header row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#0EA5A5', boxShadow: '0 0 8px #0EA5A5',
              animation: 'pulse 2s ease infinite', display: 'inline-block',
            }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0EA5A5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {t('dashboard_components.trend.title')}
            </span>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#F1F5F9', margin: 0 }}>
            📍 {zone || '—'}
          </h3>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{t('dashboard_components.trend.subtitle')}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Period toggles */}
          <div style={{
            display: 'flex', gap: '4px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            padding: '4px',
          }}>
            {PERIODS.map(p => (
              <PeriodTab key={p.key} p={{...p, label: t(p.labelKey)}} active={period === p.key} onClick={handlePeriod} />
            ))}
          </div>

          {/* Risk pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: `${riskColor}18`,
            border: `1px solid ${riskColor}44`,
            borderRadius: '999px', padding: '6px 14px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: riskColor }}>{RISK_LABEL[riskLevel]}</span>
            <span style={{
              fontSize: '11px', fontWeight: 800,
              background: riskColor, color: 'white',
              borderRadius: '999px', padding: '1px 8px',
            }}>{Math.round(riskScore)}</span>
          </div>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: `Total (${PERIODS.find(p => p.key === period)?.sub})`,
            value: <LiveTicker value={totalCases} />, sub: 'cases reported', color: '#0EA5A5' },
          { label: 'Peak Period',
            value: peakPoint.cases?.toLocaleString() ?? '—', sub: peakPoint.label ?? '', color: '#F59E0B' },
          { label: 'Latest vs Previous',
            value: delta === 0 ? 'No change' : `${deltaPos ? '+' : ''}${delta.toLocaleString()}`,
            sub: deltaPos ? 'cases increased' : delta < 0 ? 'cases decreased' : '',
            color: delta === 0 ? '#64748B' : deltaPos ? '#EF4444' : '#10B981' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px', padding: '14px 16px',
          }}>
            <p style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</p>
            <p style={{ fontSize: '20px', fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Area chart ── */}
      <div style={{ height: '220px', marginLeft: '-8px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={combinedTrend}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#0EA5A5" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#0EA5A5" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`${gradId}-pred`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={riskColor} stopOpacity={0.55} />
                <stop offset="100%" stopColor={riskColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#475569', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#475569' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
            />

            <Tooltip
              content={<CryptoTooltip />}
              cursor={{ stroke: 'rgba(14,165,165,0.4)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />



            <Area
              type="monotoneX"
              dataKey="cases"
              name="Cases"
              stroke="#0EA5A5"
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{
                r: 5, fill: '#0EA5A5', stroke: '#0d1f3c', strokeWidth: 2,
                filter: 'drop-shadow(0 0 6px #0EA5A5)',
              }}
              isAnimationActive={!loading}
            />
            <Area
              type="monotoneX"
              dataKey="predictedCases"
              name="AI Prediction"
              stroke={riskColor}
              strokeWidth={2.5}
              strokeDasharray="5 5"
              fill={`url(#${gradId}-pred)`}
              dot={false}
              activeDot={{
                r: 5, fill: riskColor, stroke: '#0d1f3c', strokeWidth: 2,
                filter: `drop-shadow(0 0 6px ${riskColor})`,
              }}
              isAnimationActive={!loading}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
          {delta > 2 ? t('dashboard_components.trend.increasing') : delta < -2 ? t('dashboard_components.trend.decreasing') : t('dashboard_components.trend.stable')}
        </p>
        <p style={{ fontSize: '11px', color: '#1e3a5f', textAlign: 'right' }}>
          {t('dashboard_components.trend.source', { zone })}
        </p>
      </div>
    </div>
  );
}
