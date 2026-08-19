import mongoose from 'mongoose';
import 'dotenv/config';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    const RiskPrediction = mongoose.connection.collection('riskpredictions');
    
    const latest = await RiskPrediction.find().sort({ generatedAt: -1 }).limit(1).toArray();
    console.log("Latest prediction:", latest[0]?.generatedAt, "modelVersion:", latest[0]?.modelVersion);

    process.exit(0);
  } catch(e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}
run();
