import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useThemeStore } from '../context/ThemeContext.jsx';

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

const normalizeStr = (str) => {
  if (!str) return '';
  const s = str.toLowerCase().replace(/[^a-z]/g, '');
  if (s.includes('mulathiv') || s.includes('mullaitiv') || s.includes('mulativ')) return 'mullaitivu';
  return s;
};

// Component to handle programmatic zooming
function MapZoomEffect({ selectedDistrict, geoData }) {
  const map = useMap();
  
  useEffect(() => {
    if (!selectedDistrict || !geoData) return;
    
    // Find the feature matching the selected district
    const feature = geoData.features.find(f => {
      const geoName = f.properties.name || f.properties.NAME_1 || f.properties.ADM2_EN;
      return normalizeStr(geoName) === normalizeStr(selectedDistrict);
    });
    
    if (feature) {
      const layer = L.geoJSON(feature);
      const bounds = layer.getBounds();
      // Fly to bounds, padded a bit so it doesn't touch the edges
      map.flyToBounds(bounds, { padding: [20, 20], duration: 1.5 });
    }
  }, [selectedDistrict, geoData, map]);
  
  return null;
}

export default function SriLankaMap({ riskData, selectedDistrict }) {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const { isDark } = useThemeStore();

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

  if (error) return <div className="alert alert-error">Failed to load map data. Please try again later.</div>;

  const styleFeature = (feature) => {
    const geoName = feature.properties.name || feature.properties.NAME_1 || feature.properties.ADM2_EN;
    const districtData = riskData?.find(d => normalizeStr(d.district) === normalizeStr(geoName));
    return {
      fillColor: getRiskColor(districtData?.riskLevel),
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.8
    };
  };

  const onEachFeature = (feature, layer) => {
    const geoName = feature.properties.name || feature.properties.NAME_1 || feature.properties.ADM2_EN;
    const districtData = riskData?.find(d => normalizeStr(d.district) === normalizeStr(geoName));
    
    let popupContent = `<strong>${geoName}</strong><br/>`;
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
          url={isDark 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {geoData && (
          <>
            <GeoJSON 
              data={geoData} 
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
            {selectedDistrict && <MapZoomEffect selectedDistrict={selectedDistrict} geoData={geoData} />}
          </>
        )}
      </MapContainer>
    </div>
  );
}
