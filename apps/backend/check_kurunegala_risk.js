import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const RiskPrediction = mongoose.model('RiskPrediction', new mongoose.Schema({}, { strict: false }), 'riskpredictions');

async function run() {
    const latestPrediction = await RiskPrediction.findOne().sort({ generatedAt: -1 }).select('generatedAt');
    const windowStart = new Date(latestPrediction.generatedAt.getTime() - 6 * 60 * 60 * 1000);

    const zones = await RiskPrediction.find({ district: 'Kurunegala', generatedAt: { $gte: windowStart } }).lean();
    console.log("Kurunegala zones with high risk:", zones.filter(z => z.riskLevel === 'high').length);
    console.log("All risk levels:", [...new Set(zones.map(z => z.riskLevel))]);
    console.log("Specific levels:", zones.map(z => ({ zone: z.mohZone, level: z.riskLevel })).slice(0, 5));
    process.exit(0);
}
run();
