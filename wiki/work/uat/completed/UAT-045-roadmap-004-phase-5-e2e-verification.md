---
id: UAT-045
title: "UAT: ROADMAP-004 Phase 5 — End-to-End Verification: Full Pipeline Smoke Test"
status: pending
task: TASK-045
created: 2026-06-25
updated: 2026-06-25
---

# UAT-045 — UAT: ROADMAP-004 Phase 5 — End-to-End Verification: Full Pipeline Smoke Test

implements::[[TASK-045]]

> **Source task**: [[TASK-045]]
> **Generated**: 2026-06-25

This UAT drives the **complete Generation Engine pipeline** from a cold start (new job) through to a downloaded DOCX output. It verifies four specific correctness properties: (1) byte-exact boilerplate in §7 / CCP §999, (2) grounded medical narrative in §4, (3) `nullGetter` fail-closed on a missing slot, and (4) cost dashboard rows for all three LLM features.

> **Environment**: SAM local (`sam local start-api --env-vars env.json`) on port **3000**. Postgres must be running locally. AWS credentials must be active for Bedrock calls and S3 access.

---

## Prerequisites

- [ ] SAM local API is running: `sam build && sam local start-api --env-vars env.json --port 3000`
- [ ] Local Postgres `demand_letter_dev` is up and reachable (verify: `psql $DATABASE_URL -c "SELECT 1"`)
- [ ] AWS credentials are configured (`aws sts get-caller-identity` succeeds) with Bedrock and S3 access
- [ ] The Pat Donahue fixture files are present:
  - `raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx` (tagged template)
  - `raw/pat-donahue/medical-records.pdf`
  - `raw/pat-donahue/medical-bills.pdf`
  - `raw/pat-donahue/police-incident-report.pdf`
  - `raw/pat-donahue/insurance-declarations.pdf`
- [ ] `jq` is installed (`jq --version` succeeds)
- [ ] `unzip` is available (`unzip -v` succeeds)
- [ ] Export a shell variable for the base URL: `export API=http://localhost:3000`

---

## Test Cases

---

### UAT-INT-001: Create a new job

- **Endpoint**: `POST /jobs`
- **Description**: Creates a fresh job record and returns its ID. This ID is used for all subsequent steps.
- **Steps**:
  1. Run the command below.
  2. Save the returned `id` value: `export JOB_ID=<value from .id>`
- **Command**:
  ```bash
  curl -sS -X POST "$API/jobs" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 201 with JSON body `{ "id": "<cuid>" }`. The `id` must be a non-empty string.
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-INT-002: Upload template DOCX and case-record PDFs

- **Endpoint**: `POST /jobs/{id}/files`
- **Description**: Uploads the Pat Donahue tagged template and all four case PDFs. The handler assigns `role: "template"` to the DOCX and `role: "case_doc"` to PDFs.
- **Steps**:
  1. Substitute `$JOB_ID` with the value from UAT-INT-001.
  2. Run the command below (uploads all five files in one multipart call — split into two calls if needed).
  3. Confirm the response lists five file records, one with `role: "template"`.
- **Command**:
  ```bash
  curl -sS -X POST "$API/jobs/$JOB_ID/files" \
    -F 'file=@raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document' \
    -F 'file=@raw/pat-donahue/medical-records.pdf;type=application/pdf' \
    -F 'file=@raw/pat-donahue/medical-bills.pdf;type=application/pdf' \
    -F 'file=@raw/pat-donahue/police-incident-report.pdf;type=application/pdf' \
    -F 'file=@raw/pat-donahue/insurance-declarations.pdf;type=application/pdf'
  ```
- **Expected Result**: HTTP 201 with `{ "files": [ ... ] }` containing five entries. One entry must have `"role": "template"`. Four must have `"role": "case_doc"`.
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-INT-003: Ingest documents — build blocks from uploaded files

- **Endpoint**: `POST /jobs/{id}/documents/ingest`
- **Description**: Reads all S3 files under the job prefix, parses native PDFs synchronously, and queues scanned PDFs for async Textract. Should produce >0 blocks for the native-PDF files.
- **Steps**:
  1. Run the command below.
  2. Note the `processed`, `pending`, and `blocks` values.
  3. If `pending > 0`, wait for Textract to complete (SNS → Lambda trigger). Re-check `GET /jobs/$JOB_ID/blocks` until all source files reach `status: "complete"`.
- **Command**:
  ```bash
  curl -sS -X POST "$API/jobs/$JOB_ID/documents/ingest"
  ```
- **Expected Result**: HTTP 200 with `{ "processed": N, "pending": M, "blocks": B }` where `B > 0`. At least one file must be processed synchronously.
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-INT-004: Inject template tags and classify zones

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/inject` then `POST /jobs/{id}/templates/{templateId}/classify`
- **Description**: First, inject docxtemplater `{tag}` markers into the template DOCX and persist a `Template` + `Zone` + `TemplateSlot` records. Then classify each zone (boilerplate vs. fill slot). After classification the template's zones must have `type` values set.
- **Steps**:
  1. Get the template file ID from the files uploaded in UAT-INT-002: the file with `role: "template"`.
  2. Run inject (replace `$TEMPLATE_FILE_ID` with the `id` field of the template file record):
     ```bash
     curl -sS -X POST "$API/jobs/$JOB_ID/templates/$TEMPLATE_FILE_ID/inject"
     ```
     Save the returned template `id` as `export TEMPLATE_ID=<value>`.
  3. Run classify:
     ```bash
     curl -sS -X POST "$API/jobs/$JOB_ID/templates/$TEMPLATE_ID/classify"
     ```
- **Expected Result**:
  - Inject: HTTP 200 or 201 with a template record containing a non-empty `id`.
  - Classify: HTTP 200 with an array of zone objects; each must have a non-null `type` field (e.g. `"boilerplate"` or `"fill"`).
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-INT-005: Extract fields from blocks

- **Endpoint**: `POST /jobs/{id}/extract`
- **Description**: Runs grounded LLM extraction over all ingested blocks and writes `extracted_fields` rows. Each field row must carry `blockIds` citations.
- **Steps**:
  1. Run the command below.
  2. Confirm `filledFields > 0`.
- **Command**:
  ```bash
  curl -sS -X POST "$API/jobs/$JOB_ID/extract"
  ```
- **Expected Result**: HTTP 200 with `{ "jobId": "...", "totalFields": N, "filledFields": F, "nullFields": Z }` where `F > 0`. No `error` key in the response.
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-INT-006: Check gap report — resolve any open gaps

- **Endpoint**: `GET /jobs/{id}/gap-report`
- **Description**: Lists template slots that are not yet covered by extracted fields or attorney judgment. Any gaps must be resolved before generation can proceed.
- **Steps**:
  1. Run the command below.
  2. If `gaps` is non-empty, for each gap field, submit an attorney judgment (see command in sub-step).
  3. Re-run gap report until `gaps` is empty (`"gaps": []`).
- **Command**:
  ```bash
  curl -sS "$API/jobs/$JOB_ID/gap-report"
  ```
- **Sub-step** (fill gaps with attorney judgment — repeat for each missing field):
  ```bash
  curl -sS -X POST "$API/jobs/$JOB_ID/attorney-judgment" \
    -H 'Content-Type: application/json' \
    -d '{"fields":[{"fieldName":"<fieldName>","value":"<test value>"}],"acceptMissing":[]}'
  ```
  The attorney-judgment sub-step returns `{ "ok": true }`.
- **Expected Result**: Final gap report response is HTTP 200 with `{ "covered": N, "total": N, "gaps": [] }` — `gaps` must be an empty array. `covered` must equal `total`.
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-INT-007: Happy-path generation — full pipeline smoke test

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Triggers the full generation pipeline: medical narrative via Bedrock, docxtemplater fill, DOCX upload to S3, `jobs.status = 'complete'`. Response is an SSE stream ending with `event: complete`.
- **Steps**:
  1. Run the command below. The response body will be the raw SSE stream.
  2. Confirm the body contains `data:` lines (the narrative chunks) and ends with `event: complete`.
  3. Save the SSE body for inspection.
  4. After the call returns, verify DB state: `psql $DATABASE_URL -c "SELECT status, output_s3_key FROM jobs WHERE id='$JOB_ID'"`
- **Command**:
  ```bash
  curl -sS -X POST "$API/jobs/$JOB_ID/generate" -H 'Accept: text/event-stream'
  ```
- **Expected Result**:
  - HTTP 200 with `Content-Type: text/event-stream`.
  - Body contains multiple `data: ...` lines followed by `event: complete\ndata: \n\n`.
  - DB: `jobs.status = 'complete'` and `outputS3Key` is non-null (format: `<jobId>/output/demand-letter.docx`).
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-INT-008: Download the output DOCX via presigned URL

- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Returns a pre-signed S3 URL (expires in 900 s) for the rendered DOCX. The URL must be downloadable and the file must be a valid DOCX.
- **Steps**:
  1. Run the command below and pipe to jq to extract the URL.
  2. Download the DOCX via the presigned URL: `curl -sS -o /tmp/smoke-test-output.docx "<presigned-url>"`
  3. Verify it is a valid ZIP/DOCX: `unzip -t /tmp/smoke-test-output.docx | grep 'No errors'`
- **Command**:
  ```bash
  curl -sS "$API/jobs/$JOB_ID/output" | jq -r '.url'
  ```
- **Expected Result**:
  - HTTP 200 with `{ "url": "https://..." }`.
  - The URL is non-empty and starts with `https://`.
  - The downloaded file passes `unzip -t` (valid ZIP structure, no errors).
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Byte-exact boilerplate check — §7 settlement conditions and CCP §999

- **Scenario**: Boilerplate zones in the output DOCX must be bit-for-bit identical to the original template. Any LLM paraphrase of boilerplate is a failure.
- **Steps**:
  1. Ensure `smoke-test-output.docx` exists at `/tmp/smoke-test-output.docx` (from UAT-INT-008).
  2. Unzip both files:
     ```bash
     unzip -o /tmp/smoke-test-output.docx -d /tmp/output-docx
     unzip -o raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx -d /tmp/template-docx
     ```
  3. Extract the §7 paragraph text from both `word/document.xml` files:
     ```bash
     grep -o '<w:t[^>]*>[^<]*Settlement[^<]*</w:t>\|<w:t[^>]*>[^<]*CCP.*999[^<]*</w:t>' /tmp/template-docx/word/document.xml > /tmp/template-boilerplate.txt
     grep -o '<w:t[^>]*>[^<]*Settlement[^<]*</w:t>\|<w:t[^>]*>[^<]*CCP.*999[^<]*</w:t>' /tmp/output-docx/word/document.xml > /tmp/output-boilerplate.txt
     ```
  4. Diff the two:
     ```bash
     diff /tmp/template-boilerplate.txt /tmp/output-boilerplate.txt
     ```
  5. If the diff is empty, the test passes. If diff shows any text-content differences, the test fails.
  6. Alternative (XML-aware): Open both `word/document.xml` files in a text editor, search for `Settlement` and `999`, and compare the surrounding paragraph text manually.
- **Expected Result**: `diff` produces no output (files are identical for boilerplate paragraphs). No text in §7 or CCP §999 paragraphs differs between template and output.
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Medical narrative grounding check — §4 content is traceable to extracted_fields

- **Scenario**: Every fact in the §4 medical narrative (diagnoses, provider names, treatment dates, dollar amounts) must be traceable to a `block_id` in `extracted_fields`. No hallucinated facts.
- **Steps**:
  1. Extract §4 text from the output DOCX's `word/document.xml`:
     ```bash
     python3 -c "
     import zipfile, re, sys
     with zipfile.ZipFile('/tmp/smoke-test-output.docx') as z:
         xml = z.read('word/document.xml').decode('utf-8')
     # Find text between §4 heading and §5 heading
     match = re.search(r'(?s)(?<=IV\.|§4|SECTION 4)(.+?)(?=V\.|§5|SECTION 5)', xml)
     texts = re.findall(r'<w:t[^>]*>([^<]+)</w:t>', match.group(0) if match else xml)
     print(' '.join(texts))
     " > /tmp/section4-text.txt
     cat /tmp/section4-text.txt
     ```
  2. Query extracted fields for this job:
     ```bash
     psql $DATABASE_URL -c "SELECT field_name, value, block_ids FROM extracted_fields WHERE job_id='$JOB_ID' ORDER BY field_name;"
     ```
  3. Read the §4 text and list all specific factual claims: diagnoses, provider names, dates, dollar amounts.
  4. For each claim, verify it appears in the `extracted_fields` results (matching on `value` or a field that logically contains it).
  5. Flag any claim in §4 that cannot be traced to any `extracted_fields` row.
- **Expected Result**: Every diagnosis, provider name, treatment date, and dollar amount mentioned in §4 matches a value in `extracted_fields` for this `$JOB_ID`. Zero untraced claims (hallucinations).
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: nullGetter fail-closed — missing required slot returns HTTP 500 with structured error

- **Scenario**: If the assembled data object is missing a required template slot, `renderTemplate` must throw a `TemplateRenderError`, the handler must return HTTP 500 with `{ error: "template_render_failed", errors: [...] }`, and `jobs.status` must be set to `"failed"` (not `"complete"`).
- **Steps**:
  1. Create a fresh job for this test:
     ```bash
     export NULL_GETTER_JOB_ID=$(curl -sS -X POST "$API/jobs" | jq -r '.id')
     echo "NULL_GETTER_JOB_ID=$NULL_GETTER_JOB_ID"
     ```
  2. Upload the template DOCX (no case docs needed — we want generation to fail at render):
     ```bash
     curl -sS -X POST "$API/jobs/$NULL_GETTER_JOB_ID/files" \
       -F 'file=@raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document'
     ```
  3. Inject and classify the template (so `Template` and `TemplateSlot` records exist — required for the sufficiency gate to pass — use the real `TEMPLATE_FILE_ID` from the upload above):
     ```bash
     export NULL_TMPL_FILE_ID=$(curl -sS "$API/jobs/$NULL_GETTER_JOB_ID/files" 2>/dev/null | jq -r '.files[] | select(.role=="template") | .id' || echo "see files response")
     curl -sS -X POST "$API/jobs/$NULL_GETTER_JOB_ID/templates/$NULL_TMPL_FILE_ID/inject"
     ```
  4. Do NOT fill any extracted fields. Accept all slots as missing via attorney judgment (`acceptMissing`):
     ```bash
     curl -sS "$API/jobs/$NULL_GETTER_JOB_ID/gap-report" | jq -r '[.gaps[].fieldName]'
     ```
     Then for each field in the gap list, mark all as accepted-missing EXCEPT for one that matches a real template tag (so the sufficiency gate is satisfied but the data object is still missing the actual tag value at render time):
     ```bash
     curl -sS -X POST "$API/jobs/$NULL_GETTER_JOB_ID/attorney-judgment" \
       -H 'Content-Type: application/json' \
       -d '{"fields":[],"acceptMissing":["<all_gap_fields_from_above>"]}'
     ```
     > Note: `acceptMissing` tells the sufficiency gate the gap is acknowledged, but the `data` object passed to `renderTemplate` will still have the tag missing, triggering `nullGetter`.
  5. Trigger generation:
     ```bash
     curl -sS -X POST "$API/jobs/$NULL_GETTER_JOB_ID/generate"
     ```
  6. Verify DB: `psql $DATABASE_URL -c "SELECT status FROM jobs WHERE id='$NULL_GETTER_JOB_ID'"`
- **Expected Result**:
  - HTTP 500 response with body `{ "error": "template_render_failed", "errors": [...] }` where `errors` is a non-empty array.
  - DB: `jobs.status = 'failed'` (not `'complete'` or `'processing'`).
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-EDGE-004: Cost dashboard — medical_narrative rows are present alongside zone_classification and case_extraction

- **Endpoint**: `GET /admin/llm-costs`
- **Description**: After the happy-path generation run in UAT-INT-007, the LLM audit log must contain rows for all three features: `medical_narrative`, `zone_classification`, and `case_extraction`. All must have non-zero token counts and cost estimates.
- **Steps**:
  1. Run the command below (uses default 30-day window which includes the current test run).
  2. Inspect `aggregates` for the three required features.
  3. Inspect `recentRows` to spot-check `inputTokens`, `outputTokens`, `estimatedCostUsd` for a `medical_narrative` row.
- **Command**:
  ```bash
  curl -sS "$API/admin/llm-costs" | jq '{features: [.aggregates[].feature], medical_narrative_rows: [.recentRows[] | select(.feature=="medical_narrative") | {inputTokens,outputTokens,estimatedCostUsd}]}'
  ```
- **Expected Result**:
  - `features` array contains `"medical_narrative"`, `"zone_classification"`, and `"case_extraction"` (all three, in any order).
  - `medical_narrative_rows` is non-empty.
  - Each `medical_narrative` row has `inputTokens > 0`, `outputTokens > 0`, and `estimatedCostUsd > 0`.
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-EDGE-005: Generation pre-check — gap report blocks generation when gaps exist

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: The generate handler must reject the request with HTTP 400 and `error: "sufficiency_precheck_failed"` if there are any uncovered gaps. This prevents hallucination by fail-fast before any LLM call.
- **Steps**:
  1. Create a fresh job with the template uploaded and injected, but NO extracted fields and NO attorney judgments (leave gaps open):
     ```bash
     export GAP_JOB_ID=$(curl -sS -X POST "$API/jobs" | jq -r '.id')
     curl -sS -X POST "$API/jobs/$GAP_JOB_ID/files" \
       -F 'file=@raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document'
     ```
  2. Inject template tags (do not classify — slots must exist but be uncovered):
     ```bash
     export GAP_TMPL_FILE_ID=$(curl -sS "$API/jobs/$GAP_JOB_ID/files" 2>/dev/null | jq -r '.files[0].id' || echo "unknown")
     curl -sS -X POST "$API/jobs/$GAP_JOB_ID/templates/$GAP_TMPL_FILE_ID/inject"
     ```
  3. Attempt generation without filling any fields:
     ```bash
     curl -sS -X POST "$API/jobs/$GAP_JOB_ID/generate"
     ```
- **Expected Result**: HTTP 400 with body `{ "error": "sufficiency_precheck_failed", "message": "...", "gaps": [...] }`. The `gaps` array must be non-empty. No LLM call was made (no new `llmAuditLog` rows for this `GAP_JOB_ID`).
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->

---

### UAT-EDGE-006: Output endpoint returns 404 before generation completes

- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Before a job's DOCX has been generated and stored, `GET /jobs/{id}/output` must return 404 with `{ "error": "output_not_ready" }` rather than a broken URL.
- **Steps**:
  1. Use the `GAP_JOB_ID` from UAT-EDGE-005 (job exists but generation was rejected — no `outputS3Key`).
  2. Run the command below.
- **Command**:
  ```bash
  curl -sS "$API/jobs/$GAP_JOB_ID/output"
  ```
- **Expected Result**: HTTP 404 with body `{ "error": "output_not_ready" }`.
- [FAIL: auto-judge: prerequisite not satisfied — AWS credentials expired (aws sts get-caller-identity returned error)] <!-- 2026-06-25 -->
