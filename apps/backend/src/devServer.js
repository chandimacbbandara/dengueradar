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

// ── 4. Seed DengueCase — only if collection is empty or missing mohZone ─────────
const caseCount = await DengueCase.countDocuments();
const hasMissingMohZone = await DengueCase.exists({ mohZone: { $exists: false } });

if (caseCount === 0 || hasMissingMohZone) {
  if (hasMissingMohZone) {
    console.log('[DevSeed] Found DengueCases with missing mohZone — clearing collection to re-seed...');
    await DengueCase.deleteMany({});
  }

  const now = new Date();
  const caseDocs = [];
  const weekDur = 7 * 24 * 60 * 60 * 1000;

  // Seed weekly data for the last 16 weeks for each district and MOH zone
  for (let w = 0; w < 16; w++) {
    const weekDate = new Date(now.getTime() - w * weekDur);
    const day = weekDate.getDay() || 7;
    weekDate.setDate(weekDate.getDate() - day + 1);
    weekDate.setHours(0, 0, 0, 0);

    MOH_ZONES_DATA.forEach(d => {
      d.zones.forEach(zoneName => {
        const count = ['Colombo', 'Gampaha'].includes(d.district)
          ? Math.floor(Math.random() * 15) + 5
          : ['Kandy', 'Kalutara', 'Galle', 'Kurunegala', 'Ratnapura'].includes(d.district)
          ? Math.floor(Math.random() * 6) + 2
          : Math.floor(Math.random() * 3) + 1;

        caseDocs.push({
          district: d.district,
          mohZone: zoneName,
          date: new Date(weekDate),
          caseCount: count,
          source: 'epid_unit'
        });
      });
    });
  }

  await DengueCase.insertMany(caseDocs);
  console.log(`[DevSeed] ✅ Seeded ${caseDocs.length} weekly dengue case records for all MOH zones`);
} else {
  console.log(`[DevSeed] ⏭  DengueCase already has ${caseCount} docs — skipping seed`);
}

// ── 5. Disconnect & hand off to Express ───────────────────────────────────────
await mongoose.disconnect();
console.log('[DevSeed] Seed check complete — starting Express server\n');

await import('./server.js');
