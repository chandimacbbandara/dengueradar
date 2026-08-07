import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const getRiskColor = (level) => {
  if (level === 'high') return 'rgba(220, 38, 38, 0.7)';
  if (level === 'moderate') return 'rgba(217, 119, 6, 0.7)';
  if (level === 'low') return 'rgba(22, 163, 74, 0.7)';
  return 'rgba(148, 163, 184, 0.4)'; // unknown
};

export default function SriLankaMap({ riskData }) {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/srilanka-districts.json')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load map data', err);
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner"></div></div>;
  if (error) return <div className="alert alert-error">Failed to load map data. Please try again later.</div>;

  const styleFeature = (feature) => {
    const districtName = feature.properties.name || feature.properties.NAME_1 || feature.properties.ADM2_EN;
    const districtData = riskData?.find(d => d.district?.toLowerCase() === districtName?.toLowerCase());
    return {
      fillColor: getRiskColor(districtData?.riskLevel),
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.8
    };
  };

  const onEachFeature = (feature, layer) => {
    const districtName = feature.properties.name || feature.properties.NAME_1 || feature.properties.ADM2_EN;
    const districtData = riskData?.find(d => d.district?.toLowerCase() === districtName?.toLowerCase());
    
    let popupContent = `<strong>${districtName}</strong><br/>`;
    if (districtData) {
      popupContent += `Risk Score: ${Math.round(districtData.riskScore)}<br/>
      Level: <span class="risk-badge ${districtData.riskLevel}">${districtData.riskLevel.toUpperCase()}</span>`;
    } else {
      popupContent += `Data unavailable`;
    }
    
    layer.bindPopup(popupContent);
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({ weight: 3, fillOpacity: 1 });
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle({ weight: 1, fillOpacity: 0.8 });
      }
    });
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer 
        center={[7.8731, 80.7718]} 
        zoom={7} 
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {geoData && (
          <GeoJSON 
            data={geoData} 
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
      <div style={{
        position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(14, 165, 165, 0.3)',
        color: '#f8fafc', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
      }}>
        <div style={{fontSize:'12px', fontWeight:700, marginBottom:'8px'}}>RISK LEVEL</div>
        <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px'}}>
          <div style={{width:'12px', height:'12px', background:getRiskColor('high'), borderRadius:'2px'}}></div> High
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px'}}>
          <div style={{width:'12px', height:'12px', background:getRiskColor('moderate'), borderRadius:'2px'}}></div> Moderate
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
          <div style={{width:'12px', height:'12px', background:getRiskColor('low'), borderRadius:'2px'}}></div> Low
        </div>
      </div>
    </div>
  );
}
