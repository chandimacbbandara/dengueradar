import cron from 'node-cron';
import RiskPrediction from '../models/RiskPrediction.js';
import User from '../models/User.js';
import Alert from '../models/Alert.js';
import { sendRiskAlertEmail } from '../services/predictionService.js';

const CRON_SCHEDULE = '0 0 * * 0'; // Every Sunday at midnight (every 7 days)

export function startWeeklyAlertJob() {
  console.log('[WeeklyAlertJob] ⏱  Scheduling weekly high-risk alert job (every 7 days).');
  
  cron.schedule(CRON_SCHEDULE, async () => {
    console.log(`[WeeklyAlertJob] ⏰ Cron triggered at ${new Date().toISOString()}`);
    try {
      const latestPrediction = await RiskPrediction.findOne().sort({ generatedAt: -1 }).select('generatedAt');
      if (!latestPrediction) return;
      const windowStart = new Date(latestPrediction.generatedAt.getTime() - 6 * 60 * 60 * 1000);

      const highRiskZones = await RiskPrediction.find({ 
        generatedAt: { $gte: windowStart },
        riskLevel: 'high'
      }).lean();

      if (highRiskZones.length === 0) return;

      const zoneNames = highRiskZones.map(z => z.mohZone);
      const zoneMap = Object.fromEntries(highRiskZones.map(z => [z.mohZone, z.district]));
      
      const users = await User.find({ mohZone: { $in: zoneNames }, isVerified: true }).lean();
      
      if (users.length === 0) return;

      const alertDocs = [];

      for (const user of users) {
        const email = user.email;
        const name = user.firstName || user.officerName || 'Member';
        const district = zoneMap[user.mohZone];

        alertDocs.push({
          userId: user._id,
          district: district,
          mohZone: user.mohZone,
          riskLevel: 'high',
          channel: 'web',
          message: `WEEKLY ALERT: The dengue risk level for ${user.mohZone} remains HIGH. Please continue taking precautions.`,
          sentAt: new Date(),
          status: 'sent',
        });

        if (process.env.NODE_ENV === 'production') {
          try {
            await sendRiskAlertEmail(email, name, user.mohZone, 'high', true);
          } catch (err) {
            console.error(`[WeeklyAlertJob] Failed to send email to ${email}:`, err.message);
          }
        }
      }

      if (alertDocs.length > 0) {
        await Alert.insertMany(alertDocs);
        console.log(`[WeeklyAlertJob] 🚨 Dispatched ${alertDocs.length} weekly alerts.`);
      }

    } catch (err) {
      console.error('[WeeklyAlertJob] Unhandled error during cron run:', err.message);
    }
  });
}
