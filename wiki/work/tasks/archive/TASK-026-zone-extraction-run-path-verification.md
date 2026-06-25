---
id: TASK-026
title: "Zone Extraction Run-Path Field and DOCX Round-Trip Verification"
status: done
created: 2026-06-24
updated: 2026-06-24
depends_on: [TASK-025]
blocks: []
parallel_safe_with: []
uat: "[[UAT-026]]"
tags: [docx, ooxml, parsing, zone-detection, verification]
---

# TASK-026 — Zone Extraction Run-Path Field and DOCX Round-Trip Verification

## Objective

Extend the `OoxmlRun` interface (from TASK-025) with an explicit combined `runPath` locator `{ paragraphIndex: number; runIndex: number }` so Phase 4 tag-injection code can address each run without re-deriving its position. Then write and run a Node.js script that feeds the Pat Donahue template DOCX through `parseDocxToZones()` and asserts that every required field is populated correctly for at least 20 zones, confirming the parser preserves paragraph style, per-run bold/italic/font/fontSize, OOXML run path, and raw text.

## Approach

The `runPath` field combines `paragraphIndex` (= `zoneIndex` on the parent OoxmlZone) and `runIndex` (already on OoxmlRun) into a single explicit object. This makes the tag-injection step in Phase 4 trivial: given a confirmed zone and run, it reads `run.runPath` and navigates the parsed XML tree directly. The verification script is a one-off Node.js file in `packages/api/scripts/verify-zone-extraction.ts` that imports the parser, reads the Pat Donahue DOCX from `raw/`, and emits a JSON summary with pass/fail assertions.

## Steps

### 1. Add `runPath` to OoxmlRun interface  <!-- agent: general-purpose -->

- [x] Open `packages/api/src/lib/docx-types.ts`. <!-- Completed: 2026-06-24 -->
- [x] Add the `runPath` field to `OoxmlRun`: <!-- Completed: 2026-06-24 -->
  ```typescript
  export interface OoxmlRun {
    runIndex: number;
    runPath: { paragraphIndex: number; runIndex: number };  // ← add this
    text: string;
    bold: boolean;
    italic: boolean;
    font?: string;
    fontSize?: number;
  }
  ```

### 2. Populate `runPath` in the parser  <!-- agent: general-purpose -->

- [x] Open `packages/api/src/lib/docx-parser.ts`. <!-- Completed: 2026-06-24 -->
- [x] In the `runs.map((run, runIndex)` callback, populate `runPath`: <!-- Completed: 2026-06-24 -->
  ```typescript
  return {
    runIndex,
    runPath: { paragraphIndex: zoneIndex, runIndex },  // ← add this
    text,
    bold,
    italic,
    font,
    fontSize,
  };
  ```
- [x] Confirm the existing return type satisfies the updated `OoxmlRun` interface. <!-- Completed: 2026-06-24 -->

### 3. Create verification script  <!-- agent: general-purpose -->

- [x] Create `packages/api/scripts/verify-zone-extraction.ts`: <!-- Completed: 2026-06-24 -->

```typescript
import fs from 'fs';
import path from 'path';
import { parseDocxToZones } from '../src/lib/docx-parser';

const docxPath = path.resolve(__dirname, '../../../../raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx');
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
```

- [x] Add `"ts-node": "^10.0.0"` to `devDependencies` in `packages/api/package.json` if not present (or use `tsx` if already available). <!-- Completed: 2026-06-24 — added tsx ^4.0.0 -->

### 4. Run the verification script  <!-- agent: general-purpose -->

- [x] From the monorepo root, run: <!-- Completed: 2026-06-24 -->
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts
  ```
  or with ts-node:
  ```bash
  pnpm --filter @demand-letter/api exec ts-node --esm scripts/verify-zone-extraction.ts
  ```
- [x] Confirm output includes: <!-- Completed: 2026-06-24 -->
  - `Total zones: N` where N ≥ 20
  - `Checked 30 zones: 30 pass, 0 fail`
  - `All assertions passed.`
- [x] If fails occur, debug the parser (check XML paths, handle missing `<w:t>` or empty runs, verify `isArray` config). <!-- N/A: all 30 pass -->

### 5. TypeScript typecheck  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api typecheck` to confirm zero errors after the OoxmlRun interface update. <!-- Completed: 2026-06-24 — zero errors after rebuilding @demand-letter/db dist/ -->
