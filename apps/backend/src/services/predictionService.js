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
const __dirname = path.dirname(__filename);

// Load static MOH demographics map generated from the CSV
const STATIC_MAP_PATH = path.resolve(__dirname, '../data/mohStaticData.json');
let MOH_DEMOGRAPHICS = {};
try {
  MOH_DEMOGRAPHICS = JSON.parse(fs.readFileSync(STATIC_MAP_PATH, 'utf8'));
} catch (e) {
  console.error('[PredictionService] Failed to load mohStaticData.json:', e.message);
}

const ML_SERVICE_URL = 'http://localhost:8000/api/predict';

/**
 * Normalises spelling differences between OpenWeather centroids and target CSVs
 */
const DISTRICT_MAP = {
  'Monaragala': 'Moneragala',
  'Moneragala': 'Moneragala'
};

/**
 * Automatically fetch inputs, call XGBoost model, save predictions,
 * and trigger email notifications to users if risk levels escalate.
 */
export async function runMLPredictionsAndAlerts() {
  try {
    console.log('[PredictionService] 🤖 Triggering ML predictions pipeline...');

    const now = new Date();
    // Clear any future predictions first to prevent duplicate accumulation
    await RiskPrediction.deleteMany({ predictedFor: { $gt: now } });

    // 1. Fetch current weather from the database
    const currentLiveWeather = await LiveWeather.find({}).lean();
    const weatherMap = Object.fromEntries(
      currentLiveWeather.map(w => [w.district, w])
    );

    // 2. Fetch distinct active MOH zones from MohZone collection (so new user areas without history are included)
    const { default: MohZone } = await import('../models/MohZone.js');
    const allMohZones = await MohZone.find({}).lean();
    
    const districtZonesMap = {};
    for (const z of allMohZones) {
      if (!districtZonesMap[z.district]) districtZonesMap[z.district] = [];
      districtZonesMap[z.district].push(z.zoneName);
    }

    // Date calculations for lags
    const weekDur = 7 * 24 * 60 * 60 * 1000;
    
    // 3. Prepare histories for iterative prediction
    // Fetch all cases from the last 12 weeks in one query
    const twelveWeeksAgo = new Date(now.getTime() - (14 * weekDur)); // buffer
    const recentCases = await DengueCase.find({ date: { $gte: twelveWeeksAgo } })
      .sort({ date: -1 })
      .lean();

    // Group by district -> zone -> cases array
    const casesByZone = {};
    for (const record of recentCases) {
      if (!casesByZone[record.district]) casesByZone[record.district] = {};
      if (!casesByZone[record.district][record.mohZone]) casesByZone[record.district][record.mohZone] = [];
      casesByZone[record.district][record.mohZone].push(record.caseCount);
    }

    const historyMap = {};

    for (const [rawDistrict, zones] of Object.entries(districtZonesMap)) {
      historyMap[rawDistrict] = {};
      for (const zone of zones) {
        const zoneCases = casesByZone[rawDistrict]?.[zone] || [];
        const historicalLags = [];
        // Extract up to 12 weeks (padded with 0 if missing)
        for (let w = 0; w < 12; w++) {
          historicalLags.push(zoneCases[w] ?? 0);
        }
        historyMap[rawDistrict][zone] = historicalLags;
      }
    }

    // 4. Iteratively predict for 8 weeks
    for (let weekOffset = 1; weekOffset <= 8; weekOffset++) {
      const targetPredictionDate = new Date(now.getTime() + weekOffset * weekDur);
      // Normalize to Monday of that week
      const day = targetPredictionDate.getDay() || 7;
      targetPredictionDate.setDate(targetPredictionDate.getDate() - day + 1);
      targetPredictionDate.setHours(0, 0, 0, 0);

      const predictionPayloads = [];

      for (const [rawDistrict, zones] of Object.entries(districtZonesMap)) {
        const mlDistrictName = DISTRICT_MAP[rawDistrict] ?? rawDistrict;
        const weather = weatherMap[rawDistrict];

        if (!weather) continue;

        for (const zone of zones) {
          const demographicKey = `${mlDistrictName}_${zone}`;
          const demo = MOH_DEMOGRAPHICS[demographicKey];

          if (!demo) continue;

          // Construct 6-lag history from the rolling history array
          const hist = historyMap[rawDistrict][zone];
          const casesHistory = [hist[0], hist[1], hist[2], hist[3], hist[7], hist[11]];

          predictionPayloads.push({
            district: rawDistrict,
            mohZone: zone,
            week_start: targetPredictionDate.toISOString().split('T')[0],
            cases_history: casesHistory,
            weather: {
              temp_avg: weather.temperature_mean ?? 27.0,
              temp_max: weather.temperature_max ?? 30.0,
              temp_min: weather.temperature_min ?? 24.0,
              humidity: weather.humidity ?? 80.0,
              rain_1w: weather.rainfall ?? 0.0,
              rain_2w: weather.rainfall * 1.8 ?? 0.0, // proxy roll
              rain_4w: weather.rainfall * 3.5 ?? 0.0  // proxy roll
            },
            population: demo[0],
            pop_density: demo[1],
            birth_rate: demo[2],
            area_km2: demo[3],
            centroid_lat: demo[4],
            centroid_lon: demo[5]
          });
        }
      }

      if (predictionPayloads.length === 0) {
        console.log(`[PredictionService] ⚠️ No active MOH zones prepared for week ${weekOffset}. Skipping.`);
        continue;
      }

      // 5. Request predictions from FastAPI ML service
      const mlResponse = await axios.post(ML_SERVICE_URL, {
        districts: predictionPayloads.map(p => ({
          district: p.district,
          week_start: p.week_start,
          cases_history: p.cases_history,
          weather: p.weather,
          population: p.population,
          pop_density: p.pop_density,
          birth_rate: p.birth_rate,
          area_km2: p.area_km2,
          centroid_lat: p.centroid_lat,
          centroid_lon: p.centroid_lon
        }))
      }, { timeout: 15_000 });

      const predictions = mlResponse.data?.predictions ?? [];
      console.log(`[PredictionService] 🤖 ML Service returned ${predictions.length} predictions for week ${weekOffset}`);

      // 6. Update RiskPrediction collection and trigger alerts on escalation
      for (let i = 0; i < predictions.length; i++) {
        const pred = predictions[i];
        const payloadContext = predictionPayloads[i];

        const riskLevel = pred.risk_level.toLowerCase(); // 'low', 'moderate', 'high'
        const normalisedRiskLevel = ['low', 'moderate', 'high'].includes(riskLevel)
          ? riskLevel
          : 'high';

        // Check for escalation ONLY for week 1 to avoid spamming alerts for future predictions
        if (weekOffset === 1) {
          const prevPred = await RiskPrediction.findOne({
            district: payloadContext.district,
            mohZone: payloadContext.mohZone
          }).sort({ predictedFor: -1 }).lean();

          const escalated = isEscalated(prevPred?.riskLevel, normalisedRiskLevel);
          if (escalated) {
            await dispatchEscalationAlerts(payloadContext.district, payloadContext.mohZone, normalisedRiskLevel);
          }
        }

        // Upsert new prediction
        await RiskPrediction.findOneAndUpdate(
          {
            district: payloadContext.district,
            mohZone: payloadContext.mohZone,
            predictedFor: targetPredictionDate
          },
          {
            $set: {
              district: payloadContext.district,
              mohZone: payloadContext.mohZone,
              riskScore: pred.risk_score,
              riskLevel: normalisedRiskLevel,
              predictedCases: pred.predicted_cases,
              predictedFor: targetPredictionDate,
              generatedAt: new Date()
            }
          },
          { upsert: true }
        );

        // Feed prediction back into history for next iteration
        historyMap[payloadContext.district][payloadContext.mohZone].unshift(pred.predicted_cases);
      }
    }

    console.log('[PredictionService] ✅ 8-Week Predictions pipeline completed successfully');
  } catch (err) {
    console.error('[PredictionService] ❌ Failed to run predictions pipeline:', err.message);
  }
}

/**
 * Returns true if risk tier escalated
 */
function isEscalated(prev, current) {
  if (!prev) return false; // first prediction, don't flood
  const order = { low: 0, moderate: 1, high: 2 };
  return order[current] > order[prev];
}

/**
 * Find all citizens and MOH officers registered in this zone, create Alert docs, and send HTML emails.
 */
async function dispatchEscalationAlerts(district, mohZone, riskLevel) {
  try {
    const users = await User.find({ district, mohZone, isVerified: true }).lean();
    if (users.length === 0) return;

    const alertDocs = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const user of users) {
      // 1. Check if user already received an alert in the last 7 days
      const recentAlert = await Alert.findOne({
        userId: user._id,
        sentAt: { $gte: sevenDaysAgo }
      }).lean();

      if (recentAlert) {
        continue; // Skip alerting this user to prevent spam
      }

      const email = user.email;
      const name = user.firstName || user.officerName || 'Member';

      // 2. Create Web alert document
      alertDocs.push({
        userId: user._id,
        district,
        mohZone,
        riskLevel,
        channel: 'web',
        message: `ALERT: The dengue risk level for ${mohZone} has escalated to ${riskLevel.toUpperCase()}. Please take immediate precautions.`,
        sentAt: new Date(),
        status: 'sent'
      });

      // 3. Send email notification matching the themed Early Warning template
      if (process.env.NODE_ENV === 'production') {
        try {
          await sendRiskAlertEmail(email, name, mohZone, riskLevel);
        } catch (emailErr) {
          console.error(`[PredictionService] Failed to send email alert to ${email}:`, emailErr.message);
        }
      }
    }

    if (alertDocs.length > 0) {
      await Alert.insertMany(alertDocs);
      console.log(`[PredictionService] 🚨 Escalation! Dispatched alerts to ${alertDocs.length} users in ${mohZone}`);
    }
  } catch (err) {
    console.error('[PredictionService] Failed to dispatch alerts:', err.message);
  }
}

/**
 * Beautiful HTML email template notifying users about risk level escalation.
 */
async function sendRiskAlertEmail(to, name, mohZone, riskLevel) {
  const nodemailer = await import('nodemailer');
  
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const levelColor = riskLevel === 'high' ? '#EF4444' : '#F59E0B';
  const levelText = riskLevel.toUpperCase();
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
                Our AI model has detected a risk level escalation in your registered zone:
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
    from: process.env.EMAIL_FROM,
    to,
    subject: `⚠️ DengueRadar Alert: Escalated Risk Level in ${mohZone}`,
    html
  });
}
