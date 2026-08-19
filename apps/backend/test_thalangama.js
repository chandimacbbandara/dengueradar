import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RiskPrediction from './src/models/RiskPrediction.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const p = await RiskPrediction.findOne({ mohZone: 'Thalangama' }).lean();
  console.log("Thalangama prediction:", p);
  process.exit(0);
}

run().catch(console.error);
