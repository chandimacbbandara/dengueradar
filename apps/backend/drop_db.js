import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    await mongoose.connection.db.dropCollection('riskpredictions');
    console.log("Dropped riskpredictions");
  } catch (e) { console.log(e.message); }
  process.exit(0);
}
run();
