import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const DengueCase = mongoose.model('DengueCase', new mongoose.Schema({
  district: String,
  mohZone: String,
  date: Date,
  caseCount: Number
}, { collection: 'denguecases' }));

async function run() {
  await mongoose.connect('mongodb://chandimacbbandara_db_user:KLnFB6duu0ntLTvy@ac-bflg8on-shard-00-00.ckv9cjs.mongodb.net:27017,ac-bflg8on-shard-00-01.ckv9cjs.mongodb.net:27017,ac-bflg8on-shard-00-02.ckv9cjs.mongodb.net:27017/?tls=trueprocess.env.MONGO_URIreplicaSet=atlas-9x026t-shard-0process.env.MONGO_URIauthSource=adminprocess.env.MONGO_URIretryWrites=trueprocess.env.MONGO_URIw=majorityprocess.env.MONGO_URIappName=Cluster0');
  console.log("Connected");
  
  const district = 'Colombo';
  const mohZone = 'Homagama';
  
  const latestCase = await DengueCase.findOne({
    district,
    mohZone
  }).sort({ date: -1 }).select('date');
  
  console.log("Latest:", latestCase);
  
  const now = new Date(latestCase.date);
  const since = new Date(now);
  since.setDate(since.getDate() - 84); // 12 weeks
  since.setHours(0, 0, 0, 0);
  console.log("Since:", since);
  
  const matchStage = {
    district,
    date: { $gte: since },
    $or: [{ mohZone }, { mohZone: { $exists: false } }]
  };
  
  const cases = await DengueCase.find(matchStage).sort({ date: 1 });
  console.log(`Found ${cases.length} cases since ${since}`);
  
  if (cases.length > 0) {
    console.log("First 3 cases:", cases.slice(0, 3));
    console.log("Last 3 cases:", cases.slice(-3));
  }
  
  // daily aggregation output
  const daily = await DengueCase.aggregate([
    { $match: matchStage },
    { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        cases: { $sum: '$caseCount' },
    }},
    { $sort: { _id: 1 } },
  ]);
  console.log("Daily agg count:", daily.length);
  if (daily.length > 0) {
      console.log("Daily first 3:", daily.slice(0, 3));
      console.log("Daily last 3:", daily.slice(-3));
  }
  
  // weekly aggregation output
  const weekly = await DengueCase.aggregate([
    { $match: matchStage },
    { $group: {
        _id: {
          year: { $isoWeekYear: '$date' },
          week: { $isoWeek:     '$date' },
        },
        cases: { $sum: '$caseCount' },
    }},
    { $sort: { '_id.year': 1, '_id.week': 1 } },
  ]);
  console.log("Weekly agg count:", weekly.length);
  if (weekly.length > 0) {
      console.log("Weekly first 3:", weekly.slice(0, 3));
      console.log("Weekly last 3:", weekly.slice(-3));
  }
  
  await mongoose.disconnect();
}
run().catch(console.error);
