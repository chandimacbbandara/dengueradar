import mongoose from 'mongoose';
import 'dotenv/config';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    const RiskPrediction = mongoose.connection.collection('riskpredictions');
    
    console.log("\nLatest Predictions distribution (predictedTier):");
    const dist1 = await RiskPrediction.aggregate([{ $group: { _id: '$predictedTier', count: { $sum: 1 } } }]).toArray();
    console.log(dist1);

    console.log("\nLatest Predictions distribution (riskLevel):");
    const dist2 = await RiskPrediction.aggregate([{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }]).toArray();
    console.log(dist2);

    process.exit(0);
  } catch(e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}
run();
