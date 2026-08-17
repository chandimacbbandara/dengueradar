import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const RiskPredictionSchema = new mongoose.Schema({
  district: String,
  riskLevel: String,
  riskScore: Number,
  predictedFor: Date
});
const RiskPrediction = mongoose.model('RiskPrediction', RiskPredictionSchema, 'riskpredictions');
async function run() {
  const data = await RiskPrediction.find().limit(3).lean();
  console.log(data);
  process.exit();
}
run();
