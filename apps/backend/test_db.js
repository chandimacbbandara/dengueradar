import mongoose from 'mongoose';
import 'dotenv/config';

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://dengueradar_admin:F8fB2aR3Kx@dengueradar-cluster.ckv9cjs.mongodb.net/dengueradar_dev?retryWrites=true&w=majority')
  .then(async () => {
    const DengueCase = mongoose.model('DengueCase', new mongoose.Schema({
      district: String,
      mohZone: String,
      date: Date,
      caseCount: Number
    }, { collection: 'denguecases' }));

    const now = new Date('2026-05-11T00:00:00.000Z');
    let since = new Date(now);
    since.setDate(since.getDate() - 30);

    const docs = await DengueCase.find({ district: 'Colombo', mohZone: 'Homagama', date: { $gte: since, $lte: now } }).sort({ date: -1 });
    console.log(`Found ${docs.length} cases for Colombo/Homagama in the last 30 days.`);
    
    // Check weekly window
    since = new Date(now);
    since.setDate(since.getDate() - 84);
    const weeklyDocs = await DengueCase.find({ district: 'Colombo', mohZone: 'Homagama', date: { $gte: since, $lte: now } });
    console.log(`Found ${weeklyDocs.length} cases for Colombo/Homagama in the last 12 weeks.`);

    process.exit(0);
  });
