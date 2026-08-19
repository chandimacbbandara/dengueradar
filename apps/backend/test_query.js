import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DengueCaseSchema = new mongoose.Schema({
  district: String,
  mohZone: String,
  date: Date,
  caseCount: Number
}, { collection: 'denguecases' });

const DengueCase = mongoose.model('DengueCase', DengueCaseSchema);

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");
  const count = await DengueCase.countDocuments({ mohZone: 'Homagama' });
  console.log("Total Homagama cases records count:", count);

  const sample = await DengueCase.find({ mohZone: 'Homagama' }).sort({ date: -1 }).limit(10);
  console.log("Sample records:");
  console.log(sample.map(s => ({ date: s.date.toISOString(), caseCount: s.caseCount })));

  const maxCase = await DengueCase.findOne().sort({ date: -1 });
  console.log("Max date in DengueCase globally:", maxCase ? maxCase.date.toISOString() : 'none');

  await mongoose.disconnect();
}
run();
