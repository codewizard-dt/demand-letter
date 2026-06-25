import fs from 'fs';
import path from 'path';
import { parseDocxToZones } from '../src/lib/docx-parser';

const docxPath = path.resolve(__dirname, '../../../raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx');
const buffer = fs.readFileSync(docxPath);
const zones = parseDocxToZones(buffer);

console.log(`Total zones: ${zones.length}`);
if (zones.length < 20) {
  console.error('FAIL: expected at least 20 zones from Pat Donahue template');
  process.exit(1);
}

let pass = 0;
let fail = 0;

for (const zone of zones.slice(0, 30)) {
  // zoneIndex is always a number
  if (typeof zone.zoneIndex !== 'number') { console.error(`FAIL zone ${zone.zoneIndex}: zoneIndex not a number`); fail++; continue; }

  // textContent should equal concatenation of run texts
  const expected = zone.runs.map(r => r.text).join('');
  if (zone.textContent !== expected) {
    console.error(`FAIL zone ${zone.zoneIndex}: textContent mismatch`);
    fail++;
    continue;
  }

  // each run must have a valid runPath
  let runOk = true;
  for (const run of zone.runs) {
    if (run.runPath.paragraphIndex !== zone.zoneIndex) {
      console.error(`FAIL zone ${zone.zoneIndex} run ${run.runIndex}: runPath.paragraphIndex mismatch`);
      fail++;
      runOk = false;
      break;
    }
    if (run.runPath.runIndex !== run.runIndex) {
      console.error(`FAIL zone ${zone.zoneIndex} run ${run.runIndex}: runPath.runIndex mismatch`);
      fail++;
      runOk = false;
      break;
    }
    if (typeof run.bold !== 'boolean' || typeof run.italic !== 'boolean') {
      console.error(`FAIL zone ${zone.zoneIndex} run ${run.runIndex}: bold/italic not boolean`);
      fail++;
      runOk = false;
      break;
    }
  }
  if (runOk) pass++;
}

console.log(`Checked 30 zones: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

// Print a sample zone for visual inspection
console.log('\nSample zone 5:');
console.log(JSON.stringify(zones[5], null, 2));
console.log('\nAll assertions passed.');
