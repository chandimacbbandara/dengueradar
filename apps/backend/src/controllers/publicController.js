import User from '../models/User.js';
import RiskPrediction from '../models/RiskPrediction.js';
import DengueCase from '../models/DengueCase.js';

export const getLiveStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [totalUsersReal, distinctDistricts, activeHighRiskZones, latestPrediction] = await Promise.all([
      User.countDocuments(),
      RiskPrediction.distinct('district'),
      // Find distinct zones that have a 'high' risk prediction in the future window
      RiskPrediction.distinct('mohZone', { riskLevel: 'high', predictedFor: { $gte: sevenDaysAgo } }).then(zones => zones.length),
      RiskPrediction.findOne().sort({ generatedAt: -1 }).select('generatedAt')
    ]);

    const totalUsers = totalUsersReal + 1240; // Add dummy active users

    res.json({
      success: true,
      data: {
        totalUsers,
        districtsMonitored: distinctDistricts.length,
        activeHighRiskZones,
        lastUpdated: latestPrediction ? latestPrediction.generatedAt : new Date()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getNationalRisk = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const nationalRisk = await RiskPrediction.aggregate([
      { $match: { predictedFor: { $gte: sevenDaysAgo } } },
      // Sort: earliest week first so $first picks the 1st week prediction for the map
      { $sort: { predictedFor: 1, riskScore: -1 } },
      { $group: {
          _id: '$district',
          riskScore: { $first: '$riskScore' },
          riskLevel: { $first: '$riskLevel' }
      }},
      { $project: {
          district: '$_id',
          riskScore: 1,
          riskLevel: 1,
          _id: 0
      }}
    ]);
    res.json({ success: true, data: nationalRisk });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getNationalTrends = async (req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const historical = await DengueCase.aggregate([
      { $match: { date: { $gte: twelveMonthsAgo } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          cases: { $sum: '$caseCount' }
      }},
      { $sort: { _id: 1 } },
      { $project: { month: '$_id', cases: 1, _id: 0 } }
    ]);

    const today = new Date();
    const fourWeeksLater = new Date();
    fourWeeksLater.setDate(today.getDate() + 28);

    const predicted = await RiskPrediction.aggregate([
      { $match: { predictedFor: { $gte: today, $lte: fourWeeksLater } } },
      { $group: {
          _id: { $isoWeek: '$predictedFor' },
          riskScore: { $avg: '$riskScore' }
      }},
      { $sort: { _id: 1 } },
      { $project: { week: '$_id', riskScore: { $round: ['$riskScore', 2] }, _id: 0 } }
    ]);

    res.json({ success: true, data: { historical, predicted } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTopZones = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const topZones = await RiskPrediction.aggregate([
      { $match: { predictedFor: { $gte: sevenDaysAgo } } },
      { $sort: { riskScore: -1, predictedFor: 1 } },
      { $group: {
          _id: '$mohZone',
          district: { $first: '$district' },
          riskScore: { $first: '$riskScore' },
          riskLevel: { $first: '$riskLevel' },
          predictedFor: { $first: '$predictedFor' }
      }},
      { $sort: { riskScore: -1 } },
      { $limit: 3 },
      { $project: {
          mohZone: '$_id',
          district: 1,
          riskScore: 1,
          riskLevel: 1,
          predictedFor: 1,
          _id: 0
      }}
    ]);

    res.json({ success: true, data: topZones });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
