import Alert from '../models/Alert.js';
import DengueCase from '../models/DengueCase.js';
import User from '../models/User.js';
import { getLivePredictions } from '../services/predictionService.js';

export const getDashboard = async (req, res) => {
  try {
    const { district, mohZone, _id } = req.user;
    
    const allPredictions = await getLivePredictions(district);
    const riskInfo = allPredictions.find(p => p.mohZone === mohZone) || null;

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
  const day = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  return monday.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
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

    const MOH_ZONE_ALIASES = {
      'Bibila': 'Bibile',
      'Monaragala': 'Moneragala',
      'Bope-Poddala': 'Bope(poddala)',
      'PS Matara': 'Mc matara'
    };
    const searchZone = MOH_ZONE_ALIASES[mohZone] || mohZone;

    // Use the district's latest case to anchor the "now" date.
    // This ensures districts with differing timeline boundaries (e.g. Colombo ending in May, Kegalle in August)
    // always show their active historical windows rather than stretching into flat zero periods.
    let districtLatestCase = await DengueCase.findOne({ district }).sort({ date: -1 }).select('date');
    const now = districtLatestCase ? new Date(districtLatestCase.date) : new Date();

    /* ── Date window ── */
    let since;
    if (period === 'daily') {
      since = new Date(now);
      since.setUTCDate(since.getUTCDate() - 30);
      since.setUTCHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      since = new Date(now);
      since.setUTCDate(since.getUTCDate() - 84); // 12 weeks
      since.setUTCHours(0, 0, 0, 0);
    } else {
      since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, 1));
    }

    const matchStage = {
      district,
      date: { $gte: since },
    };

    if (mohZone) {
      matchStage.mohZone = { $regex: new RegExp(searchZone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
    }

    /* ── Aggregation pipeline per period ── */
    let pipeline;

    if (period === 'daily') {
      pipeline = [
        { $match: matchStage },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, cases: { $sum: '$caseCount' } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, key: '$_id', cases: 1 } }
      ];
    } else if (period === 'weekly') {
      pipeline = [
        { $match: matchStage },
        { $group: { _id: { year: { $isoWeekYear: '$date' }, week: { $isoWeek: '$date' } }, cases: { $sum: '$caseCount' } } },
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
        }}
      ];
    } else {
      // monthly
      pipeline = [
        { $match: matchStage },
        { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, cases: { $sum: '$caseCount' } } },
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
        }}
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
        if (dataMap[key] !== undefined) {
          filledData.push({
            key,
            label: cursor.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }),
            cases: dataMap[key]
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (period === 'weekly') {
      // Advance cursor to the Monday of its ISO week
      const startDay = cursor.getUTCDay() || 7;
      cursor.setUTCDate(cursor.getUTCDate() - startDay + 1);

      while (cursor <= now) {
        const key = isoWeekKey(cursor);
        filledData.push({
          key,
          label: isoWeekLabel(cursor),
          cases: Math.round(dataMap[key] ?? 0),
        });
        cursor.setUTCDate(cursor.getUTCDate() + 7);
      }
    } else {
      // monthly
      while (cursor <= now) {
        const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
        filledData.push({
          key,
          label: cursor.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' }),
          cases: Math.round(dataMap[key] ?? 0),
        });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }

    /* ── Current risk snapshot ── */
    const allFuturePredictionsRaw = await getLivePredictions(district);
    const zonePred = allFuturePredictionsRaw.find(p => p.mohZone === searchZone || p.mohZone === mohZone);
    const futurePredictions = zonePred ? [zonePred] : [];
    const riskInfo = zonePred || null;

    if (futurePredictions.length > 0 && filledData.length > 0) {
      // Connect the prediction line to the last historical point
      filledData[filledData.length - 1].predictedCases = filledData[filledData.length - 1].cases;
    }

    if (futurePredictions.length > 0) {
      for (const pred of futurePredictions) {
        let targetDate = pred.predictedFor ? new Date(pred.predictedFor) : new Date(now);
        
        // Ensure the prediction date is strictly in the future
        if (targetDate <= now) {
          targetDate = new Date(now);
          targetDate.setDate(targetDate.getDate() + 7);
        }

        let key, label;
        if (period === 'weekly') {
          key = isoWeekKey(targetDate);
          label = isoWeekLabel(targetDate);
        } else if (period === 'monthly') {
          key = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
          label = targetDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        } else {
          key = targetDate.toISOString().slice(0, 10);
          label = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        let existing = filledData.find(d => d.key === key);
        if (!existing) {
          existing = { key, label, cases: null, predictedCases: 0, riskLevel: pred.riskLevel };
          filledData.push(existing);
        }
        
        existing.predictedCases = (existing.predictedCases || 0) + (pred.predictedCases || 0);
        
        if (pred.riskLevel === 'high' || (pred.riskLevel === 'moderate' && existing.riskLevel !== 'high')) {
          existing.riskLevel = pred.riskLevel;
        }
      }
    }
    
    const predictedTrend = []; // Send empty since we merged everything into filledData

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
