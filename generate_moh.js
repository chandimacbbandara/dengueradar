import fs from 'fs';

const CSV_PATH = '/home/chandima-bandara/Desktop/dengueradar/ml-pipeline/data/raw/dengueradar_training_table.csv';
const content = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = content.split('\n');

const districtMap = {};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const cols = line.split(',');
  let district = cols[4];
  let moh = cols[1];
  
  if (!district || !moh) continue;
  
  if (district === 'Moneragala') district = 'Monaragala';
  
  if (!districtMap[district]) districtMap[district] = new Set();
  districtMap[district].add(moh);
}

const result = [];
for (const district of Object.keys(districtMap).sort()) {
  result.push({
    district: district,
    zones: Array.from(districtMap[district]).sort()
  });
}

const jsContent = `/**
 * Generated from dengueradar_training_table.csv to perfectly match the ML dataset.
 * Total zones: ${result.reduce((s, d) => s + d.zones.length, 0)}
 */

const MOH_ZONES_DATA = ${JSON.stringify(result, null, 2)};

export default MOH_ZONES_DATA;
`;

fs.writeFileSync('/home/chandima-bandara/Desktop/dengueradar/apps/backend/src/data/mohZonesData.js', jsContent);
console.log('Successfully generated mohZonesData.js with ' + result.reduce((s, d) => s + d.zones.length, 0) + ' zones!');
