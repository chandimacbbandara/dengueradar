import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DengueCase from './src/models/DengueCase.js';
import RiskPrediction from './src/models/RiskPrediction.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const maxCase = await DengueCase.findOne().sort({ date: -1 }).lean();
  if (!maxCase) {
    console.log('No cases found');
    process.exit(0);
  }

  const maxDate = new Date(maxCase.date);
  console.log('Current max date in DB:', maxDate);

  // Target max date: Monday of the current week
  const now = new Date();
  const currentDayNum = now.getUTCDay() || 7;
  const targetMaxDate = new Date(now);
  targetMaxDate.setUTCDate(targetMaxDate.getUTCDate() - currentDayNum + 1);
  targetMaxDate.setUTCHours(0, 0, 0, 0);

  console.log('Target max date:', targetMaxDate);

  const diffTime = targetMaxDate.getTime() - maxDate.getTime();
  const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));

  console.log(`Shifting dates by ${diffWeeks} weeks...`);

  if (diffWeeks > 0) {
    // We can use MongoDB aggregation pipeline in updateMany to add to the date
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const shiftMs = diffWeeks * weekMs;
    
    await DengueCase.updateMany({}, [
      { $set: { date: { $add: ['$date', shiftMs] } } }
    ]);
    
    console.log('Successfully shifted DengueCase dates.');
  } else {
    console.log('No shift needed.');
  }

  // Clear old predictions
  await RiskPrediction.deleteMany({});
  console.log('Cleared old predictions.');

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
