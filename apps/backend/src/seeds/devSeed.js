/**
 * devSeed.js — Development seed runner
 * Starts mongodb-memory-server, seeds all collections, then exits.
 * Used to verify seed logic without a real MongoDB installation.
 *
 * For a persistent DB: set MONGO_URI and run:
 *   node src/seeds/seedMohZones.js && node src/seeds/seedRiskData.js
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import MohZone from '../models/MohZone.js';
import DengueCase from '../models/DengueCase.js';
import RiskPrediction from '../models/RiskPrediction.js';
import MOH_ZONES_DATA from '../data/mohZonesData.js';

const DISTRICTS = MOH_ZONES_DATA.map(d => d.district);

const run = async () => {
  const mongod = await MongoMemoryServer.create({ instance: { dbName: 'dengueradar' } });
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('Connected to in-process MongoDB');

  // ── Seed MOH Zones ──────────────────────────────────────────────────────────
  await MohZone.deleteMany({});
  const zoneDocs = [];
  MOH_ZONES_DATA.forEach(d => d.zones.forEach(z => zoneDocs.push({ district: d.district, zoneName: z })));
  await MohZone.insertMany(zoneDocs);
  console.log(`✅ Inserted ${zoneDocs.length} MOH zones across ${MOH_ZONES_DATA.length} districts`);

  // ── Seed DengueCase (16 weeks) ─────────────────────────────────────────────
  await DengueCase.deleteMany({});
  const now = new Date();
  const caseDocs = [];
  const weekDur = 7 * 24 * 60 * 60 * 1000;

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
  console.log(`✅ Inserted ${caseDocs.length} weekly dengue case records for all MOH zones`);

  // ── Seed RiskPrediction ─────────────────────────────────────────────────────
  await RiskPrediction.deleteMany({});
  const riskDocs = DISTRICTS.map(district => {
    let riskScore = ['Colombo', 'Gampaha'].includes(district)
      ? Math.floor(Math.random() * 34) + 67
      : ['Kandy', 'Kalutara', 'Galle'].includes(district)
      ? Math.floor(Math.random() * 33) + 34
      : Math.floor(Math.random() * 33);
    const riskLevel = riskScore >= 67 ? 'high' : riskScore >= 33 ? 'moderate' : 'low';
    return { district, riskScore, riskLevel, predictedFor: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) };
  });
  await RiskPrediction.insertMany(riskDocs);
  console.log(`✅ Inserted ${riskDocs.length} risk predictions`);

  await mongoose.disconnect();
  await mongod.stop();
  console.log('\n🌱 Seed verification complete.');
  console.log('ℹ️  For a persistent DB, set MONGO_URI and run: npm run seed:all\n');
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });
