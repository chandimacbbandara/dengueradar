import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function TrendChart({ data }) {
  if (!data) return <div className="loading-center"><div className="spinner"></div></div>;

  // Transform data for chart
  // Assuming data has { historical: [{month, cases}], predicted: [{month/week, cases/risk}] }
  // We'll merge them for a continuous chart
  const chartData = [];
  
  if (data.historical) {
    data.historical.forEach(d => {
      chartData.push({ name: d.month, historicalCases: d.cases, predictedCases: null });
    });
  }
  
  if (data.predicted) {
    data.predicted.forEach(d => {
      chartData.push({ name: d.week || d.month, historicalCases: null, predictedCases: d.riskScore || d.cases });
    });
  }

  // Fallback data if API is empty
  const defaultData = [
    { name: 'Jan', historicalCases: 4000 },
    { name: 'Feb', historicalCases: 3000 },
    { name: 'Mar', historicalCases: 2000 },
    { name: 'Apr', historicalCases: 2780 },
    { name: 'May', historicalCases: 1890 },
    { name: 'Jun', historicalCases: 2390 },
    { name: 'Jul', predictedCases: 3490 },
    { name: 'Aug', predictedCases: 4000 },
  ];

  const renderData = chartData.length > 0 ? chartData : defaultData;

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <ResponsiveContainer>
        <AreaChart data={renderData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0EA5A5" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#0EA5A5" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D97706" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#D97706" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{fontSize: 12, fill: '#94A3B8'}} axisLine={false} tickLine={false} />
          <YAxis tick={{fontSize: 12, fill: '#94A3B8'}} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border-light)', background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
          />
          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '14px', fontWeight: 500 }} />
          <Area 
            type="monotone" 
            dataKey="historicalCases" 
            name="Historical Cases"
            stroke="#0EA5A5" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorHistorical)" 
            connectNulls
          />
          <Area 
            type="monotone" 
            dataKey="predictedCases" 
            name="Predicted Risk/Cases"
            stroke="#D97706" 
            strokeWidth={3}
            strokeDasharray="5 5"
            fillOpacity={1} 
            fill="url(#colorPredicted)" 
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
