import 'dotenv/config';
import mongoose from 'mongoose';
import DengueCase from '../models/DengueCase.js';
import RiskPrediction from '../models/RiskPrediction.js';

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
    
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      
      DISTRICTS.forEach(district => {
        let count = 0;
        if (['Colombo', 'Gampaha'].includes(district)) {
          count = Math.floor(Math.random() * 151) + 50; // 50-200
        } else if (['Kandy', 'Kalutara', 'Galle', 'Kurunegala', 'Ratnapura'].includes(district)) {
          count = Math.floor(Math.random() * 61) + 20; // 20-80
        } else {
          count = Math.floor(Math.random() * 26) + 5; // 5-30
        }

        casesDocs.push({
          district,
          date: monthDate,
          caseCount: count
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
