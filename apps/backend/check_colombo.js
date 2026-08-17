import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const RiskPrediction = mongoose.model('RiskPrediction', new mongoose.Schema({}, { strict: false }), 'riskpredictions');

async function run() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const data = await RiskPrediction.find({ district: 'Colombo', predictedFor: { $gte: today } }).sort({ riskScore: -1 }).limit(3);
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
}
run();
