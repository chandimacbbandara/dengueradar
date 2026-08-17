import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const RiskPrediction = mongoose.model('RiskPrediction', new mongoose.Schema({}, { strict: false }), 'riskpredictions');

async function run() {
    const latestPrediction = await RiskPrediction.findOne().sort({ generatedAt: -1 }).select('generatedAt');
    const windowStart = new Date(latestPrediction.generatedAt.getTime() - 6 * 60 * 60 * 1000);

    const districts = await RiskPrediction.distinct('district', { generatedAt: { $gte: windowStart } });
    console.log("Districts in latest predictions:", districts);
    process.exit(0);
}
run();
