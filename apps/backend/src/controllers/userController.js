import RiskPrediction from '../models/RiskPrediction.js';
import Alert from '../models/Alert.js';
import User from '../models/User.js';

export const getDashboard = async (req, res) => {
  try {
    const { district, mohZone, _id } = req.user;
    
    const riskInfo = await RiskPrediction.findOne({ district, mohZone })
      .sort({ predictedFor: -1 })
      .select('district mohZone riskScore riskLevel predictedFor -_id');

    const alerts = await Alert.find({ userId: _id })
      .sort({ sentAt: -1 })
      .limit(10);

    res.json({ success: true, data: { riskInfo, alerts } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, whatsappNumber } = req.body;
    
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
      .select('-passwordHash -refreshToken -emailVerificationToken');
      
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
