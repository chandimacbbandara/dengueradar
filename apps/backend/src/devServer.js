/**
 * devServer.js — Development entry point
 * Spins up an in-process MongoDB instance via mongodb-memory-server,
 * seeds it with the full official MOH zones + risk/case data,
 * then starts the Express app.
 *
 * No external MongoDB installation needed for local development.
 * Production: set MONGO_URI in .env and use `npm start` (server.js directly).
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// ── 1. Start in-process MongoDB ───────────────────────────────────────────────
const mongod = await MongoMemoryServer.create({
  instance: { dbName: 'dengueradar' },
});
const uri = mongod.getUri();
process.env.MONGO_URI = uri;
console.log(`[DevMongo] In-process MongoDB running at ${uri}`);

// ── 2. Connect mongoose early so seed models work ────────────────────────────
await mongoose.connect(uri);

// ── 3. Load shared seed data & models ────────────────────────────────────────
const { default: MohZone }        = await import('./models/MohZone.js');
const { default: DengueCase }     = await import('./models/DengueCase.js');
const { default: RiskPrediction } = await import('./models/RiskPrediction.js');
const { default: MOH_ZONES_DATA } = await import('./data/mohZonesData.js');

const DISTRICTS = MOH_ZONES_DATA.map(d => d.district);

// ── 4. Seed MOH Zones (full official list ~354 areas) ────────────────────────
const zoneDocs = [];
MOH_ZONES_DATA.forEach(d => d.zones.forEach(z => zoneDocs.push({ district: d.district, zoneName: z })));
await MohZone.insertMany(zoneDocs);
console.log(`[DevSeed] ✅ Seeded ${zoneDocs.length} MOH zones across ${MOH_ZONES_DATA.length} districts`);

// ── 5. Seed DengueCase — 12 months of history ────────────────────────────────
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

// ── 6. Seed RiskPredictions — current week + 4 future weeks ──────────────────
const riskDocs = [];
for (let week = 0; week <= 4; week++) {
  const predictedFor = new Date(now.getTime() + week * 7 * 24 * 60 * 60 * 1000);
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
console.log(`[DevSeed] ✅ Seeded ${riskDocs.length} risk predictions (current + 4 weeks)`);

// ── 7. Disconnect & hand off to Express ──────────────────────────────────────
await mongoose.disconnect();
console.log('[DevSeed] Seed complete — handing off to Express\n');

await import('./server.js');
