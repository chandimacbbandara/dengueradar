import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const LiveWeather = mongoose.model('LiveWeather', new mongoose.Schema({}, { strict: false, collection: 'live_weather' }));

async function run() {
    const weathers = await LiveWeather.find({}, { district: 1 }).lean();
    console.log("All weathers:", weathers.map(w => w.district));
    process.exit(0);
}
run();
