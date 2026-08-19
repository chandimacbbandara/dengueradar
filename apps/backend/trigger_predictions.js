import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { runMLPredictionsAndAlerts } from './src/services/predictionService.js';
import RiskPrediction from './src/models/RiskPrediction.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Generating predictions...');
  await runMLPredictionsAndAlerts();
  console.log('Predictions generated!');
  
  // Verify what was generated
  const total = await RiskPrediction.countDocuments();
  console.log('Total predictions in DB:', total);
  
  const highRisk = await RiskPrediction.countDocuments({ riskLevel: 'high' });
  const medRisk = await RiskPrediction.countDocuments({ riskLevel: 'moderate' });
  console.log(`High Risk: ${highRisk}, Moderate Risk: ${medRisk}`);
  
  const sample = await RiskPrediction.findOne({ riskLevel: 'high' }) || await RiskPrediction.findOne({ riskLevel: 'moderate' });
  console.log('Sample high/med prediction:', sample);
  
  process.exit(0);
}

run().catch(console.error);
