import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const RiskPrediction = mongoose.model('RiskPrediction', new mongoose.Schema({ district: String, mohZone: String, riskLevel: String, riskScore: Number, predictedCases: Number }), 'riskpredictions');
async function run() {
  const data = await RiskPrediction.findOne({ _id: '6a7c10c430b67d6e9966d306' });
  console.log(data);
  process.exit();
}
run();
