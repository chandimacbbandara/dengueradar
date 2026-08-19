/**
 * seedDengueCases.js
 *
 * Reads the real dengue dataset from the ml-pipeline raw CSV and
 * bulk-upserts every weekly MOH-zone record into the DengueCase collection.
 *
 * CSV columns used:
 *   district    → district
 *   moh_name    → mohZone
 *   week_start  → date  (ISO date string, start of ISO week)
 *   cases       → caseCount
 *
 * Run from the backend root:
 *   node src/seeds/seedDengueCases.js
 */

import 'dotenv/config';
import fs   from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import mongoose from 'mongoose';
import DengueCase from '../models/DengueCase.js';

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.resolve(__dirname, '../../../../ml-pipeline/data/raw/dengueradar_training_table.csv');

/**
 * The CSV spells one district differently from the rest of the app.
 * Map CSV spelling → canonical app spelling so joins work everywhere.
 */
const DISTRICT_NORMALISE = {
  'Moneragala': 'Monaragala',
};

/* ─── CSV parser (streaming, no external deps) ──────────────────── */
async function* readCSV(filePath) {
  const rl = createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let headers = null;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    if (!headers) { headers = cols; continue; }
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (cols[i] ?? '').trim(); });
    yield row;
  }
}

/* ─── Main ──────────────────────────────────────────────────────── */
async function run() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV not found at: ${CSV_PATH}`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected');

  // Clear old dummy data
  const deleted = await DengueCase.deleteMany({});
  console.log(`🗑  Cleared ${deleted.deletedCount} existing DengueCase documents`);

  const BATCH_SIZE = 500;
  let batch   = [];
  let total   = 0;
  let skipped = 0;

  for await (const row of readCSV(CSV_PATH)) {
    const cases = parseInt(row.cases, 10);

    // Skip rows with missing/invalid case count
    if (isNaN(cases) || !row.week_start || !row.district || !row.moh_name) {
      skipped++;
      continue;
    }

    // Normalise district spelling to match the rest of the app
    const district = DISTRICT_NORMALISE[row.district] ?? row.district;

    batch.push({
      updateOne: {
        filter: {
          district,
          mohZone: row.moh_name,
          date:    new Date(row.week_start),
        },
        update: {
          $set: {
            district,
            mohZone:   row.moh_name,
            date:      new Date(row.week_start),
            caseCount: cases,
            source:    'epid_unit_csv',
          },
        },
        upsert: true,
      },
    });

    if (batch.length >= BATCH_SIZE) {
      await DengueCase.bulkWrite(batch, { ordered: false });
      total += batch.length;
      process.stdout.write(`\r  Imported ${total.toLocaleString()} records...`);
      batch = [];
    }
  }

  // Flush remaining
  if (batch.length) {
    await DengueCase.bulkWrite(batch, { ordered: false });
    total += batch.length;
  }

  console.log(`\n✅ Done — ${total.toLocaleString()} records imported (${skipped} skipped)`);
  console.log(`   Date range: 2013-12-28 → 2026-05-11`);
  console.log(`   Districts: 25 | MOH zones: real EPID unit zones`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Import failed:', err.message);
  process.exit(1);
});
