import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendVerificationEmail } from '../services/emailService.js';

export const signupGeneral = async (req, res) => {
  try {
    const { firstName, lastName, email, district, mohZone, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const isDev = process.env.NODE_ENV === 'development';
    const emailVerificationToken = isDev ? undefined : crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = isDev ? undefined : Date.now() + 24 * 60 * 60 * 1000;

    const user = await User.create({
      role: 'general',
      firstName,
      lastName,
      email,
      district,
      mohZone,
      passwordHash,
      // Auto-verify in development so email verification is not required
      isVerified: isDev ? true : false,
      emailVerificationToken,
      emailVerificationExpires
    });

    if (!isDev) {
      await sendVerificationEmail(user.email, emailVerificationToken);
    }

    res.status(201).json({ success: true, message: isDev
      ? 'Registration successful. You can log in immediately.'
      : 'Registration successful. Please check your email to verify your account.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const signupMohOfficer = async (req, res) => {
  try {
    const { officerName, email, district, mohZone, password, employeeId } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const isDev = process.env.NODE_ENV === 'development';
    const emailVerificationToken = isDev ? undefined : crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = isDev ? undefined : Date.now() + 24 * 60 * 60 * 1000;

    const user = await User.create({
      role: 'moh_officer',
      officerName,
      email,
      district,
      mohZone,
      employeeId,
      passwordHash,
      isApproved: false,
      // Auto-verify in development so email verification is not required
      isVerified: isDev ? true : false,
      emailVerificationToken,
      emailVerificationExpires
    });

    if (!isDev) {
      await sendVerificationEmail(user.email, emailVerificationToken);
    }

    res.status(201).json({ success: true, message: 'Registration successful. Your account is pending admin approval.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (process.env.NODE_ENV !== 'development' && !user.isVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email before logging in.' });
    }

    if (user.role === 'moh_officer' && !user.isApproved) {
      return res.status(403).json({ success: false, message: 'Account pending admin approval. You will be notified when access is granted.' });
    }

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

    // Use updateOne instead of save() to avoid full-document validation on login
    await User.updateOne({ _id: user._id }, { $set: { refreshToken } });

    res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({
      success: true,
      role: user.role,
      token: accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        district: user.district,
        mohZone: user.mohZone,
        firstName: user.firstName,
        lastName: user.lastName,
        officerName: user.officerName
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const currentRefreshToken = req.cookies?.refreshToken;
    if (!currentRefreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    const decoded = jwt.verify(currentRefreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== currentRefreshToken) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
    
    res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
    
    res.json({ success: true, message: 'Token refreshed' });
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid refresh token' });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const decoded = jwt.decode(refreshToken);
      if (decoded && decoded.id) {
        await User.findByIdAndUpdate(decoded.id, { $unset: { refreshToken: 1 } });
      }
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
