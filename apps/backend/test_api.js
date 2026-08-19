import mongoose from 'mongoose';
import 'dotenv/config';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    const RiskPrediction = mongoose.connection.collection('riskpredictions');
    
    const latestPrediction = await RiskPrediction.find().sort({ generatedAt: -1 }).limit(1).toArray();
    const windowStart = new Date(latestPrediction[0].generatedAt.getTime() - 6 * 60 * 60 * 1000);

    const nationalRisk = await RiskPrediction.aggregate([
      { $match: { generatedAt: { $gte: windowStart } } },
      { $addFields: {
          severity: {
            $switch: {
              branches: [
                { case: { $eq: ['$riskLevel', 'high'] }, then: 3 },
                { case: { $eq: ['$riskLevel', 'moderate'] }, then: 2 },
                { case: { $eq: ['$riskLevel', 'low'] }, then: 1 }
              ],
              default: 0
            }
          }
      }},
      { $group: {
          _id: { district: '$district', riskLevel: '$riskLevel' },
          count: { $sum: 1 },
          severity: { $first: '$severity' },
          riskScore: { $avg: '$riskScore' }
      }},
      { $sort: { count: -1, severity: -1 } },
      { $group: {
          _id: '$_id.district',
          riskScore: { $first: '$riskScore' },
          riskLevel: { $first: '$_id.riskLevel' }
      }},
      { $project: {
          district: '$_id',
          riskScore: 1,
          riskLevel: 1,
          _id: 0
      }}
    ]).toArray();

    console.log(nationalRisk);
    process.exit(0);
  } catch(e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}
run();
