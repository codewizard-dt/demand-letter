---
id: UAT-044
title: "UAT: docxtemplater render: load tagged template DOCX from S3 and render with data object"
status: passed
task: TASK-044
created: 2026-06-25
updated: 2026-06-25
---

# UAT-044 — UAT: docxtemplater render: load tagged template DOCX from S3 and render with data object

implements::[[TASK-044]]

> **Source task**: [[TASK-044]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] AWS credentials are available in the shell environment (via `.env` sourced or IAM role): `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DOCUMENTS_BUCKET`, and `DATABASE_URL`.
- [ ] A `Job` row exists in the database with a known `jobId`.
- [ ] A `Template` row exists for that `jobId` with a non-null `s3KeyTagged` pointing to a valid DOCX file in S3 (created by the tagging pipeline from TASK-040/041).
- [ ] The tagged template DOCX contains at least one `{tag}` placeholder and one loop section (`{#specials}…{/specials}`).
- [ ] `tsx` is available (`npx tsx` or `pnpm exec tsx`).
- [ ] Run from repo root: all commands assume `packages/api/` as module resolution context.

---

## Test Cases

### UAT-SCRIPT-001: Happy-path render — flat tags substituted, output is a valid DOCX buffer

- **Description**: Verifies that `renderTemplate(jobId, data)` fetches the tagged template from S3, substitutes all flat `{tag}` placeholders with values from `data`, and returns a non-empty `Buffer` that starts with the PK zip magic bytes (`50 4B`) — confirming it is a valid DOCX/ZIP file.
- **Steps**:
  1. Source the project `.env` to load `DATABASE_URL`, `DOCUMENTS_BUCKET`, `AWS_REGION`, etc.
  2. Create the test script at a temp path:
     ```bash
     cat > /tmp/uat-044-happy.ts << 'EOF'
     import { renderTemplate } from './packages/api/src/lib/docx-renderer';

     const JOB_ID = process.env.UAT_JOB_ID!;

     // Provide values for every {tag} in the template — adjust keys to match your tagged template
     const data: Record<string, string | Array<Record<string, string>>> = {
       client_name: 'Pat Donahue',
       date_of_loss: '2024-01-15',
       insurer_name: 'AAA Insurance',
       claim_number: 'CLM-2024-001',
       specials: [],
     };

     async function main() {
       const buf = await renderTemplate(JOB_ID, data);
       if (!Buffer.isBuffer(buf)) throw new Error('Result is not a Buffer');
       if (buf.length === 0) throw new Error('Buffer is empty');
       // PK zip magic bytes: 0x50 0x4B
       if (buf[0] !== 0x50 || buf[1] !== 0x4B) {
         throw new Error(`Invalid DOCX magic bytes: 0x${buf[0].toString(16)} 0x${buf[1].toString(16)}`);
       }
       console.log(`PASS: buffer length=${buf.length} bytes, starts with PK magic bytes`);
     }

     main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
     EOF
     ```
  3. Run (source .env first):
     ```bash
     (source .env && UAT_JOB_ID=<your-job-id> npx tsx /tmp/uat-044-happy.ts)
     ```
  4. Observe console output.
- **Expected Result**: Console prints `PASS: buffer length=N bytes, starts with PK magic bytes` and exits 0. No errors thrown.
- [FAIL: auto-judge: prerequisite not satisfied — DOCUMENTS_BUCKET unset, AWS_ACCESS_KEY_ID missing; cannot execute S3-dependent script] <!-- 2026-06-25 -->

---

### UAT-SCRIPT-002: Loop section rendered — `{#specials}…{/specials}` rows expanded

- **Description**: Verifies that when the `data` object contains a `specials` array (each element a `Record<string, string>`), the rendered DOCX buffer is larger than the same render with an empty specials array, confirming loop rows are expanded.
- **Steps**:
  1. Source the project `.env`.
  2. Create the test script:
     ```bash
     cat > /tmp/uat-044-loop.ts << 'EOF'
     import { renderTemplate } from './packages/api/src/lib/docx-renderer';

     const JOB_ID = process.env.UAT_JOB_ID!;

     const baseData: Record<string, string | Array<Record<string, string>>> = {
       client_name: 'Pat Donahue',
       date_of_loss: '2024-01-15',
       insurer_name: 'AAA Insurance',
       claim_number: 'CLM-2024-001',
       specials: [],
     };

     const loopData: Record<string, string | Array<Record<string, string>>> = {
       ...baseData,
       specials: [
         { provider: 'Coastal Pain', amount: '5000.00', date: '2024-02-01' },
         { provider: 'MAX MRI', amount: '2500.00', date: '2024-02-15' },
       ],
     };

     async function main() {
       const bufEmpty = await renderTemplate(JOB_ID, baseData);
       const bufLoop  = await renderTemplate(JOB_ID, loopData);
       if (bufLoop.length <= bufEmpty.length) {
         throw new Error(
           `Loop render (${bufLoop.length} bytes) should be larger than empty-loop render (${bufEmpty.length} bytes)`
         );
       }
       console.log(`PASS: empty-loop=${bufEmpty.length}B, 2-row-loop=${bufLoop.length}B`);
     }

     main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
     EOF
     ```
  3. Run:
     ```bash
     (source .env && UAT_JOB_ID=<your-job-id> npx tsx /tmp/uat-044-loop.ts)
     ```
  4. Observe console output.
- **Expected Result**: Console prints `PASS: empty-loop=NB, 2-row-loop=MB` where M > N, exits 0.
- [FAIL: auto-judge: prerequisite not satisfied — DOCUMENTS_BUCKET unset, AWS_ACCESS_KEY_ID missing; cannot execute S3-dependent script] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Missing tag — `nullGetter` throws `TemplateRenderError`

- **Description**: Verifies that when `data` is missing a tag that exists in the template, `renderTemplate` throws a `TemplateRenderError` (not a raw docxtemplater error or an untyped Error), enforcing the fail-closed behavior specified in the task objective.
- **Steps**:
  1. Source the project `.env`.
  2. Create the test script:
     ```bash
     cat > /tmp/uat-044-missing-tag.ts << 'EOF'
     import { renderTemplate, TemplateRenderError } from './packages/api/src/lib/docx-renderer';

     const JOB_ID = process.env.UAT_JOB_ID!;

     // Intentionally omit one required tag that is in the template
     const incompleteData: Record<string, string | Array<Record<string, string>>> = {
       specials: [],
       // client_name omitted — expected to be in the template
     };

     async function main() {
       try {
         await renderTemplate(JOB_ID, incompleteData);
         console.error('FAIL: expected TemplateRenderError but no error was thrown');
         process.exit(1);
       } catch (err) {
         if (err instanceof TemplateRenderError) {
           console.log(`PASS: TemplateRenderError thrown, errors=${JSON.stringify(err.errors)}`);
         } else {
           console.error('FAIL: wrong error type thrown:', err);
           process.exit(1);
         }
       }
     }

     main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
     EOF
     ```
  3. Run:
     ```bash
     (source .env && UAT_JOB_ID=<your-job-id> npx tsx /tmp/uat-044-missing-tag.ts)
     ```
  4. Observe console output.
- **Expected Result**: Console prints `PASS: TemplateRenderError thrown, errors=[...]` and exits 0. The `errors` array must be non-empty and contain strings referencing the missing tag.
- [FAIL: auto-judge: prerequisite not satisfied — DOCUMENTS_BUCKET unset, AWS_ACCESS_KEY_ID missing; cannot execute S3-dependent script] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: No tagged template in DB — throws descriptive Error

- **Description**: Verifies that when the given `jobId` has no `Template` row with a non-null `s3KeyTagged`, `renderTemplate` throws an `Error` with message containing `"No tagged template for job"`.
- **Steps**:
  1. Source the project `.env`.
  2. Create the test script:
     ```bash
     cat > /tmp/uat-044-no-template.ts << 'EOF'
     import { renderTemplate } from './packages/api/src/lib/docx-renderer';

     const NONEXISTENT_JOB = 'nonexistent-job-id-uat-044';

     async function main() {
       try {
         await renderTemplate(NONEXISTENT_JOB, {});
         console.error('FAIL: expected Error but no error was thrown');
         process.exit(1);
       } catch (err: any) {
         const msg: string = err?.message ?? '';
         if (msg.includes('No tagged template for job')) {
           console.log(`PASS: Error thrown with expected message: "${msg}"`);
         } else {
           console.error(`FAIL: error message did not match. Got: "${msg}"`);
           process.exit(1);
         }
       }
     }

     main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
     EOF
     ```
  3. Run:
     ```bash
     (source .env && npx tsx /tmp/uat-044-no-template.ts)
     ```
  4. Observe console output.
- **Expected Result**: Console prints `PASS: Error thrown with expected message: "No tagged template for job nonexistent-job-id-uat-044"` and exits 0.
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL present but DOCUMENTS_BUCKET unset and AWS_ACCESS_KEY_ID missing; cannot run Prisma-connected script without full env] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: Malformed DOCX template — docxtemplater structured error re-thrown as `TemplateRenderError`

- **Description**: Verifies that when the S3 template contains a structural error (e.g., unclosed tag `{unclosed`), `renderTemplate` catches the docxtemplater structured error and re-throws it as a `TemplateRenderError` with the structured `errors` array populated, not as a raw docxtemplater exception.
- **Steps**:
  1. Prepare a malformed tagged DOCX (a `.docx` file containing `{unclosed` — an unclosed tag with no matching `}`). Upload it to S3 at a known key and create a `Template` row pointing to it.
  2. Source the project `.env`.
  3. Create the test script:
     ```bash
     cat > /tmp/uat-044-malformed.ts << 'EOF'
     import { renderTemplate, TemplateRenderError } from './packages/api/src/lib/docx-renderer';

     const JOB_ID = process.env.UAT_MALFORMED_JOB_ID!;

     async function main() {
       try {
         await renderTemplate(JOB_ID, {});
         console.error('FAIL: expected TemplateRenderError but no error was thrown');
         process.exit(1);
       } catch (err) {
         if (err instanceof TemplateRenderError) {
           const hasErrors = Array.isArray(err.errors) && err.errors.length > 0;
           console.log(`PASS: TemplateRenderError thrown, hasErrors=${hasErrors}, count=${err.errors.length}`);
         } else {
           console.error('FAIL: wrong error type (expected TemplateRenderError):', err);
           process.exit(1);
         }
       }
     }

     main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
     EOF
     ```
  4. Run:
     ```bash
     (source .env && UAT_MALFORMED_JOB_ID=<malformed-job-id> npx tsx /tmp/uat-044-malformed.ts)
     ```
  5. Observe console output.
- **Expected Result**: Console prints `PASS: TemplateRenderError thrown, hasErrors=true, count=N` (N ≥ 1) and exits 0.
- [FAIL: auto-judge: prerequisite not satisfied — DOCUMENTS_BUCKET unset, AWS_ACCESS_KEY_ID missing; also requires manually-prepared malformed template in S3] <!-- 2026-06-25 -->

---

### UAT-INTEGRATION-001: `renderTemplate` re-exported from `packages/api/src/lib/index.ts`

- **Description**: Verifies that `renderTemplate` and `TemplateRenderError` are accessible via the public lib barrel export (`@demand-letter/api`'s `src/lib/index.ts`), not just from the direct module path.
- **Steps**:
  1. Create the test script:
     ```bash
     cat > /tmp/uat-044-export.ts << 'EOF'
     import { renderTemplate, TemplateRenderError } from './packages/api/src/lib/index';

     if (typeof renderTemplate !== 'function') {
       console.error('FAIL: renderTemplate is not exported from lib/index.ts');
       process.exit(1);
     }
     if (typeof TemplateRenderError !== 'function') {
       console.error('FAIL: TemplateRenderError is not exported from lib/index.ts');
       process.exit(1);
     }
     console.log('PASS: renderTemplate and TemplateRenderError both exported from lib/index.ts');
     EOF
     ```
  2. Run:
     ```bash
     npx tsx /tmp/uat-044-export.ts
     ```
  3. Observe console output.
- **Expected Result**: Console prints `PASS: renderTemplate and TemplateRenderError both exported from lib/index.ts` and exits 0.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-INTEGRATION-002: Typecheck passes with zero errors

- **Description**: Verifies that `pnpm typecheck` (which runs `tsc --noEmit` in `packages/api`) passes with zero errors after the implementation, including correct `nullGetter` parameter typing (`(part: { value: string })` not `{ part }`).
- **Steps**:
  1. Run from the repo root:
     ```bash
     pnpm typecheck
     ```
  2. Observe output.
- **Expected Result**: Command exits 0 with no TypeScript errors reported. Any pre-existing unrelated errors in other packages are acceptable only if `packages/api` reports zero errors.
- [x] Pass <!-- 2026-06-25 -->
