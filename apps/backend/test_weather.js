import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LiveWeather from './src/models/LiveWeather.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const weather = await LiveWeather.find().limit(2).lean();
  console.log("Weather:", weather);

  process.exit(0);
}

run().catch(console.error);
