import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const RiskPrediction = mongoose.model('RiskPrediction', new mongoose.Schema({}, { strict: false }), 'riskpredictions');

async function run() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const nationalRisk = await RiskPrediction.aggregate([
      { $match: { predictedFor: { $gte: sevenDaysAgo } } },
      { $sort: { predictedFor: 1, riskScore: -1 } },
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
