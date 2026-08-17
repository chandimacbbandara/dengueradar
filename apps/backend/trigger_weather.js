import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
import { fetchAllDistrictWeather } from './src/services/weatherFetcher.js';
async function run() {
    await fetchAllDistrictWeather();
    process.exit(0);
}
run();
