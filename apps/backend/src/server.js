import 'dotenv/config';
import dns from 'dns';
import express from 'express';

// Force Google DNS — fixes SRV resolution failures with some local routers/VPNs
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);


import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import referenceRoutes from './routes/reference.js';
import publicRoutes from './routes/public.js';
import userRoutes from './routes/user.js';
import mohRoutes from './routes/moh.js';
import weatherRoutes from './routes/weather.js';
import adminRoutes from './routes/admin.js';
import { startWeatherJob } from './jobs/weatherJob.js';
import { startWeeklyAlertJob } from './jobs/weeklyAlertJob.js';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting on auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests, please try again later' },
});

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', referenceRoutes);
app.use('/api', publicRoutes);
app.use('/api/user', userRoutes);
app.use('/api/moh', mohRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'DengueRadar API running' }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`DengueRadar API running on port ${PORT}`));
  // Start the scheduled weather fetch job (runs immediately + every 30 min)
  startWeatherJob();
  // Start the weekly high-risk alert job (runs every Sunday at midnight)
  startWeeklyAlertJob();
});

export default app;
