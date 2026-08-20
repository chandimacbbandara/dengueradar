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
  const l = (level || '').toLowerCase();
  if (l === 'high' || l === 'alert' || l === 'warning') return 'rgba(220, 38, 38, 0.7)';
  if (l === 'moderate' || l === 'medium' || l === 'watch') return 'rgba(217, 119, 6, 0.7)';
  if (l === 'low') return 'rgba(22, 163, 74, 0.7)';
  return 'rgba(148, 163, 184, 0.4)'; // unknown
};

const normalizeStr = (str) => {
  if (!str) return '';
  const s = String(str).toLowerCase().replace(/[^a-z]/g, '');
  if (s.includes('mulathiv') || s.includes('mullaitiv') || s.includes('mulativ')) return 'mullaitivu';
  if (s.includes('nuwara') || s.includes('eliya')) return 'nuwaraeliya';
  if (s.includes('monaragala') || s.includes('moneragala')) return 'monaragala';
  return s;
};

// Component to handle programmatic zooming safely
function MapZoomEffect({ selectedDistrict, geoData }) {
  const map = useMap();
  
  useEffect(() => {
    try {
      if (!selectedDistrict || !geoData || !Array.isArray(geoData.features)) return;
      
      const feature = geoData.features.find(f => {
        const geoName = f?.properties?.name || f?.properties?.NAME_1 || f?.properties?.ADM2_EN;
        return normalizeStr(geoName) === normalizeStr(selectedDistrict);
      });
      
      if (feature) {
        const layer = L.geoJSON(feature);
        const bounds = layer.getBounds();
        if (bounds && bounds.isValid()) {
          if (!map._initialZoomDone) {
            map.fitBounds(bounds, { padding: [20, 20], animate: false });
            map._initialZoomDone = true;
          } else {
            map.flyToBounds(bounds, { padding: [20, 20], duration: 1.5 });
          }
        }
      }
    } catch (err) {
      console.warn('[MapZoomEffect] zoom error:', err);
    }
  }, [selectedDistrict, geoData, map]);
  
  return null;
}

function InvalidateSizeEffect() {
  const map = useMap();
  useEffect(() => {
    const trigger = () => {
      map.invalidateSize();
      window.dispatchEvent(new Event('resize'));
    };
    trigger();
    const t1 = setTimeout(trigger, 100);
    const t2 = setTimeout(trigger, 500);
    const t3 = setTimeout(trigger, 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [map]);
  return null;
}

const mapRenderer = L.svg({ padding: 1.5 });

export default function SriLankaMap({ riskData, selectedDistrict }) {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const { isDark } = useThemeStore();

  useEffect(() => {
    let isMounted = true;
    fetch('/srilanka-districts.json')
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setGeoData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load map data', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner"></div></div>;
  if (error) return <div className="alert alert-error">Failed to load map data. Please try again later.</div>;

  const safeRiskData = Array.isArray(riskData) ? riskData : [];

  const styleFeature = (feature) => {
    try {
      const geoName = feature?.properties?.name || feature?.properties?.NAME_1 || feature?.properties?.ADM2_EN;
      const districtData = safeRiskData.find(d => normalizeStr(d?.district) === normalizeStr(geoName));
      return {
        fillColor: getRiskColor(districtData?.riskLevel),
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.8
      };
    } catch(err) {
      return { fillColor: 'rgba(148, 163, 184, 0.4)', weight: 1, opacity: 1, color: 'white', fillOpacity: 0.8 };
    }
  };

  const onEachFeature = (feature, layer) => {
    try {
      const geoName = feature?.properties?.name || feature?.properties?.NAME_1 || feature?.properties?.ADM2_EN || 'District';
      const districtData = safeRiskData.find(d => normalizeStr(d?.district) === normalizeStr(geoName));
      
      let popupContent = `<div class="custom-popup">
        <div class="popup-title">${geoName}</div>`;
      if (districtData) {
        const scoreVal = districtData.riskScore != null ? Number(districtData.riskScore).toFixed(1) : '—';
        const levelClass = (districtData.riskLevel || 'low').toLowerCase();
        const badgeClass = levelClass === 'critical' ? 'crit' : levelClass === 'moderate' ? 'mod' : levelClass;
        popupContent += `<div class="popup-row"><span>Risk Score:</span> <strong>${scoreVal}</strong></div>
        <div class="popup-row"><span>Level:</span> <span class="badge ${badgeClass}">${levelClass.charAt(0).toUpperCase() + levelClass.slice(1)}</span></div>`;
      } else {
        popupContent += `<div class="popup-row">Data unavailable</div>`;
      }
      popupContent += `</div>`;
      
      layer.bindPopup(popupContent);
      layer.on({
        mouseover: (e) => {
          try {
            const l = e.target;
            l.setStyle({ weight: 3, fillOpacity: 1 });
          } catch(err) {}
        },
        mouseout: (e) => {
          try {
            const l = e.target;
            l.setStyle({ weight: 1, fillOpacity: 0.8 });
          } catch(err) {}
        }
      });
    } catch(err) {
      console.warn('[onEachFeature] error:', err);
    }
  };

  const geoKey = `geojson-${safeRiskData.length}-${selectedDistrict || 'all'}`;

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer 
        center={[7.8731, 80.7718]} 
        zoom={7} 
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
        zoomControl={false}
        renderer={mapRenderer}
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
              key={geoKey}
              data={geoData} 
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
            {selectedDistrict && <MapZoomEffect selectedDistrict={selectedDistrict} geoData={geoData} />}
          </>
        )}
        <InvalidateSizeEffect />
      </MapContainer>
    </div>
  );
}
