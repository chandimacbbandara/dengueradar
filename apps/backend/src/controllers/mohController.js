import RiskPrediction from '../models/RiskPrediction.js';
import DengueCase from '../models/DengueCase.js';
import User from '../models/User.js';

export const getMohDashboard = async (req, res) => {
  try {
    const { district } = req.user;
    
    const [riskPredictions, thirtyDaysAgo, userCount] = await Promise.all([
      RiskPrediction.aggregate([
        { $match: { district } },
        { $sort: { predictedFor: -1 } },
        { $group: {
            _id: '$mohZone',
            riskScore: { $first: '$riskScore' },
            riskLevel: { $first: '$riskLevel' },
            predictedFor: { $first: '$predictedFor' }
        }},
        { $project: { mohZone: '$_id', riskScore: 1, riskLevel: 1, predictedFor: 1, _id: 0 } }
      ]),
      (new Date(new Date().setDate(new Date().getDate() - 30))),
      User.countDocuments({ district })
    ]);

    const casesTrend = await DengueCase.find({ district, date: { $gte: thirtyDaysAgo } })
      .sort({ date: 1 })
      .select('date caseCount mohZone -_id');

    res.json({ success: true, data: { riskPredictions, casesTrend, userCount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getZoneReport = async (req, res) => {
  try {
    const { mohZone } = req.params;
    
    const recentCases = await DengueCase.find({ mohZone })
      .sort({ date: -1 })
      .limit(30);
      
    const latestPrediction = await RiskPrediction.findOne({ mohZone })
      .sort({ predictedFor: -1 });

    res.json({ success: true, data: { recentCases, latestPrediction } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const exportZoneReport = async (req, res) => {
  try {
    const { mohZone } = req.params;
    
    const recentCases = await DengueCase.find({ mohZone })
      .sort({ date: -1 })
      .limit(30);
      
    const latestPrediction = await RiskPrediction.findOne({ mohZone })
      .sort({ predictedFor: -1 });

    res.json({ success: true, message: "CSV export not implemented yet. JSON preview provided.", data: { recentCases, latestPrediction } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
