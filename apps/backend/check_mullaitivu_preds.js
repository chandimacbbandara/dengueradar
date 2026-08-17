import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const RiskPrediction = mongoose.model('RiskPrediction', new mongoose.Schema({}, { strict: false }), 'riskpredictions');

async function run() {
    const preds = await RiskPrediction.find({ district: 'Mullaitivu' }).sort({ generatedAt: -1 }).limit(10).lean();
    console.log("Mullaitivu predictions:", preds.map(p => ({
        zone: p.mohZone,
        level: p.riskLevel,
        score: p.riskScore,
        gen: p.generatedAt
    })));
    process.exit(0);
}
run();
