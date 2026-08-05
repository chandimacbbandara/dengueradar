import mongoose from 'mongoose';

const mohZoneSchema = new mongoose.Schema({
  district: { type: String, required: true, index: true },
  zoneName: { type: String, required: true },
});

export default mongoose.model('MohZone', mohZoneSchema);
