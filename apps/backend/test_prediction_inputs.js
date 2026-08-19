import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DengueCase from './src/models/DengueCase.js';
import { runMLPredictionsAndAlerts } from './src/services/predictionService.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Just print the recent cases for one zone to see if dates are correct
  const cases = await DengueCase.find({ mohZone: 'Dehiwala' }).sort({ date: -1 }).limit(5).lean();
  console.log("Dehiwala cases from DB:");
  for (const c of cases) {
    console.log(c.date, c.caseCount);
  }

  process.exit(0);
}

run().catch(console.error);
