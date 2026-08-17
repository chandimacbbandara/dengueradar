import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI);
const MohZone = mongoose.model('MohZone', new mongoose.Schema({}, { strict: false }), 'mohzones');

async function run() {
    const zones = await MohZone.find({ district: { $regex: /mullaitivu|mulathiv/i } }).lean();
    console.log("MohZone districts for Mullaitivu:", zones.map(z => z.district));
    process.exit(0);
}
run();
