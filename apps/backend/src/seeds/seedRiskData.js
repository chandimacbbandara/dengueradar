import 'dotenv/config';
import mongoose from 'mongoose';
import DengueCase from '../models/DengueCase.js';
import RiskPrediction from '../models/RiskPrediction.js';

import MOH_ZONES_DATA from '../data/mohZonesData.js';

const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
];

const seedRiskData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await DengueCase.deleteMany({});
    await RiskPrediction.deleteMany({});
    console.log('Cleared DengueCase and RiskPrediction collections');

    const casesDocs = [];
    const now = new Date();
    const weekDur = 7 * 24 * 60 * 60 * 1000;
    
    for (let w = 0; w < 16; w++) {
      const weekDate = new Date(now.getTime() - w * weekDur);
      const day = weekDate.getDay() || 7;
      weekDate.setDate(weekDate.getDate() - day + 1);
      weekDate.setHours(0, 0, 0, 0);
      
      MOH_ZONES_DATA.forEach(d => {
        d.zones.forEach(zoneName => {
          const count = ['Colombo', 'Gampaha'].includes(d.district)
            ? Math.floor(Math.random() * 15) + 5
            : ['Kandy', 'Kalutara', 'Galle', 'Kurunegala', 'Ratnapura'].includes(d.district)
            ? Math.floor(Math.random() * 6) + 2
            : Math.floor(Math.random() * 3) + 1;

          casesDocs.push({
            district: d.district,
            mohZone: zoneName,
            date: new Date(weekDate),
            caseCount: count,
            source: 'epid_unit'
          });
        });
      });
    }

    await DengueCase.insertMany(casesDocs);
    console.log(`Inserted ${casesDocs.length} DengueCase records`);

    const riskDocs = [];
    
    DISTRICTS.forEach(district => {
      let riskScore = 0;
      
      if (['Colombo', 'Gampaha'].includes(district)) {
        riskScore = Math.floor(Math.random() * 34) + 67; // 67-100 (high)
      } else if (['Kandy', 'Kalutara', 'Galle'].includes(district)) {
        riskScore = Math.floor(Math.random() * 33) + 34; // 34-66 (moderate)
      } else {
        riskScore = Math.floor(Math.random() * 33); // 0-32 (low)
      }

      let riskLevel = 'low';
      if (riskScore >= 67) riskLevel = 'high';
      else if (riskScore >= 33) riskLevel = 'moderate';

      riskDocs.push({
        district,
        riskScore,
        riskLevel,
        predictedFor: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      });
    });

    await RiskPrediction.insertMany(riskDocs);
    console.log(`Inserted ${riskDocs.length} RiskPrediction records`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding Risk Data:', error);
    process.exit(1);
  }
};

seedRiskData();
