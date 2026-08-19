import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DengueCase from './src/models/DengueCase.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const cases = await DengueCase.find({ mohZone: 'Ratmalana' }).sort({ date: -1 }).limit(5).lean();
  console.log("Ratmalana cases in DB:", cases.length);
  process.exit(0);
}

run().catch(console.error);
