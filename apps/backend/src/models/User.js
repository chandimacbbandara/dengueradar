import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['general', 'moh_officer', 'admin'], required: true },
    isActive: { type: Boolean, default: true },
    rejectionReason: { type: String },
    firstName: { type: String },
    lastName:  { type: String },
    officerName: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    whatsappNumber: { type: String },
    district: { type: String, required: true },
    mohZone: { type: String, required: true },
    employeeId: { type: String },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model('User', userSchema);
