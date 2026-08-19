import mongoose from 'mongoose';
import 'dotenv/config';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    const RiskPrediction = mongoose.connection.collection('riskpredictions');
    
    const nulls = await RiskPrediction.find({ predictedTier: null }).limit(2).toArray();
    console.log("Null predictions sample:", nulls);

    process.exit(0);
  } catch(e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}
run();
