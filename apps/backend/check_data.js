import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected to MongoDB\n');

// Register models with flexible schemas so we can read any field
const DengueCase     = mongoose.model('DengueCase',     new mongoose.Schema({}, { strict: false }), 'denguecases');
const LiveWeather    = mongoose.model('LiveWeather',     new mongoose.Schema({}, { strict: false }), 'live_weather');
const RiskPrediction = mongoose.model('RiskPrediction',  new mongoose.Schema({}, { strict: false }), 'riskpredictions');
const MohZone        = mongoose.model('MohZone',         new mongoose.Schema({}, { strict: false }), 'mohzones');

// ── 1. DengueCase overview ──────────────────────────────────────────
const totalCases = await DengueCase.countDocuments();
const distinctZones = await DengueCase.distinct('mohZone');
const distinctDistricts = await DengueCase.distinct('district');
console.log('═══════════════════════════════════════════════════');
console.log('1) DENGUE CASE RECORDS');
console.log('═══════════════════════════════════════════════════');
console.log(`   Total documents       : ${totalCases}`);
console.log(`   Distinct districts    : ${distinctDistricts.length}`);
console.log(`   Distinct mohZone vals : ${distinctZones.length}`);
console.log('');

// ── 2. Zones with ZERO cases in the last 52 weeks ──────────────────
const fiftyTwoWeeksAgo = new Date();
fiftyTwoWeeksAgo.setDate(fiftyTwoWeeksAgo.getDate() - 364);

const zonesWithRecentCases = await DengueCase.distinct('mohZone', {
  date: { $gte: fiftyTwoWeeksAgo },
  caseCount: { $gt: 0 },
});

const allMohZones = await MohZone.find({}).lean();
const allZoneNames = allMohZones.map(z => z.zoneName);
const zonesWithZeroCases = allZoneNames.filter(z => !zonesWithRecentCases.includes(z));

console.log('═══════════════════════════════════════════════════');
console.log('2) ZONES WITH ZERO CASES (last 52 weeks)');
console.log('═══════════════════════════════════════════════════');
console.log(`   Total MohZone records : ${allMohZones.length}`);
console.log(`   Zones WITH cases     : ${zonesWithRecentCases.length}`);
console.log(`   Zones with ZERO      : ${zonesWithZeroCases.length}`);
if (zonesWithZeroCases.length > 0) {
  console.log('   List:');
  zonesWithZeroCases.forEach(z => console.log(`     - ${z}`));
}
console.log('');

// ── 3. LiveWeather — district coverage ──────────────────────────────
const weatherDocs = await LiveWeather.find({}).lean();
const weatherDistricts = weatherDocs.map(w => w.district);

const expectedDistricts = [
  'Colombo','Gampaha','Kalutara','Kandy','Matale','Nuwara Eliya',
  'Galle','Matara','Hambantota','Jaffna','Kilinochchi','Mannar',
  'Vavuniya','Mullaitivu','Batticaloa','Ampara','Trincomalee',
  'Kurunegala','Puttalam','Anuradhapura','Polonnaruwa','Badulla',
  'Monaragala','Ratnapura','Kegalle',
];
const missingWeather = expectedDistricts.filter(d => !weatherDistricts.includes(d));

console.log('═══════════════════════════════════════════════════');
console.log('3) LIVE WEATHER COVERAGE');
console.log('═══════════════════════════════════════════════════');
console.log(`   Weather docs found    : ${weatherDocs.length}`);
console.log(`   Districts with data   : ${weatherDistricts.join(', ')}`);
if (missingWeather.length > 0) {
  console.log(`   ❌ MISSING weather for : ${missingWeather.join(', ')}`);
} else {
  console.log('   ✅ All 25 districts have weather data');
}
if (weatherDocs.length > 0) {
  const latest = weatherDocs.reduce((a, b) => (new Date(a.fetched_at) > new Date(b.fetched_at) ? a : b));
  console.log(`   Latest fetched_at     : ${latest.fetched_at}`);
  // Show a sample weather doc to verify fields
  console.log('   Sample weather doc fields:');
  const sample = weatherDocs[0];
  console.log(`     temperature_mean: ${sample.temperature_mean}`);
  console.log(`     temperature_max:  ${sample.temperature_max}`);
  console.log(`     temperature_min:  ${sample.temperature_min}`);
  console.log(`     humidity:         ${sample.humidity}`);
  console.log(`     rainfall:         ${sample.rainfall}`);
  console.log(`     temp_avg_4w:      ${sample.temp_avg_4w}`);
  console.log(`     humidity_4w:      ${sample.humidity_4w}`);
  console.log(`     rain_2w:          ${sample.rain_2w}`);
  console.log(`     rain_4w:          ${sample.rain_4w}`);
}
console.log('');

// ── 4. Latest RiskPrediction batch — riskLevel distribution ─────────
const latestPred = await RiskPrediction.findOne().sort({ generatedAt: -1 }).lean();
let batchFilter = {};
if (latestPred) {
  const batchStart = new Date(latestPred.generatedAt.getTime() - 60 * 60 * 1000);
  batchFilter = { generatedAt: { $gte: batchStart } };
}

const riskLevelAgg = await RiskPrediction.aggregate([
  { $match: batchFilter },
  { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
  { $sort: { _id: 1 } },
]);

const tierAgg = await RiskPrediction.aggregate([
  { $match: batchFilter },
  { $group: { _id: '$predictedTier', count: { $sum: 1 } } },
  { $sort: { _id: 1 } },
]);

const totalLatestPreds = riskLevelAgg.reduce((s, r) => s + r.count, 0);

console.log('═══════════════════════════════════════════════════');
console.log('4) LATEST RISK PREDICTION BATCH');
console.log('═══════════════════════════════════════════════════');
if (latestPred) {
  console.log(`   generatedAt           : ${latestPred.generatedAt}`);
  console.log(`   modelVersion          : ${latestPred.modelVersion || 'N/A'}`);
}
console.log(`   Total predictions     : ${totalLatestPreds}`);
console.log('   riskLevel distribution:');
riskLevelAgg.forEach(r => console.log(`     ${r._id || '(null)'}: ${r.count}`));
console.log('   predictedTier distribution:');
tierAgg.forEach(r => console.log(`     ${r._id || '(null)'}: ${r.count}`));
console.log('');

// ── 5. Zones with riskScore = 0 or null ─────────────────────────────
const zeroOrNullRisk = await RiskPrediction.find({
  ...batchFilter,
  $or: [{ riskScore: 0 }, { riskScore: null }],
}).select('district mohZone riskScore riskLevel predictedTier').lean();

console.log('═══════════════════════════════════════════════════');
console.log('5) ZONES WITH riskScore = 0 OR null (latest batch)');
console.log('═══════════════════════════════════════════════════');
console.log(`   Count: ${zeroOrNullRisk.length}`);
if (zeroOrNullRisk.length > 0 && zeroOrNullRisk.length <= 50) {
  zeroOrNullRisk.forEach(z =>
    console.log(`     ${z.district} / ${z.mohZone} → score=${z.riskScore}, level=${z.riskLevel}, tier=${z.predictedTier || 'N/A'}`)
  );
} else if (zeroOrNullRisk.length > 50) {
  console.log('   (Too many to list — showing first 30)');
  zeroOrNullRisk.slice(0, 30).forEach(z =>
    console.log(`     ${z.district} / ${z.mohZone} → score=${z.riskScore}, level=${z.riskLevel}, tier=${z.predictedTier || 'N/A'}`)
  );
}
console.log('');

// ── 6. MohZone vs Predictions coverage ──────────────────────────────
const mohZoneList = allMohZones.map(z => `${z.district}::${z.zoneName}`);
const predZones = await RiskPrediction.find(batchFilter).select('district mohZone').lean();
const predZoneSet = new Set(predZones.map(p => `${p.district}::${p.mohZone}`));

const zonesWithoutPredictions = mohZoneList.filter(z => !predZoneSet.has(z));
const predictionsWithoutZone = [...predZoneSet].filter(z => !mohZoneList.includes(z));

const predDistricts = [...new Set(predZones.map(p => p.district))];

console.log('═══════════════════════════════════════════════════');
console.log('6) MOH ZONE vs PREDICTIONS COVERAGE');
console.log('═══════════════════════════════════════════════════');
console.log(`   MohZone collection    : ${allMohZones.length} zones across ${[...new Set(allMohZones.map(z => z.district))].length} districts`);
console.log(`   Latest predictions    : ${predZoneSet.size} zone-predictions across ${predDistricts.length} districts`);
console.log(`   Zones WITHOUT preds   : ${zonesWithoutPredictions.length}`);
if (zonesWithoutPredictions.length > 0 && zonesWithoutPredictions.length <= 50) {
  zonesWithoutPredictions.forEach(z => console.log(`     ❌ ${z}`));
}
console.log(`   Preds WITHOUT zone    : ${predictionsWithoutZone.length}`);
if (predictionsWithoutZone.length > 0 && predictionsWithoutZone.length <= 50) {
  predictionsWithoutZone.forEach(z => console.log(`     ⚠️  ${z}`));
}
console.log('');

// ── 7. Check DengueCase zone names vs MohZone zone names ────────────
const caseZoneNames = await DengueCase.distinct('mohZone');
const mohZoneNames = new Set(allZoneNames);
const caseZonesNotInMoh = caseZoneNames.filter(z => z && !mohZoneNames.has(z));
const mohZonesNotInCases = allZoneNames.filter(z => !caseZoneNames.includes(z));

console.log('═══════════════════════════════════════════════════');
console.log('7) ZONE NAME MISMATCHES (DengueCase vs MohZone)');
console.log('═══════════════════════════════════════════════════');
console.log(`   Case zones NOT in MohZone collection: ${caseZonesNotInMoh.length}`);
if (caseZonesNotInMoh.length > 0) {
  caseZonesNotInMoh.slice(0, 30).forEach(z => console.log(`     ⚠️  "${z}"`));
}
console.log(`   MohZones NOT in DengueCase data: ${mohZonesNotInCases.length}`);
if (mohZonesNotInCases.length > 0) {
  mohZonesNotInCases.slice(0, 30).forEach(z => console.log(`     ⚠️  "${z}"`));
}
console.log('');

// ── 8. Summary ──────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════');
console.log('8) SUMMARY OF POTENTIAL ISSUES');
console.log('═══════════════════════════════════════════════════');
const issues = [];
if (missingWeather.length > 0)
  issues.push(`${missingWeather.length} district(s) missing weather data → those districts get NO predictions`);
if (zonesWithZeroCases.length > 0)
  issues.push(`${zonesWithZeroCases.length} zone(s) have zero dengue cases in last 52 weeks → all lag features are 0`);
if (zeroOrNullRisk.length > 0)
  issues.push(`${zeroOrNullRisk.length} prediction(s) have riskScore=0 or null`);
if (zonesWithoutPredictions.length > 0)
  issues.push(`${zonesWithoutPredictions.length} MohZone(s) have no predictions at all`);
if (predictionsWithoutZone.length > 0)
  issues.push(`${predictionsWithoutZone.length} prediction(s) refer to non-existent MohZones`);
if (caseZonesNotInMoh.length > 0)
  issues.push(`${caseZonesNotInMoh.length} case zone name(s) don't match MohZone collection (spelling mismatch?)`);
if (mohZonesNotInCases.length > 0)
  issues.push(`${mohZonesNotInCases.length} MohZone(s) have no matching DengueCase records`);
if (issues.length === 0) {
  console.log('   ✅ No obvious data gaps detected!');
} else {
  issues.forEach((issue, i) => console.log(`   ${i + 1}. ⚠️  ${issue}`));
}

await mongoose.disconnect();
console.log('\n✅ Done. Disconnected from MongoDB.');
process.exit(0);
