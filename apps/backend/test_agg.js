import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DengueCase = mongoose.model('DengueCase', new mongoose.Schema({
  district: String,
  mohZone: String,
  date: Date,
  caseCount: Number
}, { collection: 'denguecases' }));

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");
  const district = 'Colombo';
  const mohZone = 'Homagama';
  
  const latestCase = await DengueCase.findOne({ district, mohZone }).sort({ date: -1 }).select('date');
  const now = new Date(latestCase.date);
  
  let since = new Date(now);
  since.setDate(since.getDate() - 84);
  since.setHours(0, 0, 0, 0);
  
  const matchStage = { district, date: { $gte: since }, $or: [{ mohZone }, { mohZone: { $exists: false } }] };
  
  const weekly = await DengueCase.aggregate([
    { $match: matchStage },
    { $group: {
        _id: { year: { $isoWeekYear: '$date' }, week: { $isoWeek: '$date' } },
        cases: { $sum: '$caseCount' },
    }},
    { $sort: { '_id.year': 1, '_id.week': 1 } },
    { $project: {
        _id: 0,
        key: {
          $concat: [
            { $toString: '$_id.year' }, '-W',
            { $cond: { if: { $lt: ['$_id.week', 10] },
                       then: { $concat: ['0', { $toString: '$_id.week' }] },
                       else: { $toString: '$_id.week' } } },
          ],
        },
        cases: 1,
    }},
  ]);
  
  console.log("Weekly keys:", weekly.map(w => `${w.key}: ${w.cases}`));

  let sinceDaily = new Date(now);
  sinceDaily.setDate(sinceDaily.getDate() - 30);
  sinceDaily.setHours(0, 0, 0, 0);
  const matchDaily = { district, date: { $gte: sinceDaily }, $or: [{ mohZone }, { mohZone: { $exists: false } }] };
  const daily = await DengueCase.aggregate([
    { $match: matchDaily },
    { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        cases: { $sum: '$caseCount' },
    }},
    { $sort: { _id: 1 } },
    { $project: { _id: 0, key: '$_id', cases: 1 } },
  ]);
  console.log("Daily keys:", daily.map(d => `${d.key}: ${d.cases}`));

  await mongoose.disconnect();
}
run().catch(console.error);
