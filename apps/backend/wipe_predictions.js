import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const RiskPrediction = mongoose.model('RiskPrediction', new mongoose.Schema({}, { strict: false }), 'riskpredictions');
async function run() {
  await RiskPrediction.deleteMany({});
  console.log("Wiped all old buggy predictions.");
  process.exit();
}
run();
