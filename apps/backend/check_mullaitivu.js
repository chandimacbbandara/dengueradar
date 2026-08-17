import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const MohZone = mongoose.model('MohZone', new mongoose.Schema({}, { strict: false }), 'mohzones');
const LiveWeather = mongoose.model('LiveWeather', new mongoose.Schema({}, { strict: false }), 'liveweathers');

async function run() {
    const zones = await MohZone.find({ district: { $regex: /mullaitivu|mulathiv/i } }).lean();
    console.log("MOH Zones for Mullaitivu:", zones.length, zones.map(z => z.zoneName));

    const weather = await LiveWeather.find({ district: { $regex: /mullaitivu|mulathiv/i } }).lean();
    console.log("Weather for Mullaitivu:", weather.length, weather.map(w => w.district));

    process.exit(0);
}
run();
