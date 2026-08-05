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

  // ── Seed DengueCase (12 months) ─────────────────────────────────────────────
  await DengueCase.deleteMany({});
  const now = new Date();
  const caseDocs = [];
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    DISTRICTS.forEach(district => {
      let count = ['Colombo', 'Gampaha'].includes(district)
        ? Math.floor(Math.random() * 151) + 50
        : ['Kandy', 'Kalutara', 'Galle', 'Kurunegala', 'Ratnapura'].includes(district)
        ? Math.floor(Math.random() * 61) + 20
        : Math.floor(Math.random() * 26) + 5;
      caseDocs.push({ district, date: monthDate, caseCount: count });
    });
  }
  await DengueCase.insertMany(caseDocs);
  console.log(`✅ Inserted ${caseDocs.length} dengue case records`);

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
