import { useState, useEffect } from 'react';
import { referenceAPI } from '../services/api.js';

const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
];

export default function DistrictZoneSelect({ district, setDistrict, mohZone, setMohZone, errors = {} }) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!district) {
      setZones([]);
      return;
    }
    const fetchZones = async () => {
      setLoading(true);
      try {
        const res = await referenceAPI.getMohZones(district);
        setZones(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch MOH zones', err);
        setZones([]);
      } finally {
        setLoading(false);
      }
    };
    fetchZones();
  }, [district]);

  return (
    <div className="grid-2">
      <div className="form-group">
        <label className="form-label">District</label>
        <select 
          className={`form-input ${errors.district ? 'error' : ''}`}
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            setMohZone('');
          }}
        >
          <option value="">Select District</option>
          {DISTRICTS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        {errors.district && <span className="form-error">{errors.district}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">MOH Zone</label>
        <select 
          className={`form-input ${errors.mohZone ? 'error' : ''}`}
          value={mohZone}
          onChange={(e) => setMohZone(e.target.value)}
          disabled={!district || loading}
        >
          <option value="">{loading ? 'Loading...' : 'Select MOH Zone'}</option>
          {zones.map(z => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
        {errors.mohZone && <span className="form-error">{errors.mohZone}</span>}
      </div>
    </div>
  );
}
