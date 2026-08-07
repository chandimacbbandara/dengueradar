/**
 * seedAdmin.js
 * Creates the predefined DengueRadar admin account.
 * Safe to re-run — uses upsert.
 *
 * Run:  node src/seeds/seedAdmin.js
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';

const ADMIN_EMAIL    = 'denguradar@gmail.com';
const ADMIN_PASSWORD = 'Cha@123456';

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected');

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const result = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        role:         'admin',
        firstName:    'DengueRadar',
        lastName:     'Admin',
        email:        ADMIN_EMAIL,
        passwordHash,
        district:     'Colombo',
        mohZone:      'Admin',
        isVerified:   true,
        isApproved:   true,
        isActive:     true,
      },
    },
    { upsert: true, new: true }
  );

  console.log(`✅ Admin account ready  →  ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   ID: ${result._id}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
