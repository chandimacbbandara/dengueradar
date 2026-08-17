import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const RiskPrediction = mongoose.model('RiskPrediction', new mongoose.Schema({}, { strict: false }), 'riskpredictions');

async function run() {
    const latestPrediction = await RiskPrediction.findOne().sort({ generatedAt: -1 }).select('generatedAt');
    if (!latestPrediction) return console.log("No prediction");
    
    const windowStart = new Date(latestPrediction.generatedAt.getTime() - 6 * 60 * 60 * 1000);

    const nationalRisk = await RiskPrediction.aggregate([
      { $match: { generatedAt: { $gte: windowStart } } },
      { $sort: { riskScore: -1 } },
      { $group: {
          _id: '$district',
          riskScore: { $first: '$riskScore' },
          riskLevel: { $first: '$riskLevel' }
      }},
      { $project: {
          district: '$_id',
          riskScore: 1,
          riskLevel: 1,
          _id: 0
      }}
    ]);
    console.log(JSON.stringify(nationalRisk.slice(0, 5), null, 2));
    process.exit(0);
}
run();
