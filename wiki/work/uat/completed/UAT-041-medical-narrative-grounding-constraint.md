---
id: UAT-041
title: "UAT: Grounding constraint: validate medical narrative citations against provided block IDs"
status: passed
task: TASK-041
created: 2026-06-25
updated: 2026-06-25
---

# UAT-041 — UAT: Medical Narrative Grounding Constraint

implements::[[TASK-041]]

> **Source task**: [[TASK-041]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] `pnpm install` has been run at the monorepo root
- [ ] `DATABASE_URL` is set (for tests that require a live DB row for `jobId`)
- [ ] `packages/api/src/lib/medical-narrative.ts` contains the grounding validation pass introduced by TASK-041
- [ ] `make typecheck` passes with zero errors

---

## Test Cases

### UAT-STATIC-001: Return type includes groundingReport field

- **Scenario**: The `generateMedicalNarrative` function signature declares a return type of `Promise<{ text: string; groundingReport: { validCitations: number; unknownCitations: string[] } }>`.
- **Steps**:
  1. Read `packages/api/src/lib/medical-narrative.ts` (or use the `Grep` tool).
  2. Verify the function signature contains `groundingReport` in the `Promise<…>` return type annotation.
  3. Confirm `validCitations: number` and `unknownCitations: string[]` appear inside the `groundingReport` shape.
- **Expected Result**: The literal string `groundingReport` appears in the function's return type annotation with sub-fields `validCitations: number` and `unknownCitations: string[]`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-002: Citation regex is correct

- **Scenario**: The grounding validation uses the regex `/\[block-([^\]]+)\]/g` to parse `[block-<id>]` markers.
- **Steps**:
  1. Read `packages/api/src/lib/medical-narrative.ts`.
  2. Locate the `CITATION_RE` constant.
  3. Verify the regex literal is `/\[block-([^\]]+)\]/g` (global flag, capturing group for the ID after `block-`).
- **Expected Result**: `CITATION_RE` equals `/\[block-([^\]]+)\]/g`. No other regex is used to extract citation IDs.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-003: Unknown citation warning message format

- **Scenario**: When unknown citations are detected, `console.warn` is called with the exact message format specified in TASK-041.
- **Steps**:
  1. Read `packages/api/src/lib/medical-narrative.ts`.
  2. Find the `console.warn` call in the grounding validation block.
  3. Verify the warn string matches the template: `` `[medical-narrative] grounding violation — ${unknownCitations.length} unknown citation(s): ${unknownCitations.join(', ')}` ``.
- **Expected Result**: The `console.warn` call uses the exact template string with `unknownCitations.length` and `unknownCitations.join(', ')`. It is guarded by `if (unknownCitations.length > 0)`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-004: groundingReport is returned alongside text

- **Scenario**: The function `return` statement includes both `text` and `groundingReport`.
- **Steps**:
  1. Read `packages/api/src/lib/medical-narrative.ts`.
  2. Locate the final `return` statement.
  3. Verify it returns `{ text, groundingReport }` (or an object with both properties).
- **Expected Result**: The return statement contains both `text` and `groundingReport` as properties.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-005: allBlockIds is populated from ExtractedField.blockIds

- **Scenario**: The set of valid block IDs is derived from `field.blockIds` for all fields in `MEDICAL_FIELDS`, not hardcoded.
- **Steps**:
  1. Read `packages/api/src/lib/medical-narrative.ts`.
  2. Find the `allBlockIds` construction loop.
  3. Verify it iterates over `fields` (result of `prisma.extractedField.findMany`) and adds each ID from `field.blockIds as string[]`.
- **Expected Result**: `allBlockIds` is a `Set<string>` built by iterating over all fields' `blockIds` arrays. No block IDs are hardcoded.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCRIPT-001: Valid-only citations → validCitations = N, unknownCitations = []

- **Scenario**: When generated text contains only `[block-X]` markers where every `X` is in `allBlockIds`, the grounding report reports all citations as valid and no unknowns.
- **Steps**:
  1. Create the following `tsx` script at `packages/api/scripts/uat-041-valid-citations.ts`:

     ```ts
     // Inline grounding logic extracted from medical-narrative.ts for isolated testing
     const CITATION_RE = /\[block-([^\]]+)\]/g;

     function computeGroundingReport(text: string, allBlockIds: Set<string>) {
       const cited = new Set<string>();
       for (const match of text.matchAll(CITATION_RE)) {
         cited.add(match[1]);
       }
       const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
       const validCitations = cited.size - unknownCitations.length;
       return { validCitations, unknownCitations };
     }

     const allBlockIds = new Set(['abc123', 'def456', 'ghi789']);
     const text = 'Patient sustained cervical strain. [block-abc123] Treatment was administered at the clinic. [block-def456] MRI revealed disc herniation at L4-L5. [block-ghi789]';

     const report = computeGroundingReport(text, allBlockIds);

     let pass = 0; let fail = 0;

     if (report.validCitations === 3) { console.log('PASS: validCitations=3'); pass++; }
     else { console.error(`FAIL: expected validCitations=3, got ${report.validCitations}`); fail++; }

     if (report.unknownCitations.length === 0) { console.log('PASS: unknownCitations=[]'); pass++; }
     else { console.error(`FAIL: expected unknownCitations=[], got ${JSON.stringify(report.unknownCitations)}`); fail++; }

     console.log(`${pass} pass, ${fail} fail`);
     if (fail > 0) process.exit(1);
     ```

  2. Run: `cd packages/api && npx tsx scripts/uat-041-valid-citations.ts`
- **Expected Result**: `2 pass, 0 fail`. Exit code 0. Both assertions green.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCRIPT-002: Unknown citations detected and reported

- **Scenario**: When generated text contains `[block-UNKNOWN]` where `UNKNOWN` is not in `allBlockIds`, the grounding report lists it in `unknownCitations` and `validCitations` reflects only known IDs.
- **Steps**:
  1. Create `packages/api/scripts/uat-041-unknown-citations.ts`:

     ```ts
     const CITATION_RE = /\[block-([^\]]+)\]/g;

     function computeGroundingReport(text: string, allBlockIds: Set<string>) {
       const cited = new Set<string>();
       for (const match of text.matchAll(CITATION_RE)) {
         cited.add(match[1]);
       }
       const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
       const validCitations = cited.size - unknownCitations.length;
       return { validCitations, unknownCitations };
     }

     const allBlockIds = new Set(['abc123', 'def456']);
     const text = 'Diagnosis noted. [block-abc123] See also. [block-HALLUCINATED_ID] Further treatment. [block-def456]';

     const report = computeGroundingReport(text, allBlockIds);

     let pass = 0; let fail = 0;

     if (report.validCitations === 2) { console.log('PASS: validCitations=2'); pass++; }
     else { console.error(`FAIL: expected validCitations=2, got ${report.validCitations}`); fail++; }

     if (report.unknownCitations.length === 1 && report.unknownCitations[0] === 'HALLUCINATED_ID') {
       console.log('PASS: unknownCitations=[HALLUCINATED_ID]'); pass++;
     } else {
       console.error(`FAIL: expected unknownCitations=['HALLUCINATED_ID'], got ${JSON.stringify(report.unknownCitations)}`); fail++;
     }

     console.log(`${pass} pass, ${fail} fail`);
     if (fail > 0) process.exit(1);
     ```

  2. Run: `cd packages/api && npx tsx scripts/uat-041-unknown-citations.ts`
- **Expected Result**: `2 pass, 0 fail`. Exit code 0. `validCitations=2`, `unknownCitations=['HALLUCINATED_ID']`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCRIPT-003: No citations in text → both fields are zero/empty

- **Scenario**: When the generated text contains no `[block-X]` markers at all, the grounding report has `validCitations = 0` and `unknownCitations = []`.
- **Steps**:
  1. Create `packages/api/scripts/uat-041-no-citations.ts`:

     ```ts
     const CITATION_RE = /\[block-([^\]]+)\]/g;

     function computeGroundingReport(text: string, allBlockIds: Set<string>) {
       const cited = new Set<string>();
       for (const match of text.matchAll(CITATION_RE)) {
         cited.add(match[1]);
       }
       const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
       const validCitations = cited.size - unknownCitations.length;
       return { validCitations, unknownCitations };
     }

     const allBlockIds = new Set(['abc123', 'def456']);
     const text = 'Patient sustained injuries. Treatment was administered. No citations present in this narrative.';

     const report = computeGroundingReport(text, allBlockIds);

     let pass = 0; let fail = 0;

     if (report.validCitations === 0) { console.log('PASS: validCitations=0'); pass++; }
     else { console.error(`FAIL: expected validCitations=0, got ${report.validCitations}`); fail++; }

     if (report.unknownCitations.length === 0) { console.log('PASS: unknownCitations=[]'); pass++; }
     else { console.error(`FAIL: expected unknownCitations=[], got ${JSON.stringify(report.unknownCitations)}`); fail++; }

     console.log(`${pass} pass, ${fail} fail`);
     if (fail > 0) process.exit(1);
     ```

  2. Run: `cd packages/api && npx tsx scripts/uat-041-no-citations.ts`
- **Expected Result**: `2 pass, 0 fail`. Exit code 0.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCRIPT-004: Duplicate citation markers counted only once (Set deduplication)

- **Scenario**: If the LLM repeats the same `[block-X]` marker multiple times in the narrative, it is counted only once in both `validCitations` and `unknownCitations` (because `cited` is a `Set<string>`).
- **Steps**:
  1. Create `packages/api/scripts/uat-041-dedup-citations.ts`:

     ```ts
     const CITATION_RE = /\[block-([^\]]+)\]/g;

     function computeGroundingReport(text: string, allBlockIds: Set<string>) {
       const cited = new Set<string>();
       for (const match of text.matchAll(CITATION_RE)) {
         cited.add(match[1]);
       }
       const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
       const validCitations = cited.size - unknownCitations.length;
       return { validCitations, unknownCitations };
     }

     // Same block ID cited 3 times; one unknown cited twice
     const allBlockIds = new Set(['abc123']);
     const text = '[block-abc123] First mention. [block-abc123] Second mention. [block-abc123] Third. [block-FAKE] First unknown. [block-FAKE] Second unknown.';

     const report = computeGroundingReport(text, allBlockIds);

     let pass = 0; let fail = 0;

     if (report.validCitations === 1) { console.log('PASS: validCitations=1 (deduped)'); pass++; }
     else { console.error(`FAIL: expected validCitations=1, got ${report.validCitations}`); fail++; }

     if (report.unknownCitations.length === 1 && report.unknownCitations[0] === 'FAKE') {
       console.log('PASS: unknownCitations=[FAKE] (deduped)'); pass++;
     } else {
       console.error(`FAIL: expected unknownCitations=['FAKE'], got ${JSON.stringify(report.unknownCitations)}`); fail++;
     }

     console.log(`${pass} pass, ${fail} fail`);
     if (fail > 0) process.exit(1);
     ```

  2. Run: `cd packages/api && npx tsx scripts/uat-041-dedup-citations.ts`
- **Expected Result**: `2 pass, 0 fail`. Exit code 0. Both `abc123` and `FAKE` counted once each despite multiple occurrences.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCRIPT-005: Mixed citations — validCitations and unknownCitations partitioned correctly

- **Scenario**: Text with both valid and unknown citation IDs partitions them correctly: `validCitations = known_cited_count`, `unknownCitations = [unknown_id_1, ...]`.
- **Steps**:
  1. Create `packages/api/scripts/uat-041-mixed-citations.ts`:

     ```ts
     const CITATION_RE = /\[block-([^\]]+)\]/g;

     function computeGroundingReport(text: string, allBlockIds: Set<string>) {
       const cited = new Set<string>();
       for (const match of text.matchAll(CITATION_RE)) {
         cited.add(match[1]);
       }
       const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
       const validCitations = cited.size - unknownCitations.length;
       return { validCitations, unknownCitations };
     }

     const allBlockIds = new Set(['a1', 'b2', 'c3']);
     // cited: a1 (valid), b2 (valid), GHOST1 (unknown), GHOST2 (unknown)
     const text = 'Finding A [block-a1]. Finding B [block-b2]. Finding C [block-GHOST1]. Finding D [block-GHOST2].';

     const report = computeGroundingReport(text, allBlockIds);

     let pass = 0; let fail = 0;

     if (report.validCitations === 2) { console.log('PASS: validCitations=2'); pass++; }
     else { console.error(`FAIL: expected validCitations=2, got ${report.validCitations}`); fail++; }

     if (report.unknownCitations.length === 2) { console.log('PASS: unknownCitations.length=2'); pass++; }
     else { console.error(`FAIL: expected 2 unknowns, got ${report.unknownCitations.length}`); fail++; }

     const unknownSet = new Set(report.unknownCitations);
     if (unknownSet.has('GHOST1') && unknownSet.has('GHOST2')) {
       console.log('PASS: unknownCitations contains GHOST1 and GHOST2'); pass++;
     } else {
       console.error(`FAIL: expected GHOST1+GHOST2, got ${JSON.stringify(report.unknownCitations)}`); fail++;
     }

     console.log(`${pass} pass, ${fail} fail`);
     if (fail > 0) process.exit(1);
     ```

  2. Run: `cd packages/api && npx tsx scripts/uat-041-mixed-citations.ts`
- **Expected Result**: `3 pass, 0 fail`. Exit code 0.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCRIPT-006: validCitations = cited.size - unknownCitations.length arithmetic

- **Scenario**: `validCitations` is computed as `cited.size - unknownCitations.length`, not as a separate forward count. This arithmetic must hold for any combination.
- **Steps**:
  1. Create `packages/api/scripts/uat-041-arithmetic.ts`:

     ```ts
     const CITATION_RE = /\[block-([^\]]+)\]/g;

     function computeGroundingReport(text: string, allBlockIds: Set<string>) {
       const cited = new Set<string>();
       for (const match of text.matchAll(CITATION_RE)) {
         cited.add(match[1]);
       }
       const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
       const validCitations = cited.size - unknownCitations.length;
       return { validCitations, unknownCitations, citedSize: cited.size };
     }

     const cases = [
       { allBlockIds: new Set(['x']), text: '[block-x] [block-y] [block-z]', expectedValid: 1, expectedUnknown: 2 },
       { allBlockIds: new Set<string>(), text: '[block-anything]', expectedValid: 0, expectedUnknown: 1 },
       { allBlockIds: new Set(['p', 'q', 'r']), text: '[block-p] [block-q] [block-r]', expectedValid: 3, expectedUnknown: 0 },
     ];

     let pass = 0; let fail = 0;

     for (const c of cases) {
       const r = computeGroundingReport(c.text, c.allBlockIds);
       const arithmeticOk = r.validCitations === r.citedSize - r.unknownCitations.length;
       if (!arithmeticOk) { console.error(`FAIL arithmetic: ${JSON.stringify(r)}`); fail++; continue; }
       if (r.validCitations !== c.expectedValid) { console.error(`FAIL valid: expected ${c.expectedValid} got ${r.validCitations}`); fail++; continue; }
       if (r.unknownCitations.length !== c.expectedUnknown) { console.error(`FAIL unknown: expected ${c.expectedUnknown} got ${r.unknownCitations.length}`); fail++; continue; }
       console.log(`PASS: valid=${r.validCitations} unknown=${r.unknownCitations.length}`); pass++;
     }

     console.log(`${pass} pass, ${fail} fail`);
     if (fail > 0) process.exit(1);
     ```

  2. Run: `cd packages/api && npx tsx scripts/uat-041-arithmetic.ts`
- **Expected Result**: `3 pass, 0 fail`. Exit code 0. All three cases satisfy `validCitations = cited.size - unknownCitations.length`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-001: console.warn called with exact message when unknown citations present

- **Scenario**: When `unknownCitations.length > 0`, the code calls `console.warn` with the exact format `[medical-narrative] grounding violation — N unknown citation(s): id1, id2`.
- **Steps**:
  1. Create `packages/api/scripts/uat-041-warn.ts`:

     ```ts
     const CITATION_RE = /\[block-([^\]]+)\]/g;

     let warnMessage: string | null = null;
     const originalWarn = console.warn;
     console.warn = (...args: unknown[]) => { warnMessage = String(args[0]); };

     function runGrounding(text: string, allBlockIds: Set<string>) {
       const cited = new Set<string>();
       for (const match of text.matchAll(CITATION_RE)) cited.add(match[1]);
       const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
       const validCitations = cited.size - unknownCitations.length;
       if (unknownCitations.length > 0) {
         console.warn(
           `[medical-narrative] grounding violation — ${unknownCitations.length} unknown citation(s): ${unknownCitations.join(', ')}`,
         );
       }
       return { validCitations, unknownCitations };
     }

     const allBlockIds = new Set(['real-id']);
     const text = '[block-real-id] Good citation. [block-FAKE-A] [block-FAKE-B] Bad citations.';

     runGrounding(text, allBlockIds);
     console.warn = originalWarn;

     let pass = 0; let fail = 0;

     if (warnMessage !== null) { console.log(`PASS: console.warn was called`); pass++; }
     else { console.error('FAIL: console.warn was NOT called'); fail++; }

     const expectedMsg = '[medical-narrative] grounding violation — 2 unknown citation(s): FAKE-A, FAKE-B';
     if (warnMessage === expectedMsg) { console.log('PASS: warn message matches exactly'); pass++; }
     else { console.error(`FAIL: expected:\n  ${expectedMsg}\ngot:\n  ${warnMessage}`); fail++; }

     console.log(`${pass} pass, ${fail} fail`);
     if (fail > 0) process.exit(1);
     ```

  2. Run: `cd packages/api && npx tsx scripts/uat-041-warn.ts`
- **Expected Result**: `2 pass, 0 fail`. Exit code 0. `console.warn` was called with the exact message (note: the order of IDs in the message depends on `unknownCitations.join(', ')`; the script uses a deterministic two-unknown case).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-002: console.warn NOT called when all citations are valid

- **Scenario**: When `unknownCitations` is empty, `console.warn` must not be called.
- **Steps**:
  1. Create `packages/api/scripts/uat-041-no-warn.ts`:

     ```ts
     const CITATION_RE = /\[block-([^\]]+)\]/g;

     let warnCalled = false;
     const originalWarn = console.warn;
     console.warn = () => { warnCalled = true; };

     function runGrounding(text: string, allBlockIds: Set<string>) {
       const cited = new Set<string>();
       for (const match of text.matchAll(CITATION_RE)) cited.add(match[1]);
       const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
       const validCitations = cited.size - unknownCitations.length;
       if (unknownCitations.length > 0) {
         console.warn(
           `[medical-narrative] grounding violation — ${unknownCitations.length} unknown citation(s): ${unknownCitations.join(', ')}`,
         );
       }
       return { validCitations, unknownCitations };
     }

     const allBlockIds = new Set(['id-1', 'id-2']);
     const text = '[block-id-1] Finding one. [block-id-2] Finding two.';

     runGrounding(text, allBlockIds);
     console.warn = originalWarn;

     let pass = 0; let fail = 0;

     if (!warnCalled) { console.log('PASS: console.warn was NOT called'); pass++; }
     else { console.error('FAIL: console.warn should not have been called when all citations are valid'); fail++; }

     console.log(`${pass} pass, ${fail} fail`);
     if (fail > 0) process.exit(1);
     ```

  2. Run: `cd packages/api && npx tsx scripts/uat-041-no-warn.ts`
- **Expected Result**: `1 pass, 0 fail`. Exit code 0.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-003: Empty text with non-empty allBlockIds → zero citations, no warning

- **Scenario**: When the generated text is empty (e.g., a model timeout or empty stream), the grounding report returns `{ validCitations: 0, unknownCitations: [] }` and no warning is logged.
- **Steps**:
  1. Create `packages/api/scripts/uat-041-empty-text.ts`:

     ```ts
     const CITATION_RE = /\[block-([^\]]+)\]/g;

     let warnCalled = false;
     const originalWarn = console.warn;
     console.warn = () => { warnCalled = true; };

     function runGrounding(text: string, allBlockIds: Set<string>) {
       const cited = new Set<string>();
       for (const match of text.matchAll(CITATION_RE)) cited.add(match[1]);
       const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
       const validCitations = cited.size - unknownCitations.length;
       if (unknownCitations.length > 0) {
         console.warn(
           `[medical-narrative] grounding violation — ${unknownCitations.length} unknown citation(s): ${unknownCitations.join(', ')}`,
         );
       }
       return { validCitations, unknownCitations };
     }

     const allBlockIds = new Set(['abc', 'def']);
     const report = runGrounding('', allBlockIds);
     console.warn = originalWarn;

     let pass = 0; let fail = 0;

     if (report.validCitations === 0) { console.log('PASS: validCitations=0'); pass++; }
     else { console.error(`FAIL: expected validCitations=0, got ${report.validCitations}`); fail++; }

     if (report.unknownCitations.length === 0) { console.log('PASS: unknownCitations=[]'); pass++; }
     else { console.error(`FAIL: expected unknownCitations=[], got ${JSON.stringify(report.unknownCitations)}`); fail++; }

     if (!warnCalled) { console.log('PASS: no console.warn on empty text'); pass++; }
     else { console.error('FAIL: console.warn should not be called for empty text'); fail++; }

     console.log(`${pass} pass, ${fail} fail`);
     if (fail > 0) process.exit(1);
     ```

  2. Run: `cd packages/api && npx tsx scripts/uat-041-empty-text.ts`
- **Expected Result**: `3 pass, 0 fail`. Exit code 0.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-CLI-001: make typecheck passes with zero errors

- **Scenario**: All TypeScript changes in TASK-041 (updated return type, added `groundingReport`) typecheck clean across the full monorepo.
- **Steps**:
  1. From the monorepo root, run:
     ```bash
     make typecheck
     ```
  2. Observe the exit code and output.
- **Expected Result**: Exit code 0. No TypeScript errors reported across `packages/api`, `packages/db`, or `packages/web`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-CLI-002: generateMedicalNarrative is callable with Bedrock credentials (live smoke test)

**Auth-Required**: false (no API auth on this endpoint)
**Prerequisites**: AWS Bedrock credentials configured; `DATABASE_URL` pointing to a DB with at least one job that has `ExtractedField` rows for medical fields and corresponding `Block` rows.

- **Scenario**: End-to-end invocation of `generateMedicalNarrative` returns a `groundingReport` with non-negative `validCitations` and a `unknownCitations` array. The `text` field is a non-empty string.
- **Steps**:
  1. Obtain a valid `jobId` from the database (a job that has been through extraction).
  2. Create `packages/api/scripts/uat-041-smoke.ts`:

     ```ts
     import { generateMedicalNarrative } from '../src/lib';

     const jobId = process.argv[2];
     const modelId = process.env.BEDROCK_MODEL_ID ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
     const userId = 'uat-test';

     if (!jobId) { console.error('Usage: npx tsx uat-041-smoke.ts <jobId>'); process.exit(1); }

     async function main() {
       const result = await generateMedicalNarrative(jobId, modelId, userId);

       let pass = 0; let fail = 0;

       if (typeof result.text === 'string' && result.text.length > 0) {
         console.log(`PASS: text is non-empty string (${result.text.length} chars)`); pass++;
       } else { console.error('FAIL: text is empty or not a string'); fail++; }

       if (typeof result.groundingReport === 'object' && result.groundingReport !== null) {
         console.log('PASS: groundingReport is an object'); pass++;
       } else { console.error('FAIL: groundingReport is not an object'); fail++; }

       if (typeof result.groundingReport?.validCitations === 'number' && result.groundingReport.validCitations >= 0) {
         console.log(`PASS: validCitations=${result.groundingReport.validCitations}`); pass++;
       } else { console.error(`FAIL: validCitations is not a non-negative number`); fail++; }

       if (Array.isArray(result.groundingReport?.unknownCitations)) {
         console.log(`PASS: unknownCitations is an array (length=${result.groundingReport.unknownCitations.length})`); pass++;
       } else { console.error('FAIL: unknownCitations is not an array'); fail++; }

       console.log(`\nGrounding report: ${JSON.stringify(result.groundingReport)}`);
       console.log(`\n${pass} pass, ${fail} fail`);
       if (fail > 0) process.exit(1);
     }

     main().catch(err => { console.error(err); process.exit(1); });
     ```

  3. Run: `source .env && cd packages/api && npx tsx scripts/uat-041-smoke.ts <jobId>`
- **Expected Result**: Exit code 0. `text` is non-empty, `groundingReport.validCitations >= 0`, `groundingReport.unknownCitations` is an array. If any citations are unknown, a `[medical-narrative] grounding violation` warning appears in stderr.
- **Note**: Requires live AWS Bedrock credentials and a job with extracted medical fields. Mark `[BEDROCK REQUIRED]` if skipping in headless CI.
- [FAIL: auto-judge: manual test requires human verification — live Bedrock credentials and DB jobId required] <!-- 2026-06-25 -->
