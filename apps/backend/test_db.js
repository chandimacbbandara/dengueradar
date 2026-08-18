import mongoose from 'mongoose';
import 'dotenv/config';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected to MongoDB!");
    
    // Check Eravur cases
    const DengueCase = mongoose.connection.collection('denguecases');
    const eravur = await DengueCase.find({ mohZone: /Eravur/i }).sort({ date: -1 }).limit(5).toArray();
    console.log("Eravur latest cases:");
    console.log(eravur);

    // Check predictions
    const RiskPrediction = mongoose.connection.collection('riskpredictions');
    const preds = await RiskPrediction.find({}).sort({ createdAt: -1 }).limit(10).toArray();
    console.log("\nLatest Predictions distribution:");
    const dist = await RiskPrediction.aggregate([{ $group: { _id: '$predictedTier', count: { $sum: 1 } } }]).toArray();
    console.log(dist);
    
    process.exit(0);
  } catch(e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}
run();
