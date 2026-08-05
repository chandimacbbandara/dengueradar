import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  district: { type: String },
  mohZone: { type: String },
  riskLevel: { type: String },
  channel: { type: String, enum: ['web', 'whatsapp'], default: 'web' },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
  message: { type: String },
});

export default mongoose.model('Alert', alertSchema);
