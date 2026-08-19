import User from '../models/User.js';
import DengueCase from '../models/DengueCase.js';
import { getLivePredictions } from '../services/predictionService.js';

export const getLiveStats = async (req, res) => {
  try {
    const livePredictions = await getLivePredictions();
    const generatedAt = livePredictions.length > 0 ? livePredictions[0].generatedAt : new Date();

    const distinctDistricts = new Set(livePredictions.map(p => p.district));
    const activeHighRiskZones = livePredictions.filter(p => p.riskLevel === 'high').length;

    const totalUsersReal = await User.countDocuments();
    const totalUsers = totalUsersReal + 1240; // Add dummy active users

    res.json({
      success: true,
      data: {
        totalUsers,
        districtsMonitored: distinctDistricts.size,
        activeHighRiskZones,
        lastUpdated: generatedAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getNationalRisk = async (req, res) => {
  try {
    const livePredictions = await getLivePredictions();
    
    const districtData = {};
    const severityMap = { 'high': 3, 'moderate': 2, 'medium': 2, 'low': 1 };

    for (const p of livePredictions) {
      const dist = p.district;
      const cleanRisk = p.riskLevel ? p.riskLevel.toLowerCase() : 'low';

      if (!districtData[dist]) {
        districtData[dist] = { district: dist, counts: { high: 0, moderate: 0, low: 0 }, maxScore: 0 };
      }
      
      const d = districtData[dist];
      if (cleanRisk === 'high') d.counts.high++;
      else if (cleanRisk === 'moderate' || cleanRisk === 'medium') d.counts.moderate++;
      else d.counts.low++;
      
      if ((p.riskScore || 0) > d.maxScore) {
        d.maxScore = p.riskScore || 0;
      }
    }

    const nationalRisk = [];
    for (const d of Object.values(districtData)) {
      const c = d.counts;
      const maxCount = Math.max(c.high, c.moderate, c.low);
      
      let finalRisk = 'low';
      let finalSeverity = 1;
      
      // Tie breaker: higher severity wins
      if (c.high === maxCount) {
        finalRisk = 'high';
        finalSeverity = 3;
      } else if (c.moderate === maxCount) {
        finalRisk = 'moderate';
        finalSeverity = 2;
      } else {
        finalRisk = 'low';
        finalSeverity = 1;
      }
      
      nationalRisk.push({
        district: d.district,
        riskScore: d.maxScore,
        riskLevel: finalRisk,
        severity: finalSeverity
      });
    }

    nationalRisk.sort((a, b) => b.severity - a.severity || b.riskScore - a.riskScore);
    nationalRisk.forEach(d => delete d.severity);

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

    const livePredictions = await getLivePredictions();
    const predicted = [];

    if (livePredictions.length > 0) {
      const avgScore = livePredictions.reduce((sum, p) => sum + p.riskScore, 0) / livePredictions.length;
      
      const targetDate = livePredictions[0].predictedFor;
      const targetDateObj = new Date(targetDate);
      
      const isoWeek = Math.ceil((((targetDateObj - new Date(targetDateObj.getFullYear(),0,1)) / 86400000) + new Date(targetDateObj.getFullYear(),0,1).getDay()+1)/7);

      predicted.push({
        week: isoWeek,
        riskScore: Math.round(avgScore * 100) / 100
      });
    }

    res.json({ success: true, data: { historical, predicted } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTopZones = async (req, res) => {
  try {
    const livePredictions = await getLivePredictions();
    
    // Sort by riskScore descending
    const sorted = [...livePredictions].sort((a, b) => b.riskScore - a.riskScore);
    
    const topZones = sorted.slice(0, 3).map(p => ({
      mohZone: p.mohZone,
      district: p.district,
      riskScore: p.riskScore,
      riskLevel: p.riskLevel,
      predictedFor: p.predictedFor
    }));

    res.json({ success: true, data: topZones });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
