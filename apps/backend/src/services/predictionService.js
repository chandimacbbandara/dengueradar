import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import DengueCase from '../models/DengueCase.js';
import LiveWeather from '../models/LiveWeather.js';
import RiskPrediction from '../models/RiskPrediction.js';
import User from '../models/User.js';
import Alert from '../models/Alert.js';
import { sendOtpEmail } from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Load static MOH demographics map generated from the CSV
const STATIC_MAP_PATH = path.resolve(__dirname, '../data/mohStaticData.json');
let MOH_DEMOGRAPHICS = {};
try {
  MOH_DEMOGRAPHICS = JSON.parse(fs.readFileSync(STATIC_MAP_PATH, 'utf8'));
} catch (e) {
  console.error('[PredictionService] Failed to load mohStaticData.json:', e.message);
}

const ML_SERVICE_URL = 'http://127.0.0.1:8000/api/predict';

/** Normalise spelling differences between OpenWeather centroids and target CSVs */
const DISTRICT_ALIAS = {
  'Monaragala': 'Moneragala',
  'Moneragala': 'Moneragala',
};

// ── Tier thresholds from pipeline_meta (incidence per 100k, from training data)
const TIER_MIDPOINTS = { Low: 1.4, Watch: 5.3, Warning: 15.5, Alert: 50.0 };

/**
 * Convert a risk tier string to an approximate weekly case count.
 * Uses tier midpoints derived from pipeline_meta tier_thresholds.
 * @param {string} tier  "Low" | "Watch" | "Warning" | "Alert"
 * @param {number} population  MOH zone population
 */
function tierToCases(tier, population) {
  const incidence = TIER_MIDPOINTS[tier] ?? TIER_MIDPOINTS.Low;
  return Math.round((incidence / 100_000) * population);
}

/**
 * Automatically fetch inputs, call the stacking ensemble ML service,
 * save predictions, and trigger email notifications when risk escalates.
 *
 * The model predicts 1 week ahead using real observed lags and current weather.
 */
export async function runMLPredictionsAndAlerts() {
  try {
    console.log('[PredictionService] 🤖 Triggering ML predictions pipeline...');

    const now = new Date();
    // Clear any future predictions to prevent stale accumulation
    await RiskPrediction.deleteMany({ predictedFor: { $gt: now } });

    const weekDur = 7 * 24 * 60 * 60 * 1000;

    // 1. Fetch current weather from the database
    const currentLiveWeather = await LiveWeather.find({}).lean();
    const weatherMap = Object.fromEntries(currentLiveWeather.map(w => [w.district, w]));

    // 2. Fetch all active MOH zones
    const { default: MohZone } = await import('../models/MohZone.js');
    const allMohZones = await MohZone.find({}).lean();

    const districtZonesMap = {};
    for (const z of allMohZones) {
      if (!districtZonesMap[z.district]) districtZonesMap[z.district] = [];
      districtZonesMap[z.district].push(z.zoneName);
    }

    // 3. Fetch historical cases (last 52 weeks to support all lags)
    const fiftyThreeWeeksAgo = new Date(now.getTime() - 54 * weekDur);
    const recentCases = await DengueCase.find({ date: { $gte: fiftyThreeWeeksAgo } })
      .sort({ date: -1 })
      .lean();

    // Group: district → zone → sorted array of {date, caseCount}
    const casesByZone = {};
    for (const record of recentCases) {
      if (!casesByZone[record.district]) casesByZone[record.district] = {};
      if (!casesByZone[record.district][record.mohZone])
        casesByZone[record.district][record.mohZone] = [];
      casesByZone[record.district][record.mohZone].push({
        date: new Date(record.date),
        count: record.caseCount ?? 0,
      });
    }

    // Sort each zone's history newest-first
    for (const district of Object.keys(casesByZone)) {
      for (const zone of Object.keys(casesByZone[district])) {
        casesByZone[district][zone].sort((a, b) => b.date - a.date);
      }
    }

    /**
     * Extract lag arrays for a given zone from casesByZone.
     * Returns {
     *   caseLags:      [lag1..lag52] (9 values: indices 0,1,2,3,4,7,11,25,51)
     *   incLags:       [lag1,lag2,lag4,lag8] (4 values)
     *   weeksSinceOutbreak
     * }
     */
    function extractLags(district, zone, population) {
      const records = casesByZone[district]?.[zone] ?? [];
      const get = (i) => records[i]?.count ?? 0;

      const caseLags = [
        get(0),  // lag1
        get(1),  // lag2
        get(2),  // lag3
        get(3),  // lag4
        get(4),  // lag5
        get(7),  // lag8
        get(11), // lag12
        get(25), // lag26
        get(51), // lag52
      ];

      const incLags = [
        population > 0 ? (get(0) / population) * 100_000 : 0,  // lag1
        population > 0 ? (get(1) / population) * 100_000 : 0,  // lag2
        population > 0 ? (get(3) / population) * 100_000 : 0,  // lag4
        population > 0 ? (get(7) / population) * 100_000 : 0,  // lag8
      ];

      // weeks since last outbreak (cases > 20)
      let weeksSince = 0;
      let found = false;
      for (let i = 0; i < records.length; i++) {
        if (records[i].count > 20) { weeksSince = i; found = true; break; }
      }
      if (!found) weeksSince = 52;
      weeksSince = Math.min(weeksSince, 52);

      return { caseLags, incLags, weeksSince };
    }

    // 4. Compute district-level aggregates for lag1/lag2/lag4 and rolling windows
    //    We build these once from the current state of casesByZone.
    function buildDistrictStats(rawDistrict, zones, casesByZone) {
      // For each zone, grab lag1 value
      const lag1Vals = zones.map(z => casesByZone[rawDistrict]?.[z]?.[0]?.count ?? 0);
      const lag2Vals = zones.map(z => casesByZone[rawDistrict]?.[z]?.[1]?.count ?? 0);
      const lag4Vals = zones.map(z => casesByZone[rawDistrict]?.[z]?.[3]?.count ?? 0);

      const total1 = lag1Vals.reduce((a, b) => a + b, 0);
      const total2 = lag2Vals.reduce((a, b) => a + b, 0);
      const total4 = lag4Vals.reduce((a, b) => a + b, 0);
      const mean1  = lag1Vals.length > 0 ? total1 / lag1Vals.length : 0;
      const max1   = lag1Vals.length > 0 ? Math.max(...lag1Vals) : 0;

      // Rolling 4-week and 12-week district totals (sum across all zones, avg over weeks)
      const roll4Totals  = [];
      const roll12Totals = [];
      for (let w = 0; w < 4;  w++) roll4Totals.push(zones.reduce((s, z) => s + (casesByZone[rawDistrict]?.[z]?.[w]?.count ?? 0), 0));
      for (let w = 0; w < 12; w++) roll12Totals.push(zones.reduce((s, z) => s + (casesByZone[rawDistrict]?.[z]?.[w]?.count ?? 0), 0));

      const roll4Mean  = roll4Totals.reduce((a, b) => a + b, 0) / Math.max(roll4Totals.length, 1);
      const roll12Mean = roll12Totals.reduce((a, b) => a + b, 0) / Math.max(roll12Totals.length, 1);

      return {
        // Per-zone stats will be derived from this; we return district-level totals.
        total1, total2, total4, mean1, max1, roll4Mean, roll12Mean,
        lag1Vals, // used for rank/zscore computation
      };
    }

    // Build district stats once for week 1
    const districtStatsCache = {};
    for (const [rawDistrict, zones] of Object.entries(districtZonesMap)) {
      districtStatsCache[rawDistrict] = buildDistrictStats(rawDistrict, zones, casesByZone);
    }

    /**
     * Build district_stats array for a specific zone.
     * [total_lag1, total_lag2, total_lag4, mean_lag1, max_lag1,
     *  total_roll4, total_roll12, rank_lag1, zscore_lag1]
     */
    function getDistrictStatsArray(rawDistrict, zone, dsCache) {
      const ds = dsCache[rawDistrict];
      if (!ds) return Array(9).fill(0);
      const lag1Vals = ds.lag1Vals;
      const zoneIdx  = (districtZonesMap[rawDistrict] ?? []).indexOf(zone);
      const zoneVal  = zoneIdx >= 0 ? (lag1Vals[zoneIdx] ?? 0) : 0;

      // Percentile rank within district
      const below = lag1Vals.filter(v => v < zoneVal).length;
      const rank  = lag1Vals.length > 1 ? below / (lag1Vals.length - 1) : 0.5;

      // Z-score within district
      const mean = ds.mean1;
      const std  = Math.sqrt(lag1Vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(lag1Vals.length, 1));
      const zscore = std > 1e-3 ? (zoneVal - mean) / (std + 1e-3) : 0;

      return [
        ds.total1, ds.total2, ds.total4,
        ds.mean1, ds.max1,
        ds.roll4Mean, ds.roll12Mean,
        rank, zscore,
      ];
    }

    // ── Single 1-week prediction ──────────────────────────────────────────────
    const targetDate = new Date(now.getTime() + weekDur);
    // Normalize to Monday
    const day = targetDate.getDay() || 7;
    targetDate.setDate(targetDate.getDate() - day + 1);
    targetDate.setHours(0, 0, 0, 0);
    const weekStartStr = targetDate.toISOString().split('T')[0];

    const mohPayloads = [];
    const payloadMeta = [];  // parallel array: { rawDistrict, zone, population }

    for (const [rawDistrict, zones] of Object.entries(districtZonesMap)) {
      const mlDistrictName = DISTRICT_ALIAS[rawDistrict] ?? rawDistrict;
      const weather        = weatherMap[rawDistrict];
      if (!weather) continue;

      for (const zone of zones) {
        const demographicKey = `${mlDistrictName}_${zone}`;
        let demo = MOH_DEMOGRAPHICS[demographicKey];
        
        if (!demo) {
          // Check specific known aliases
          if (mlDistrictName === 'Mullaitivu') {
            if (zone === 'Puthukkudiyiruppu') demo = MOH_DEMOGRAPHICS['Mullaitivu_Puthukudiyiruppu'];
            if (zone === 'Thunukkai') demo = MOH_DEMOGRAPHICS['Mullaitivu_Thunukkai(mallavi)'];
          }
        }

        if (!demo) {
          // Fallback to district average
          const districtDemos = Object.entries(MOH_DEMOGRAPHICS)
            .filter(([k, v]) => k.startsWith(`${mlDistrictName}_`))
            .map(([k, v]) => v);
          
          if (districtDemos.length > 0) {
            const avgPop = districtDemos.reduce((sum, d) => sum + d[0], 0) / districtDemos.length;
            const avgDens = districtDemos.reduce((sum, d) => sum + d[1], 0) / districtDemos.length;
            demo = [avgPop, avgDens];
          } else {
            demo = [50000, 500]; // Absolute fallback
          }
        }

        const [population, pop_density] = demo;

        // Use real observed lags from the database
        const extracted   = extractLags(rawDistrict, zone, population);
        const districtStats = getDistrictStatsArray(rawDistrict, zone, districtStatsCache);

        // Build weather inputs from current live weather
        const weatherInputs = {
          temp_avg:     weather.temperature_mean ?? 27.0,
          temp_max:     weather.temperature_max  ?? 30.0,
          temp_min:     weather.temperature_min  ?? 24.0,
          temp_avg_4w:  weather.temp_avg_4w  ?? weather.temperature_mean ?? 27.0,
          humidity:     weather.humidity     ?? 80.0,
          humidity_4w:  weather.humidity_4w  ?? weather.humidity ?? 80.0,
          rain_1w:      weather.rainfall     ?? 0.0,
          rain_2w:      weather.rain_2w      ?? (weather.rainfall ?? 0) * 1.8,
          rain_4w:      weather.rain_4w      ?? (weather.rainfall ?? 0) * 3.5,
        };

        mohPayloads.push({
          moh_name:              zone,
          district:              mlDistrictName,
          week_start:            weekStartStr,
          cases_lags:            extracted.caseLags,
          incidence_lags:        extracted.incLags,
          district_stats:        districtStats,
          weeks_since_outbreak:  extracted.weeksSince,
          weather:               weatherInputs,
          population,
          pop_density,
        });

        payloadMeta.push({ rawDistrict, zone, population });
      }
    }

    if (mohPayloads.length === 0) {
      console.log('[PredictionService] ⚠️  No MOH zones found. Skipping prediction.');
      return;
    }

    // 5. Call the ML service
    let predictions = [];
    try {
      const mlResponse = await axios.post(
        ML_SERVICE_URL,
        { mohs: mohPayloads },
        { timeout: 30_000 }
      );
      predictions = mlResponse.data?.predictions ?? [];
      console.log(`[PredictionService] 🤖 ML returned ${predictions.length} predictions`);
    } catch (axiosErr) {
      console.error('[PredictionService] ❌ ML service call failed:', axiosErr.message);
      return;
    }

    // 6. Persist predictions + trigger escalation alerts
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      const meta = payloadMeta[i];

      const riskLevel = pred.risk_level;   // "low" | "moderate" | "high"
      const predCases = pred.predicted_cases ?? tierToCases(pred.predicted_tier, meta.population);

      // Check if risk has escalated compared to the previous prediction
      const prevPred = await RiskPrediction.findOne({
        district: meta.rawDistrict,
        mohZone:  meta.zone,
      }).sort({ predictedFor: -1 }).lean();

      if (isEscalated(prevPred?.riskLevel, riskLevel)) {
        await dispatchEscalationAlerts(meta.rawDistrict, meta.zone, riskLevel);
      }

      // Upsert prediction document
      await RiskPrediction.findOneAndUpdate(
        {
          district:     meta.rawDistrict,
          mohZone:      meta.zone,
          predictedFor: targetDate,
        },
        {
          $set: {
            district:       meta.rawDistrict,
            mohZone:        meta.zone,
            riskScore:      pred.risk_score,
            riskLevel,
            predictedCases: predCases,
            predictedFor:   targetDate,
            generatedAt:    new Date(),
            predictedTier:  pred.predicted_tier,
            pLow:           pred.p_low,
            pWatch:         pred.p_watch,
            pWarning:       pred.p_warning,
            pAlert:         pred.p_alert,
            alertHighConfidence: pred.alert_high_confidence,
            modelVersion:   'v2-stacking',
          }
        },
        { upsert: true }
      );
    }

    console.log('[PredictionService] ✅ 1-week prediction pipeline completed successfully');
  } catch (err) {
    console.error('[PredictionService] ❌ Pipeline error:', err.message, err.stack);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the current risk tier is higher than the previous */
function isEscalated(prev, current) {
  if (!prev) return false;
  const order = { low: 0, moderate: 1, high: 2 };
  return (order[current] ?? 0) > (order[prev] ?? 0);
}

/**
 * Find all citizens/MOH officers in the zone, create Alert docs, and send HTML emails.
 */
async function dispatchEscalationAlerts(district, mohZone, riskLevel) {
  try {
    const users = await User.find({ district, mohZone, isVerified: true }).lean();
    if (users.length === 0) return;

    const alertDocs       = [];
    const sevenDaysAgo    = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const user of users) {
      const recentAlert = await Alert.findOne({
        userId: user._id,
        sentAt: { $gte: sevenDaysAgo },
      }).lean();

      if (recentAlert) continue;

      const email = user.email;
      const name  = user.firstName || user.officerName || 'Member';

      alertDocs.push({
        userId:   user._id,
        district,
        mohZone,
        riskLevel,
        channel:  'web',
        message:  `ALERT: The dengue risk level for ${mohZone} has escalated to ${riskLevel.toUpperCase()}. Please take immediate precautions.`,
        sentAt:   new Date(),
        status:   'sent',
      });

      if (process.env.NODE_ENV === 'production') {
        try {
          await sendRiskAlertEmail(email, name, mohZone, riskLevel, 'escalation');
        } catch (emailErr) {
          console.error(`[PredictionService] Failed to send email to ${email}:`, emailErr.message);
        }
      }
    }

    if (alertDocs.length > 0) {
      await Alert.insertMany(alertDocs);
      console.log(`[PredictionService] 🚨 Escalation! Dispatched ${alertDocs.length} alerts in ${mohZone}`);
    }
  } catch (err) {
    console.error('[PredictionService] Failed to dispatch alerts:', err.message);
  }
}

/**
 * Beautiful HTML email notifying users about risk level escalation, weekly high risk, or manual MOH alerts.
 */
export async function sendRiskAlertEmail(to, name, mohZone, riskLevel, alertType = 'escalation') {
  const nodemailer = await import('nodemailer');

  const isGmail = process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('gmail');
  
  let transporter;
  if (isGmail) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    const port = parseInt(process.env.EMAIL_PORT) || 587;
    transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   port,
      secure: port === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  const levelColor  = riskLevel === 'high' ? '#EF4444' : '#F59E0B';
  const levelText   = riskLevel.toUpperCase();
  const warningIcon = riskLevel === 'high' ? '🚨' : '⚠️';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DengueRadar Risk Alert</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-top: 6px solid ${levelColor};">
          <tr>
            <td style="background-color: #0d1f3c; padding: 30px; text-align: center; color: #ffffff;">
              <span style="font-size: 40px; display: block; margin-bottom: 10px;">${warningIcon}</span>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">DENGUE RISK WARNING</h1>
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #0EA5A5; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Early Warning System</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; color: #334155;">
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello ${name},</p>
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                ${alertType === 'manual' 
                  ? 'Your local Medical Officer of Health (MOH) has issued an official alert for your zone:' 
                  : alertType === 'weekly' 
                    ? 'Our AI model indicates that your registered zone is currently at a HIGH risk level:' 
                    : 'Our AI model has detected a risk level escalation in your registered zone:'}
              </p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
                <p style="margin: 0 0 5px 0; font-size: 13px; color: #64748B; text-transform: uppercase; font-weight: 700;">Zone Affected</p>
                <p style="margin: 0 0 15px 0; font-size: 18px; color: #0F172A; font-weight: 800;">📍 ${mohZone}</p>
                <span style="display: inline-block; padding: 8px 20px; border-radius: 20px; background-color: ${levelColor}15; color: ${levelColor}; font-weight: 800; font-size: 15px; border: 1px solid ${levelColor}30;">
                  ${levelText} RISK LEVEL
                </span>
              </div>

              <h3 style="color: #0d1f3c; margin: 0 0 15px 0; font-size: 16px;">⚠️ Recommended Actions:</h3>
              <ul style="padding-left: 20px; margin: 0 0 30px 0; font-size: 15px; color: #475569; line-height: 1.8;">
                <li>Search and eliminate mosquito breeding sites in and around your premises.</li>
                <li>Ensure all water containers are covered tightly.</li>
                <li>Wear long-sleeved clothing to reduce skin exposure.</li>
                <li>Use mosquito nets and repellents.</li>
              </ul>

              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 0;">
                Please log in to your <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="color: #0EA5A5; text-decoration: none; font-weight: bold;">DengueRadar Dashboard</a> to see detailed trend data.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0d1f3c; padding: 20px; text-align: center; color: rgba(255,255,255,0.4); font-size: 11px;">
              DengueRadar Sri Lanka · Ministry of Health. This is an automated message.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to,
    subject: `⚠️ DengueRadar Alert: Escalated Risk Level in ${mohZone}`,
    html,
  });
}
