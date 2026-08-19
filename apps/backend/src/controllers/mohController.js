import DengueCase from '../models/DengueCase.js';
import User from '../models/User.js';
import Alert from '../models/Alert.js';
import { getLivePredictions, sendRiskAlertEmail } from '../services/predictionService.js';

export const getMohDashboard = async (req, res) => {
  try {
    const district = req.query.district || req.user.district;
    
    const latestCase = await DengueCase.findOne({ district }).sort({ date: -1 }).lean();
    const referenceDate = latestCase ? new Date(latestCase.date) : new Date();
    const thirtyDaysAgo = new Date(referenceDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentCases = await DengueCase.find({ district, date: { $gte: thirtyDaysAgo, $lte: referenceDate } }).lean();
    const totalCasesMonth = recentCases.reduce((sum, record) => sum + record.caseCount, 0);
    
    const registeredCitizens = await User.countDocuments({ district, role: 'general' });

    // LIVE PREDICTIONS
    const allPredictions = await getLivePredictions(district);
    
    const userCountsByZone = await User.aggregate([
      { $match: { district, role: 'general' } },
      { $group: { _id: '$mohZone', count: { $sum: 1 } } }
    ]);
    const userCountMap = userCountsByZone.reduce((map, item) => {
      if (item._id) map[item._id] = item.count;
      return map;
    }, {});

    const zones = allPredictions.map(rp => {
      const zoneCasesSum = recentCases
        .filter(c => c.mohZone === rp.mohZone)
        .reduce((sum, record) => sum + record.caseCount, 0);

      return {
        name: rp.mohZone,
        riskScore: rp.riskScore,
        predictedCases: rp.predictedCases,
        riskLevel: rp.riskLevel,
        cases: zoneCasesSum,
        users: userCountMap[rp.mohZone] || 0
      };
    });

    const maxScore = zones.length > 0 ? Math.max(...zones.map(z => z.riskScore || 0)) : 0;
      
    let districtRiskLevel = 'low';
    if (maxScore >= 60) districtRiskLevel = 'high';
    else if (maxScore >= 30) districtRiskLevel = 'moderate';

    res.json({ 
      success: true, 
      data: { districtRiskLevel, totalCasesMonth, registeredCitizens, zones } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getZoneReport = async (req, res) => {
  try {
    const { mohZone } = req.params;
    
    const recentCases = await DengueCase.find({ mohZone }).sort({ date: -1 }).limit(30);
      
    // Since we need live prediction for a specific zone, fetch all and filter
    const allPredictions = await getLivePredictions();
    const latestPrediction = allPredictions.find(p => p.mohZone === mohZone) || null;

    res.json({ success: true, data: { recentCases, latestPrediction } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const exportZoneReport = async (req, res) => {
  try {
    const { mohZone } = req.params;
    
    const recentCases = await DengueCase.find({ mohZone }).sort({ date: -1 }).limit(30).lean();
    
    const allPredictions = await getLivePredictions();
    const latestPrediction = allPredictions.find(p => p.mohZone === mohZone);
    const predictions = latestPrediction ? [latestPrediction] : [];

    let csv = `Report For MOH Zone,${mohZone}\n\n`;
    csv += `AI FUTURE FORECAST & PREDICTIONS\n`;
    csv += `Forecast Target Date,Predicted Cases,Risk Level,Risk Score / 100\n`;
    
    if (predictions.length === 0) {
      csv += `No future predictions generated,\n`;
    } else {
      predictions.forEach(p => {
        const d = new Date(p.predictedFor).toLocaleDateString();
        csv += `${d},${p.predictedCases || 0},${p.riskLevel.toUpperCase()},${Math.round(p.riskScore)}\n`;
      });
    }
    csv += `\n`;

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

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="dengue_report_${mohZone.replace(/\s+/g, '_')}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const notifyZone = async (req, res) => {
  try {
    const { mohZone } = req.body;
    if (!mohZone) return res.status(400).json({ success: false, message: 'MOH Zone is required' });

    const users = await User.find({ mohZone, isVerified: true }).lean();
    if (users.length === 0) {
      return res.json({ success: true, message: 'No registered citizens found in this zone.' });
    }

    const allPredictions = await getLivePredictions();
    const latestPrediction = allPredictions.find(p => p.mohZone === mohZone);
    const riskLevel = latestPrediction ? latestPrediction.riskLevel : 'high';

    const alertDocs = [];
    for (const user of users) {
      alertDocs.push({
        userId: user._id,
        district: user.district,
        mohZone: user.mohZone,
        riskLevel: riskLevel,
        channel: 'web',
        message: `MOH ALERT: Your local Medical Officer of Health has issued an alert for ${user.mohZone}. Please take immediate precautions.`,
        sentAt: new Date(),
        status: 'sent',
      });

      if (process.env.NODE_ENV === 'production') {
        try {
          await sendRiskAlertEmail(user.email, user.firstName || 'Citizen', user.mohZone, riskLevel, 'manual');
        } catch (err) {
          console.error(`[MOHController] Failed to send manual alert email to ${user.email}:`, err.message);
        }
      }
    }

    if (alertDocs.length > 0) {
      await Alert.insertMany(alertDocs);
    }

    res.json({ success: true, message: `Alert sent successfully to ${users.length} citizens in ${mohZone}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
