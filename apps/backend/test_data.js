import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DengueCase from './src/models/DengueCase.js';
import RiskPrediction from './src/models/RiskPrediction.js';
import MohZone from './src/models/MohZone.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dengueradar', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  const zone = 'Lunugamwehera';
  const cases = await DengueCase.find({ mohZone: zone }).sort({ date: -1 }).limit(10).lean();
  console.log('Recent cases for', zone);
  for (const c of cases) {
    console.log(c.date, c.caseCount);
  }
  
  const preds = await RiskPrediction.find({ mohZone: zone }).sort({ generatedAt: -1 }).limit(2).lean();
  console.log('\nPredictions for', zone);
  for (const p of preds) {
    console.log(p.predictedFor, p.predictedCases, p.riskLevel, p.riskScore);
  }

  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
