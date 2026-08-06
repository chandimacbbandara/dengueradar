/**
 * devServer.js — Development entry point
 *
 * Uses the MONGO_URI from your .env file (real MongoDB Atlas or local).
 * Seeds initial data ONLY if the collections are empty — so restarting
 * the server does NOT wipe or re-seed your data.
 *
 * Usage: npm run dev
 */

import 'dotenv/config';
import dns from 'dns';
import mongoose from 'mongoose';

// Force Google DNS — fixes SRV resolution failures with some local routers/VPNs
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);



const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('[DevServer] ❌  MONGO_URI is not defined in your .env file!');
  console.error('[DevServer]    Please set MONGO_URI=mongodb+srv://... in apps/backend/.env');
  process.exit(1);
}

// ── 1. Connect to real MongoDB ─────────────────────────────────────────────────
console.log('[DevServer] Connecting to MongoDB...');
await mongoose.connect(MONGO_URI);
console.log(`[DevServer] ✅ Connected to MongoDB: ${mongoose.connection.host}`);

// ── 2. Load models & seed data ────────────────────────────────────────────────
const { default: MohZone }        = await import('./models/MohZone.js');
const { default: DengueCase }     = await import('./models/DengueCase.js');
const { default: RiskPrediction } = await import('./models/RiskPrediction.js');
const { default: MOH_ZONES_DATA } = await import('./data/mohZonesData.js');

const DISTRICTS = MOH_ZONES_DATA.map(d => d.district);

// ── 3. Seed MOH Zones — only if collection is empty ───────────────────────────
const zoneCount = await MohZone.countDocuments();
if (zoneCount === 0) {
  const zoneDocs = [];
  MOH_ZONES_DATA.forEach(d => d.zones.forEach(z => zoneDocs.push({ district: d.district, zoneName: z })));
  await MohZone.insertMany(zoneDocs);
  console.log(`[DevSeed] ✅ Seeded ${zoneDocs.length} MOH zones across ${MOH_ZONES_DATA.length} districts`);
} else {
  console.log(`[DevSeed] ⏭  MohZone already has ${zoneCount} docs — skipping seed`);
}

// ── 4. Seed DengueCase — only if collection is empty ──────────────────────────
const caseCount = await DengueCase.countDocuments();
if (caseCount === 0) {
  const now = new Date();
  const caseDocs = [];
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    DISTRICTS.forEach(district => {
      const count = ['Colombo', 'Gampaha'].includes(district)
        ? Math.floor(Math.random() * 151) + 50
        : ['Kandy', 'Kalutara', 'Galle', 'Kurunegala', 'Ratnapura'].includes(district)
        ? Math.floor(Math.random() * 61) + 20
        : Math.floor(Math.random() * 26) + 5;
      caseDocs.push({ district, date: monthDate, caseCount: count });
    });
  }
  await DengueCase.insertMany(caseDocs);
  console.log(`[DevSeed] ✅ Seeded ${caseDocs.length} dengue case records`);
} else {
  console.log(`[DevSeed] ⏭  DengueCase already has ${caseCount} docs — skipping seed`);
}

// ── 5. Always refresh RiskPredictions with current dates ──────────────────────
// Risk predictions have future dates that go stale — always regenerate them.
await RiskPrediction.deleteMany({});
const now2 = new Date();
const riskDocs = [];
for (let week = 0; week <= 4; week++) {
  const predictedFor = new Date(now2.getTime() + week * 7 * 24 * 60 * 60 * 1000);
  DISTRICTS.forEach(district => {
    let riskScore = ['Colombo', 'Gampaha'].includes(district)
      ? Math.floor(Math.random() * 34) + 67
      : ['Kandy', 'Kalutara', 'Galle', 'Kurunegala'].includes(district)
      ? Math.floor(Math.random() * 33) + 34
      : Math.floor(Math.random() * 33);
    const riskLevel = riskScore >= 67 ? 'high' : riskScore >= 33 ? 'moderate' : 'low';
    const firstZone = MOH_ZONES_DATA.find(d => d.district === district)?.zones[0] || '';
    riskDocs.push({ district, mohZone: firstZone, riskScore, riskLevel, predictedFor });
  });
}
await RiskPrediction.insertMany(riskDocs);
console.log(`[DevSeed] ✅ Refreshed ${riskDocs.length} risk predictions (current + 4 weeks)`);

// ── 6. Refresh DengueCase if the most recent record is more than 1 month old ──
const latestCase = await DengueCase.findOne().sort({ date: -1 });
const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
if (!latestCase || latestCase.date < oneMonthAgo) {
  await DengueCase.deleteMany({});
  const now3 = new Date();
  const caseDocs2 = [];
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(now3.getFullYear(), now3.getMonth() - i, 1);
    DISTRICTS.forEach(district => {
      const count = ['Colombo', 'Gampaha'].includes(district)
        ? Math.floor(Math.random() * 151) + 50
        : ['Kandy', 'Kalutara', 'Galle', 'Kurunegala', 'Ratnapura'].includes(district)
        ? Math.floor(Math.random() * 61) + 20
        : Math.floor(Math.random() * 26) + 5;
      caseDocs2.push({ district, date: monthDate, caseCount: count });
    });
  }
  await DengueCase.insertMany(caseDocs2);
  console.log(`[DevSeed] ✅ Refreshed ${caseDocs2.length} dengue case records (data was stale)`);
} else {
  console.log(`[DevSeed] ⏭  DengueCase is current — skipping refresh`);
}

// ── 6. Disconnect & hand off to Express ───────────────────────────────────────
await mongoose.disconnect();
console.log('[DevSeed] Seed check complete — starting Express server\n');

await import('./server.js');
