import RiskPrediction from '../models/RiskPrediction.js';
import DengueCase from '../models/DengueCase.js';
import User from '../models/User.js';

export const getMohDashboard = async (req, res) => {
  try {
    // 1. Allow querying by any district (defaulting to the officer's own district)
    const district = req.query.district || req.user.district;
    
    // 2. Fetch data required by the MohDashboard.jsx stats row
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
    
    // Find all cases in this district over the last 30 days
    const recentCases = await DengueCase.find({ district, date: { $gte: thirtyDaysAgo } }).lean();
    const totalCasesMonth = recentCases.reduce((sum, record) => sum + record.caseCount, 0);
    
    // Count citizens registered in this district
    const registeredCitizens = await User.countDocuments({ district, role: 'general' });

    // Find the current risk predictions (week 1) for all zones in this district
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const riskPredictions = await RiskPrediction.aggregate([
      { $match: { district, predictedFor: { $gte: today } } },
      { $sort: { predictedFor: 1 } },
      { $group: {
          _id: '$mohZone',
          riskScore: { $first: '$riskScore' },
          riskLevel: { $first: '$riskLevel' }
      }}
    ]);

    // Count citizens registered in this district, grouped by MOH Zone
    const userCountsByZone = await User.aggregate([
      { $match: { district, role: 'general' } },
      { $group: { _id: '$mohZone', count: { $sum: 1 } } }
    ]);
    const userCountMap = userCountsByZone.reduce((map, item) => {
      if (item._id) map[item._id] = item.count;
      return map;
    }, {});

    // Format zones array expected by the dashboard table and charts
    const zones = riskPredictions.map(rp => {
      // Find cases specifically for this zone
      const zoneCasesSum = recentCases
        .filter(c => c.mohZone === rp._id)
        .reduce((sum, record) => sum + record.caseCount, 0);

      return {
        name: rp._id,
        riskScore: rp.riskScore,
        riskLevel: rp.riskLevel,
        cases: zoneCasesSum,
        users: userCountMap[rp._id] || 0
      };
    });

    // Derive overall district risk level (highest risk found in any zone)
    const hasHigh = zones.some(z => z.riskLevel === 'high');
    const hasMod = zones.some(z => z.riskLevel === 'moderate');
    const districtRiskLevel = hasHigh ? 'high' : (hasMod ? 'moderate' : 'low');

    res.json({ 
      success: true, 
      data: { 
        districtRiskLevel,
        totalCasesMonth,
        registeredCitizens,
        zones
      } 
    });
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
    
    const [recentCases, predictions] = await Promise.all([
      DengueCase.find({ mohZone }).sort({ date: -1 }).limit(30).lean(),
      RiskPrediction.find({ mohZone }).sort({ predictedFor: 1 }).lean()
    ]);

    // Build CSV Content
    let csv = `Report For MOH Zone,${mohZone}\n\n`;
    
    // 1. Predictions Section
    csv += `AI FUTURE FORECAST & PREDICTIONS\n`;
    csv += `Forecast Target Date,Predicted Cases,Risk Level,Risk Score / 100\n`;
    const futurePredictions = predictions.filter(p => new Date(p.predictedFor) >= new Date().setHours(0,0,0,0));
    if (futurePredictions.length === 0) {
      csv += `No future predictions generated,\n`;
    } else {
      futurePredictions.forEach(p => {
        const d = new Date(p.predictedFor).toLocaleDateString();
        csv += `${d},${p.predictedCases || 0},${p.riskLevel.toUpperCase()},${Math.round(p.riskScore)}\n`;
      });
    }
    csv += `\n`;

    // 2. Historical Cases Section
    csv += `HISTORICAL REPORTED CASES (LAST 30 ENTRIES)\n`;
    csv += `Date,Reported Cases\n`;
    if (recentCases.length === 0) {
      csv += `No recent cases found,\n`;
    } else {
      recentCases.forEach(c => {
        const d = new Date(c.date).toLocaleDateString();
        csv += `${d},${c.caseCount}\n`;
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="dengue_report_${mohZone.replace(/\s+/g, '_')}.csv"`);
    
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
