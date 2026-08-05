import mongoose from 'mongoose';

const riskPredictionSchema = new mongoose.Schema({
  district: { type: String, required: true, index: true },
  mohZone: { type: String },
  riskScore: { type: Number, required: true },
  riskLevel: { type: String, enum: ['low', 'moderate', 'high'], required: true },
  predictedFor: { type: Date, required: true },
  modelVersion: { type: String, default: 'v1.0' },
  generatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('RiskPrediction', riskPredictionSchema);
