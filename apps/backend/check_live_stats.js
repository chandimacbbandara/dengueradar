import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const RiskPrediction = mongoose.model('RiskPrediction', new mongoose.Schema({}, { strict: false }), 'riskpredictions');

async function run() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const zones = await RiskPrediction.distinct('mohZone', { riskLevel: 'high', predictedFor: { $gte: today } });
    console.log("Future high risk zones:", zones.length);
    process.exit(0);
}
run();
