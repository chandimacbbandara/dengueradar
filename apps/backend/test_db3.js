import mongoose from 'mongoose';
import 'dotenv/config';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    const RiskPrediction = mongoose.connection.collection('riskpredictions');
    
    console.log("v2-stacking counts by predictedTier:");
    const dist1 = await RiskPrediction.aggregate([
        { $match: { modelVersion: 'v2-stacking' } },
        { $group: { _id: '$predictedTier', count: { $sum: 1 } } }
    ]).toArray();
    console.log(dist1);

    console.log("v2-stacking counts by riskLevel:");
    const dist2 = await RiskPrediction.aggregate([
        { $match: { modelVersion: 'v2-stacking' } },
        { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
    ]).toArray();
    console.log(dist2);

    process.exit(0);
  } catch(e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}
run();
