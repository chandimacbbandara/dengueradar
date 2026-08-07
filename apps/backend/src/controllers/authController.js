import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendOtpEmail } from '../services/emailService.js';

/* ─── OTP helpers ───────────────────────────────────────────────── */

/** Generate a cryptographically random 6-digit OTP string */
function generateOtp() {
  return String(Math.floor(100000 + crypto.randomInt(900000)));
}

/** 10-minute expiry */
const OTP_TTL_MS = 10 * 60 * 1000;

/* ─── POST /auth/send-otp ───────────────────────────────────────── */
/**
 * Step 1 of registration.
 * Validates the email is free, generates a 6-digit OTP, stores it
 * (hashed) on the User document (or a temp pending record), and
 * sends the branded email.
 *
 * We store a temporary unverified user so we can attach the OTP to
 * an email without exposing it in any response.
 */
export const sendOtp = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    // If a fully verified account already exists, block
    const existing = await User.findOne({ email });
    if (existing && existing.isVerified) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const otp    = generateOtp();
    const hashed = await bcrypt.hash(otp, 10);
    const expiry = Date.now() + OTP_TTL_MS;

    if (existing && !existing.isVerified) {
      // Resend: update OTP on the pending record
      existing.emailVerificationToken   = hashed;
      existing.emailVerificationExpires = expiry;
      await existing.save();
    } else {
      // First time: create a minimal stub (not yet verified)
      await User.create({
        role:   'general',           // placeholder — overwritten on final signup
        email,
        district:  'Colombo',       // placeholder — overwritten on final signup
        mohZone:   'placeholder',   // placeholder — overwritten on final signup
        passwordHash: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
        isVerified: false,
        emailVerificationToken:   hashed,
        emailVerificationExpires: expiry,
      });
    }

    await sendOtpEmail(email, otp, name);

    res.json({ success: true, message: 'OTP sent to your email address' });
  } catch (err) {
    console.error('[sendOtp]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── POST /auth/verify-otp ─────────────────────────────────────── */
/**
 * Step 2 — validate the 6-digit OTP the user typed.
 * Returns a short-lived otpToken so the frontend can proceed to
 * the full signup submit without re-entering the OTP.
 */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({
      email,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user || !user.emailVerificationToken) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' });
    }

    const match = await bcrypt.compare(otp, user.emailVerificationToken);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }

    // Mark email as verified, clear OTP fields
    user.isVerified = true;
    user.emailVerificationToken   = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('[verifyOtp]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── POST /auth/signup/general ─────────────────────────────────── */
export const signupGeneral = async (req, res) => {
  try {
    const { firstName, lastName, email, district, mohZone, whatsappNumber, password } = req.body;

    // Find the pre-verified stub
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Please verify your email first.' });
    }
    if (!user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email not verified. Please complete OTP verification.' });
    }

    // Overwrite the stub with full registration data
    const passwordHash = await bcrypt.hash(password, 12);
    user.role          = 'general';
    user.firstName     = firstName;
    user.lastName      = lastName;
    user.district      = district;
    user.mohZone       = mohZone;
    user.whatsappNumber = whatsappNumber;
    user.passwordHash  = passwordHash;
    user.isApproved    = true;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in.',
    });
  } catch (err) {
    console.error('[signupGeneral]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── POST /auth/signup/moh-officer ─────────────────────────────── */
export const signupMohOfficer = async (req, res) => {
  try {
    const { officerName, email, district, mohZone, whatsappNumber, password, employeeId } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Please verify your email first.' });
    }
    if (!user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email not verified. Please complete OTP verification.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    user.role         = 'moh_officer';
    user.officerName  = officerName;
    user.district     = district;
    user.mohZone      = mohZone;
    user.whatsappNumber = whatsappNumber;
    user.employeeId   = employeeId;
    user.passwordHash = passwordHash;
    user.isApproved   = false; // Needs admin approval
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration submitted. Your account is pending admin approval.',
    });
  } catch (err) {
    console.error('[signupMohOfficer]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── POST /auth/login ───────────────────────────────────────────── */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email before logging in.' });
    }

    if (user.role === 'moh_officer' && !user.isApproved) {
      return res.status(403).json({ success: false, message: 'Account pending admin approval. You will be notified when access is granted.' });
    }

    const accessToken  = jwt.sign({ id: user._id }, process.env.JWT_SECRET,         { expiresIn: process.env.JWT_EXPIRES_IN  || '15m' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

    await User.updateOne({ _id: user._id }, { $set: { refreshToken } });

    res.cookie('accessToken',  accessToken,  { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({
      success: true,
      role: user.role,
      token: accessToken,
      user: {
        id:          user._id,
        email:       user.email,
        role:        user.role,
        district:    user.district,
        mohZone:     user.mohZone,
        firstName:   user.firstName,
        lastName:    user.lastName,
        officerName: user.officerName,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── POST /auth/verify-email (legacy — kept for compat) ────────── */
export const verifyEmail = verifyOtp;

/* ─── POST /auth/refresh-token ──────────────────────────────────── */
export const refreshToken = async (req, res) => {
  try {
    const currentRefreshToken = req.cookies?.refreshToken;
    if (!currentRefreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    const decoded = jwt.verify(currentRefreshToken, process.env.JWT_REFRESH_SECRET);
    const user    = await User.findById(decoded.id);

    if (!user || user.refreshToken !== currentRefreshToken) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

    res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
    res.json({ success: true, message: 'Token refreshed', token: newAccessToken });
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid refresh token' });
  }
};

/* ─── POST /auth/logout ──────────────────────────────────────────── */
export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      const decoded = jwt.decode(token);
      if (decoded?.id) await User.findByIdAndUpdate(decoded.id, { $unset: { refreshToken: 1 } });
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
