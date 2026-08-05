import 'dotenv/config';
import mongoose from 'mongoose';
import MohZone from '../models/MohZone.js';
import MOH_ZONES_DATA from '../data/mohZonesData.js';

const seedZones = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await MohZone.deleteMany({});
    console.log('Cleared MohZone collection');

    const seedDocs = [];
    MOH_ZONES_DATA.forEach(d => {
      d.zones.forEach(z => {
        seedDocs.push({ district: d.district, zoneName: z });
      });
    });

    await MohZone.insertMany(seedDocs);
    console.log(`✅ Inserted ${seedDocs.length} MOH zones across ${MOH_ZONES_DATA.length} districts`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding MOH Zones:', error);
    process.exit(1);
  }
};

seedZones();
