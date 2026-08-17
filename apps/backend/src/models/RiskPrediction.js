import mongoose from 'mongoose';

const riskPredictionSchema = new mongoose.Schema({
  district:     { type: String, required: true, index: true },
  mohZone:      { type: String },
  riskScore:    { type: Number, required: true },
  riskLevel:    { type: String, enum: ['low', 'moderate', 'high'], required: true },
  predictedCases: { type: Number },
  predictedFor: { type: Date, required: true },
  generatedAt:  { type: Date, default: Date.now },

  // v2 stacking-ensemble fields
  predictedTier:       { type: String, enum: ['Low', 'Watch', 'Warning', 'Alert'] },
  pLow:                { type: Number },
  pWatch:              { type: Number },
  pWarning:            { type: Number },
  pAlert:              { type: Number },
  alertHighConfidence: { type: Boolean, default: false },
  modelVersion:        { type: String, default: 'v2-stacking' },
});

// Compound index to speed up upserts and lookups
riskPredictionSchema.index({ district: 1, mohZone: 1, predictedFor: 1 }, { unique: true });

export default mongoose.model('RiskPrediction', riskPredictionSchema);
