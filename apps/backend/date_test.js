function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getISOWeekYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

function isoWeekKey(date) {
  const w = getISOWeek(date);
  const y = getISOWeekYear(date);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

const d = new Date("2026-05-11T00:00:00.000Z");
console.log("Input:", d);
console.log("Local string:", d.toString());
console.log("ISO Week Key:", isoWeekKey(d));
