import MohZone from '../models/MohZone.js';

const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
];

export const getDistricts = (req, res) => {
  res.json({ success: true, data: DISTRICTS });
};

export const getMohZones = async (req, res, next) => {
  try {
    const { district } = req.query;
    if (!district) {
      return res.status(400).json({ success: false, message: 'district query param required' });
    }
    const zones = await MohZone.find({ district }).sort({ zoneName: 1 }).select('zoneName -_id');
    res.json({ success: true, data: zones.map((z) => z.zoneName) });
  } catch (err) {
    next(err);
  }
};
