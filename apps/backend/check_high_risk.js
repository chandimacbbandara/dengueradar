import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const RiskPrediction = mongoose.model('RiskPrediction', new mongoose.Schema({ district: String, mohZone: String, riskLevel: String, riskScore: Number, predictedCases: Number }), 'riskpredictions');
async function run() {
  const data = await RiskPrediction.find({ riskLevel: 'high' }).sort({ predictedFor: -1 }).limit(10);
  console.log(data);
  process.exit();
}
run();
