import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import DengueCase from '../models/DengueCase.js';
import LiveWeather from '../models/LiveWeather.js';
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

const DISTRICT_ALIAS = {
  'Monaragala': 'Moneragala',
  'Moneragala': 'Moneragala',
};

const TIER_MIDPOINTS = { Low: 1.4, Watch: 5.3, Warning: 15.5, Alert: 50.0 };

function tierToCases(tier, population) {
  const incidence = TIER_MIDPOINTS[tier] ?? TIER_MIDPOINTS.Low;
  return Math.round((incidence / 100_000) * population);
}

let liveCache = { timestamp: 0, predictions: [] };
const CACHE_TTL = 15 * 60 * 1000;

export async function getLivePredictions(districtFilter = null) {
  try {
    if (Date.now() - liveCache.timestamp < CACHE_TTL && liveCache.predictions.length > 0) {
      if (districtFilter) return liveCache.predictions.filter(p => p.district === districtFilter);
      return liveCache.predictions;
    }

    console.log('[PredictionService] 🤖 Generating LIVE predictions on-the-fly...');

    const maxDates = await DengueCase.aggregate([
      { $group: { _id: '$district', maxDate: { $max: '$date' } } }
    ]);
    const districtLatestDates = {};
    for (const d of maxDates) districtLatestDates[d._id] = new Date(d.maxDate);

    const globalLatestRecord = await DengueCase.findOne().sort({ date: -1 }).lean();
    const globalNow = globalLatestRecord ? new Date(globalLatestRecord.date) : new Date();

    const weekDur = 7 * 24 * 60 * 60 * 1000;
    
    // Explicitly target August 24, 2026 for the model
    const targetDateStr = '2026-08-24T00:00:00.000Z';
    const targetDateObj = new Date(targetDateStr);

    const currentLiveWeather = await LiveWeather.find({}).lean();
    const weatherMap = Object.fromEntries(currentLiveWeather.map(w => [w.district, w]));

    const { default: MohZone } = await import('../models/MohZone.js');
    const allMohZones = await MohZone.find({}).lean();

    const districtZonesMap = {};
    for (const z of allMohZones) {
      if (!districtZonesMap[z.district]) districtZonesMap[z.district] = [];
      districtZonesMap[z.district].push(z.zoneName);
    }

    const fiftyThreeWeeksAgo = new Date(globalNow.getTime() - 54 * weekDur);
    const recentCases = await DengueCase.find({ date: { $gte: fiftyThreeWeeksAgo } })
      .sort({ date: -1 })
      .lean();

    const casesByZone = {};
    for (const record of recentCases) {
      if (!casesByZone[record.district]) casesByZone[record.district] = {};
      if (!casesByZone[record.district][record.mohZone]) casesByZone[record.district][record.mohZone] = {};
      
      const d = new Date(record.date);
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() - dayNum + 1);
      const key = d.toISOString().split('T')[0];
      
      casesByZone[record.district][record.mohZone][key] = record.caseCount ?? 0;
    }

    function getAnchorDate(district) {
      return districtLatestDates[district] || globalNow;
    }

    function extractLags(district, zone, population) {
      const anchorDate = getAnchorDate(district);
      const zoneMap = casesByZone[district]?.[zone];
      const hasZoneData = zoneMap && Object.keys(zoneMap).length > 0;
      
      const getLagCount = (lagWeeks) => {
        const d = new Date(anchorDate.getTime() - (lagWeeks - 1) * weekDur);
        const key = d.toISOString().split('T')[0];
        return hasZoneData ? (zoneMap[key] ?? 0) : 0;
      };

      const caseLags = [
        getLagCount(1), getLagCount(2), getLagCount(3), getLagCount(4), getLagCount(5),
        getLagCount(8), getLagCount(12), getLagCount(26), getLagCount(52),
      ];

      const incLags = [
        population > 0 ? (getLagCount(1) / population) * 100_000 : 0,
        population > 0 ? (getLagCount(2) / population) * 100_000 : 0,
        population > 0 ? (getLagCount(4) / population) * 100_000 : 0,
        population > 0 ? (getLagCount(8) / population) * 100_000 : 0,
      ];

      let weeksSince = 52;
      for (let w = 1; w <= 52; w++) {
        if (getLagCount(w) > 20) { weeksSince = w - 1; break; }
      }

      return { caseLags, incLags, weeksSince };
    }

    function buildDistrictStats(rawDistrict, zones, casesByZone) {
      const anchorDate = getAnchorDate(rawDistrict);
      const getLagStr = (lagWeeks) => {
        const d = new Date(anchorDate.getTime() - (lagWeeks - 1) * weekDur);
        return d.toISOString().split('T')[0];
      };
      
      const lag1Str = getLagStr(1);
      const lag2Str = getLagStr(2);
      const lag4Str = getLagStr(4);

      const lag1Vals = zones.map(z => { const zm = casesByZone[rawDistrict]?.[z]; return zm ? (zm[lag1Str] ?? 0) : 0; });
      const lag2Vals = zones.map(z => { const zm = casesByZone[rawDistrict]?.[z]; return zm ? (zm[lag2Str] ?? 0) : 0; });
      const lag4Vals = zones.map(z => { const zm = casesByZone[rawDistrict]?.[z]; return zm ? (zm[lag4Str] ?? 0) : 0; });

      const total1 = lag1Vals.reduce((a, b) => a + b, 0);
      const total2 = lag2Vals.reduce((a, b) => a + b, 0);
      const total4 = lag4Vals.reduce((a, b) => a + b, 0);
      const mean1  = lag1Vals.length > 0 ? total1 / lag1Vals.length : 0;
      const max1   = lag1Vals.length > 0 ? Math.max(...lag1Vals) : 0;

      const roll4Totals  = [];
      const roll12Totals = [];
      for (let w = 1; w <= 4;  w++) {
        const str = getLagStr(w);
        roll4Totals.push(zones.reduce((s, z) => { const zm = casesByZone[rawDistrict]?.[z]; return s + (zm ? (zm[str] ?? 0) : 0); }, 0));
      }
      for (let w = 1; w <= 12; w++) {
        const str = getLagStr(w);
        roll12Totals.push(zones.reduce((s, z) => { const zm = casesByZone[rawDistrict]?.[z]; return s + (zm ? (zm[str] ?? 0) : 0); }, 0));
      }

      const roll4Mean  = roll4Totals.reduce((a, b) => a + b, 0) / Math.max(roll4Totals.length, 1);
      const roll12Mean = roll12Totals.reduce((a, b) => a + b, 0) / Math.max(roll12Totals.length, 1);

      return { total1, total2, total4, mean1, max1, roll4Mean, roll12Mean, lag1Vals };
    }

    const districtStatsCache = {};
    for (const [rawDistrict, zones] of Object.entries(districtZonesMap)) {
      districtStatsCache[rawDistrict] = buildDistrictStats(rawDistrict, zones, casesByZone);
    }

    function getDistrictStatsArray(rawDistrict, zone, dsCache) {
      const ds = dsCache[rawDistrict];
      if (!ds) return Array(9).fill(0);
      const lag1Vals = ds.lag1Vals;
      const zoneIdx  = (districtZonesMap[rawDistrict] ?? []).indexOf(zone);
      const zoneVal  = zoneIdx >= 0 ? (lag1Vals[zoneIdx] ?? 0) : 0;

      const below = lag1Vals.filter(v => v < zoneVal).length;
      const rank  = lag1Vals.length > 1 ? below / (lag1Vals.length - 1) : 0.5;

      const mean = ds.mean1;
      const std  = Math.sqrt(lag1Vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(lag1Vals.length, 1));
      const zscore = std > 1e-3 ? (zoneVal - mean) / (std + 1e-3) : 0;

      return [ds.total1, ds.total2, ds.total4, ds.mean1, ds.max1, ds.roll4Mean, ds.roll12Mean, rank, zscore];
    }

    const mohPayloads = [];
    const payloadMeta = [];

    for (const [rawDistrict, zones] of Object.entries(districtZonesMap)) {
      const mlDistrictName = DISTRICT_ALIAS[rawDistrict] ?? rawDistrict;
      const weather        = weatherMap[rawDistrict];
      if (!weather) continue;

      for (const zone of zones) {
        let demo = MOH_DEMOGRAPHICS[`${mlDistrictName}_${zone}`];
        if (!demo && mlDistrictName === 'Mullaitivu') {
          if (zone === 'Puthukkudiyiruppu') demo = MOH_DEMOGRAPHICS['Mullaitivu_Puthukudiyiruppu'];
          if (zone === 'Thunukkai') demo = MOH_DEMOGRAPHICS['Mullaitivu_Thunukkai(mallavi)'];
        }
        if (!demo) demo = [50000, 500];

        const [population, pop_density] = demo;
        const extracted = extractLags(rawDistrict, zone, population);
        const districtStats = getDistrictStatsArray(rawDistrict, zone, districtStatsCache);

        const weatherInputs = {
          temp_avg:     weather.temperature_mean ?? 27.0,
          temp_max:     weather.temperature_max  ?? 30.0,
          temp_min:     weather.temperature_min  ?? 24.0,
          temp_avg_4w:  weather.temp_avg_4w      ?? weather.temperature_mean ?? 27.0,
          humidity:     weather.humidity          ?? 80.0,
          humidity_4w:  weather.humidity_4w       ?? weather.humidity ?? 80.0,
          rain_1w:      weather.rain_1w           ?? 0.0,
          rain_2w:      weather.rain_2w           ?? 0.0,
          rain_4w:      weather.rain_4w           ?? 0.0,
        };

        mohPayloads.push({
          moh_name:              zone,
          district:              mlDistrictName,
          week_start:            targetDateStr.split('T')[0],
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

    if (mohPayloads.length === 0) return [];

    const mlResponse = await axios.post(ML_SERVICE_URL, { mohs: mohPayloads }, { timeout: 30_000 });
    const rawPredictions = mlResponse.data?.predictions ?? [];
    
    const formattedPredictions = rawPredictions.map((pred, i) => {
      const meta = payloadMeta[i];
      const riskLevel = pred.risk_level;
      const predCases = pred.predicted_cases ?? tierToCases(pred.predicted_tier, meta.population);
      return {
        district: meta.rawDistrict,
        mohZone: meta.zone,
        riskScore: pred.risk_score,
        riskLevel,
        predictedCases: predCases,
        predictedFor: targetDateObj,
        generatedAt: new Date(),
        predictedTier: pred.predicted_tier,
        pLow: pred.p_low,
        pWatch: pred.p_watch,
        pWarning: pred.p_warning,
        pAlert: pred.p_alert,
      };
    });

    liveCache.predictions = formattedPredictions;
    liveCache.timestamp = Date.now();

    if (districtFilter) return formattedPredictions.filter(p => p.district === districtFilter);
    return formattedPredictions;

  } catch (err) {
    console.error('[PredictionService] ❌ Live Pipeline error:', err.message);
    return [];
  }
}

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
