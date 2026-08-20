import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLivePredictions } from '../services/predictionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the static MOH zone index (numeric code -> { district, zoneName })
const MOH_ZONE_INDEX_PATH = path.resolve(__dirname, '../data/mohZoneIndex.json');
let MOH_ZONE_INDEX = {};
try {
  MOH_ZONE_INDEX = JSON.parse(fs.readFileSync(MOH_ZONE_INDEX_PATH, 'utf8'));
} catch (e) {
  console.error('[ChatbotController] Failed to load mohZoneIndex.json:', e.message);
}

/**
 * GET /api/chatbot/predict/:mohCode
 *
 * Accepts a numeric MOH code (1-226) or a zone name string.
 * Returns the ML model prediction for that zone:
 *   { moh_code, moh_zone, district, predicted_cases, risk_level }
 */
export const getChatbotPrediction = async (req, res) => {
  try {
    const rawCode = (req.params.mohCode || '').trim();

    let targetZone = null;
    let targetDistrict = null;

    // Numeric lookup
    if (/^\d+$/.test(rawCode)) {
      const zoneEntry = MOH_ZONE_INDEX[rawCode];
      if (zoneEntry) {
        targetZone = zoneEntry.zoneName;
        targetDistrict = zoneEntry.district;
      }
    }

    // Name-based fallback: try case-insensitive partial match
    if (!targetZone) {
      const nameLower = rawCode.toLowerCase();
      const found = Object.values(MOH_ZONE_INDEX).find(
        (z) => z.zoneName.toLowerCase() === nameLower ||
               z.zoneName.toLowerCase().includes(nameLower)
      );
      if (found) {
        targetZone = found.zoneName;
        targetDistrict = found.district;
      }
    }

    if (!targetZone) {
      return res.status(404).json({
        success: false,
        message: `MOH zone not found for code: ${rawCode}. Valid codes are 1-226 or MOH zone names.`,
      });
    }

    // Fetch live ML predictions (cached, 15-min TTL)
    const livePredictions = await getLivePredictions(targetDistrict);

    // Match the specific MOH zone
    const zonePrediction = livePredictions.find(
      (p) => p.mohZone && p.mohZone.toLowerCase() === targetZone.toLowerCase()
    );

    if (!zonePrediction) {
      // Fall back to district-level risk if a zone-specific prediction isn't available
      const districtPredictions = livePredictions.filter(
        (p) => (p.district || '').toLowerCase() === (targetDistrict || '').toLowerCase()
      );
      if (districtPredictions.length === 0) {
        return res.json({
          success: true,
          data: {
            moh_code: rawCode,
            moh_zone: targetZone,
            district: targetDistrict,
            predicted_cases: 0,
            risk_level: 'low',
            data_status: 'No prediction data available for this zone',
          },
        });
      }

      // Average from district zones
      const avgScore = districtPredictions.reduce((s, p) => s + (p.riskScore || 0), 0) / districtPredictions.length;
      const risk = avgScore >= 60 ? 'high' : avgScore >= 30 ? 'moderate' : 'low';
      const totalCases = districtPredictions.reduce((s, p) => s + (p.predictedCases || 0), 0);

      return res.json({
        success: true,
        data: {
          moh_code: rawCode,
          moh_zone: targetZone,
          district: targetDistrict,
          predicted_cases: Math.round(totalCases / districtPredictions.length),
          risk_level: risk,
          data_status: 'District-average estimate (zone-specific data unavailable)',
        },
      });
    }

    // Return real zone prediction
    return res.json({
      success: true,
      data: {
        moh_code: rawCode,
        moh_zone: zonePrediction.mohZone,
        district: zonePrediction.district,
        predicted_cases: zonePrediction.predictedCases || 0,
        risk_level: zonePrediction.riskLevel || 'low',
        risk_score: zonePrediction.riskScore || 0,
        predicted_for: zonePrediction.predictedFor,
      },
    });
  } catch (err) {
    console.error('[ChatbotController] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/chatbot/zones
 * Returns the full list of available MOH zones with their numeric codes.
 * Useful for the chatbot to list all valid area codes.
 */
export const getChatbotZoneList = async (req, res) => {
  try {
    const zones = Object.entries(MOH_ZONE_INDEX).map(([code, info]) => ({
      code: parseInt(code, 10),
      district: info.district,
      zone_name: info.zoneName,
    }));
    res.json({ success: true, data: zones, total: zones.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
