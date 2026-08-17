import mongoose from 'mongoose';
mongoose.connect('mongodb://127.0.0.1:27017/dengueradar');
const RiskPrediction = mongoose.model('RiskPrediction', new mongoose.Schema({}, { strict: false }), 'riskpredictions');

async function run() {
  const data = await RiskPrediction.find({ district: 'Kurunegala' }).sort({ predictedFor: 1, riskScore: -1 }).limit(10);
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}
run();
