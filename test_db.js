import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/backend/.env' });

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const DengueCase = mongoose.model('DengueCase', new mongoose.Schema({}, { strict: false }));
    const max = await DengueCase.findOne().sort({ date: -1 });
    console.log("Max date:", max);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
