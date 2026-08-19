import RiskPrediction from '../models/RiskPrediction.js';
import Alert from '../models/Alert.js';
import DengueCase from '../models/DengueCase.js';
import User from '../models/User.js';

export const getDashboard = async (req, res) => {
  try {
    const { district, mohZone, _id } = req.user;
    
    const latestPrediction = await RiskPrediction.findOne().sort({ generatedAt: -1 }).select('generatedAt');
    const windowStart = latestPrediction ? new Date(latestPrediction.generatedAt.getTime() - 6 * 60 * 60 * 1000) : new Date();

    const riskInfo = await RiskPrediction.findOne({ district, mohZone, generatedAt: { $gte: windowStart } })
      .sort({ predictedFor: 1 })
      .select('district mohZone riskScore riskLevel predictedFor -_id');

    const alerts = await Alert.find({ userId: _id })
      .sort({ sentAt: -1 })
      .limit(10);

    res.json({ success: true, data: { riskInfo, alerts } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── ISO-week helpers (no external libs needed) ─────────────────── */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getISOWeekYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

function isoWeekKey(date) {
  const w = getISOWeek(date);
  const y = getISOWeekYear(date);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

function isoWeekLabel(date) {
  // "Monday dd Mon" short form
  const monday = new Date(date);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * GET /api/user/zone-trend?period=monthly|weekly|daily
 *
 * Returns dengue case trend data scoped to the authenticated user's
 * own district + mohZone. Period controls time granularity:
 *   monthly — last 12 months, one point per month
 *   weekly  — last 12 weeks,  one point per ISO week
 *   daily   — last 30 days,   one point per day
 */
export const getZoneTrend = async (req, res) => {
  try {
    const district = req.query.district || req.user.district;
    const mohZone = req.query.mohZone || req.user.mohZone;
    const period = ['daily', 'weekly', 'monthly'].includes(req.query.period)
      ? req.query.period
      : 'monthly';

    // Find the latest historical case to anchor the "now" date
    const latestCase = await DengueCase.findOne().sort({ date: -1 }).select('date');
    const now = latestCase ? new Date(latestCase.date) : new Date();

    /* ── Date window ── */
    let since;
    if (period === 'daily') {
      since = new Date(now);
      since.setDate(since.getDate() - 30);
      since.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      since = new Date(now);
      since.setDate(since.getDate() - 84); // 12 weeks
      since.setHours(0, 0, 0, 0);
    } else {
      since = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    }

    const matchStage = {
      district,
      date: { $gte: since },
      ...(mohZone ? { $or: [{ mohZone }, { mohZone: { $exists: false } }] } : {}),
    };

    /* ── Aggregation pipeline per period ── */
    let pipeline;

    if (period === 'daily') {
      pipeline = [
        { $match: matchStage },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            cases: { $sum: '$caseCount' },
        }},
        { $sort: { _id: 1 } },
        { $project: { _id: 0, key: '$_id', cases: 1 } },
      ];
    } else if (period === 'weekly') {
      pipeline = [
        { $match: matchStage },
        { $group: {
            _id: {
              year: { $isoWeekYear: '$date' },
              week: { $isoWeek:     '$date' },
            },
            cases: { $sum: '$caseCount' },
        }},
        { $sort: { '_id.year': 1, '_id.week': 1 } },
        { $project: {
            _id: 0,
            key: {
              $concat: [
                { $toString: '$_id.year' }, '-W',
                { $cond: { if: { $lt: ['$_id.week', 10] },
                           then: { $concat: ['0', { $toString: '$_id.week' }] },
                           else: { $toString: '$_id.week' } } },
              ],
            },
            cases: 1,
        }},
      ];
    } else {
      // monthly
      pipeline = [
        { $match: matchStage },
        { $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            cases: { $sum: '$caseCount' },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $project: {
            _id: 0,
            key: {
              $dateToString: {
                format: '%Y-%m',
                date: { $dateFromParts: { year: '$_id.year', month: '$_id.month', day: 1 } },
              },
            },
            cases: 1,
        }},
      ];
    }

    const aggregated = await DengueCase.aggregate(pipeline);
    const dataMap = Object.fromEntries(aggregated.map(d => [d.key, d.cases]));

    /* ── Fill gaps so the graph has no holes ── */
    const filledData = [];
    const cursor = new Date(since);

    if (period === 'daily') {
      while (cursor <= now) {
        const key = cursor.toISOString().slice(0, 10);
        filledData.push({
          key,
          label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          cases: dataMap[key] ?? 0,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (period === 'weekly') {
      // Advance cursor to the Monday of its ISO week
      const startDay = cursor.getDay() || 7;
      cursor.setDate(cursor.getDate() - startDay + 1);

      while (cursor <= now) {
        const key = isoWeekKey(cursor);
        filledData.push({
          key,
          label: isoWeekLabel(cursor),
          cases: dataMap[key] ?? 0,
        });
        cursor.setDate(cursor.getDate() + 7);
      }
    } else {
      // monthly
      while (cursor <= now) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        filledData.push({
          key,
          label: cursor.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
          cases: dataMap[key] ?? 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    /* ── Current risk snapshot: pick the HIGHEST risk upcoming week ── */
    const latestPrediction = await RiskPrediction.findOne().sort({ generatedAt: -1 }).select('generatedAt');
    const windowStart = latestPrediction ? new Date(latestPrediction.generatedAt.getTime() - 6 * 60 * 60 * 1000) : new Date();

    // Get ALL predictions from the latest run, then surface the worst one for the badge
    const allFuturePredictions = await RiskPrediction.find({
      district,
      mohZone,
      generatedAt: { $gte: windowStart }
    }).sort({ predictedFor: 1 }).lean();

    // Pick the highest-risk prediction for the badge (safety-first)
    const RISK_ORDER = { high: 2, moderate: 1, low: 0 };
    const riskInfo = allFuturePredictions.length > 0
      ? allFuturePredictions.reduce((best, cur) =>
          (RISK_ORDER[cur.riskLevel] ?? 0) >= (RISK_ORDER[best.riskLevel] ?? 0) ? cur : best
        )
      : null;

    const futurePredictions = allFuturePredictions;

    const predictedTrendMap = {};
    if (futurePredictions.length > 0) {
      const lastPoint = filledData.length > 0 ? filledData[filledData.length - 1] : null;
      if (lastPoint) {
        predictedTrendMap[lastPoint.key] = {
          key: lastPoint.key,
          label: lastPoint.label,
          cases: null,
          predictedCases: lastPoint.cases,
          count: 1
        };
      }

      for (const pred of futurePredictions) {
        // Shift prediction date to logically follow the latest historical data
        const shiftedDate = new Date(now);
        shiftedDate.setDate(shiftedDate.getDate() + 7);

        let key, label;
        if (period === 'weekly') {
          key = isoWeekKey(shiftedDate);
          label = isoWeekLabel(shiftedDate);
        } else if (period === 'monthly') {
          key = `${shiftedDate.getFullYear()}-${String(shiftedDate.getMonth() + 1).padStart(2, '0')}`;
          label = shiftedDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        } else {
          key = shiftedDate.toISOString().slice(0, 10);
          label = shiftedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        if (!predictedTrendMap[key]) {
          predictedTrendMap[key] = { key, label, cases: null, predictedCases: 0, count: 0, riskLevel: pred.riskLevel };
        }
        predictedTrendMap[key].predictedCases += (pred.predictedCases || 0);
        predictedTrendMap[key].count += 1;
        // update to the highest risk level
        if (pred.riskLevel === 'high' || (pred.riskLevel === 'moderate' && predictedTrendMap[key].riskLevel !== 'high')) {
          predictedTrendMap[key].riskLevel = pred.riskLevel;
        }
      }
    }
    
    // For weekly/daily we didn't do sums usually, but this generic approach works.
    const predictedTrend = Object.values(predictedTrendMap).map(pt => ({
      key: pt.key,
      label: pt.label,
      cases: pt.cases,
      predictedCases: pt.predictedCases,
      riskLevel: pt.riskLevel
    }));

    res.json({
      success: true,
      data: { zone: mohZone, district, period, riskInfo, trend: filledData, predictedTrend },
    });
  } catch (err) {
    console.error('[getZoneTrend]', err.message);
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
