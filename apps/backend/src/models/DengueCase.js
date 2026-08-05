import mongoose from 'mongoose';

const dengueCaseSchema = new mongoose.Schema({
  district: { type: String, required: true, index: true },
  mohZone: { type: String },
  date: { type: Date, required: true, index: true },
  caseCount: { type: Number, required: true, default: 0 },
  source: { type: String, default: 'epid_unit' },
});

export default mongoose.model('DengueCase', dengueCaseSchema);
