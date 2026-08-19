import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getLivePredictions } from './src/services/predictionService.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const preds = await getLivePredictions('Colombo');
    console.log(`Returned ${preds.length} predictions for Colombo.`);
    if (preds.length > 0) {
      const mc = preds.find(p => p.mohZone === 'Mc colombo');
      console.log('MC Colombo prediction:');
      console.log(mc);
    }
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
