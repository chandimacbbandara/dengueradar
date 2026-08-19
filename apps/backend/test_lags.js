import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DengueCase from './src/models/DengueCase.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const cases = await DengueCase.find({ mohZone: 'Thalangama' }).sort({ date: -1 }).limit(5).lean();
  console.log("Thalangama cases in DB:", cases.length);
  
  // Distavg for colombo
  const colCases = await DengueCase.find({ district: 'Colombo' }).lean();
  const zones = new Set();
  colCases.forEach(c => zones.add(c.mohZone));
  console.log("Zones in Colombo with data:", Array.from(zones));

  process.exit(0);
}

run().catch(console.error);
