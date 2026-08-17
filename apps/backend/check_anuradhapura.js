import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const RiskPrediction = mongoose.model('RiskPrediction', new mongoose.Schema({ district: String, mohZone: String, riskLevel: String, riskScore: Number }), 'riskpredictions');
async function run() {
  const data = await RiskPrediction.find({ district: 'Anuradhapura' }).sort({ riskScore: -1 });
  console.log(data);
  process.exit();
}
run();
