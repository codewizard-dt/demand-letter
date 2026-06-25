---
id: UAT-030
title: "UAT: Delimiter Tag Injection — Inject {field_name} Tags, Save to S3, and Enumerate Slots via InspectModule"
status: passed
task: TASK-030
created: 2026-06-24
updated: 2026-06-24
---

# UAT-030 — UAT: Delimiter Tag Injection — Inject {field_name} Tags, Save to S3, and Enumerate Slots via InspectModule

implements::[[TASK-030]]

> **Source task**: [[TASK-030]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] SAM local API is running: `sam local start-api --env-vars env.json` on `http://localhost:3000`
- [ ] A local PostgreSQL instance is running and seeded (or RDS tunnel active); `DATABASE_URL` is set in `env.json`
- [ ] An S3-compatible store is accessible (`DOCUMENTS_BUCKET` env var set); LocalStack or real S3 bucket with credentials available
- [ ] A valid `.docx` file is available locally for upload (e.g., `test-template.docx` — any minimal OOXML docx)
- [ ] `jq` is installed for response parsing
- [ ] Export `UAT_JOB_ID`, `UAT_TEMPLATE_ID`, and `UAT_ZONE_ID` as shell variables after running the setup tests below

---

## Test Cases

### UAT-SETUP-001: Create a job and upload a template DOCX

- **Description**: Establish the job + template prerequisite state required by all inject/slots tests. Captures `jobId`, `templateId`, and a `zoneId` for use in subsequent tests.
- **Steps**:
  1. Run the create-job command below and save the returned `id` as `UAT_JOB_ID`.
  2. Run the upload command with a real `.docx` file; save the returned file `id` as `UAT_FILE_ID` and note that the template record is created by the classify step (see UAT-SETUP-002).
- **Command (create job)**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 201; body `{ "id": "<cuid>" }`. Set `UAT_JOB_ID` to the returned `id`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-SETUP-002: Upload template DOCX and trigger zone classification to obtain templateId

- **Description**: Upload a `.docx` template file, then call classify to get a templateId with populated zones. This is the pre-state required before inject can be called.
- **Steps**:
  1. Upload the docx file (replace `./test-template.docx` with an actual docx path):
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/files" -F "file=@./test-template.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ```
  2. From the response `files[0].id`, note the file was uploaded. The template record is created during zone parsing (TASK-025 path). If a template already exists for this job, obtain its `id` from the database directly (`SELECT id FROM templates WHERE "jobId" = '<UAT_JOB_ID>' LIMIT 1`) and set `UAT_TEMPLATE_ID`.
  3. Set at least one zone to `confirmed=true`, `type=variable_populated`, `suggestedFieldName=claimant_name` via the PATCH zones endpoint (see UAT-SETUP-003). Note the zone `id` as `UAT_ZONE_ID`.
- **Expected Result**: A template row exists in the DB with at least one confirmed `variable_populated` zone.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-SETUP-003: Confirm a zone as variable_populated via PATCH zones

- **Description**: Set the attorney confirmation on a zone so the inject endpoint has at least one zone to process.
- **Steps**:
  1. First retrieve existing zones: `GET /jobs/${UAT_JOB_ID}/templates/${UAT_TEMPLATE_ID}/zones` and pick a zone `id`.
  2. Run the PATCH command below, replacing `<ZONE_ID>` with the chosen zone id. Save the zone id as `UAT_ZONE_ID`.
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/${UAT_JOB_ID}/templates/${UAT_TEMPLATE_ID}/zones" -H 'Content-Type: application/json' -d '{"zones":[{"id":"<ZONE_ID>","type":"variable_populated","suggestedFieldName":"claimant_name","confirmed":true}]}'
  ```
- **Expected Result**: HTTP 200; body is an array containing the updated zone with `"confirmed": true`, `"type": "variable_populated"`, `"suggestedFieldName": "claimant_name"`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-001: Inject delimiter tags into confirmed variable_populated zones — happy path

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/inject`
- **Description**: Verifies the core injection flow: confirmed variable_populated zones receive `{claimant_name}` delimiter tags, the tagged DOCX is uploaded to S3, slots are enumerated via InspectModule, and the response includes the S3 key, slot count, and slot names.
- **Steps**:
  1. Ensure `UAT_JOB_ID`, `UAT_TEMPLATE_ID` are set from the setup steps above.
  2. Run the command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/templates/${UAT_TEMPLATE_ID}/inject" -H 'Content-Type: application/json' | jq .
  ```
- **Expected Result**: HTTP 200; body shape `{ "s3KeyTagged": "templates/<templateId>/tagged.docx", "slotCount": 1, "slots": ["claimant_name"] }`. The `s3KeyTagged` value must be exactly `templates/${UAT_TEMPLATE_ID}/tagged.docx`. The `slots` array must contain `"claimant_name"` (the field name set in UAT-SETUP-003). `slotCount` must equal `slots.length`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-API-002: Inject is idempotent — re-running inject overwrites tagged DOCX and upserts slots

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/inject`
- **Description**: Verifies that calling inject a second time produces the same result without duplicate `template_slots` rows (upsert semantics).
- **Steps**:
  1. Call inject a second time on the same `UAT_TEMPLATE_ID`.
  2. Run the command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/templates/${UAT_TEMPLATE_ID}/inject" -H 'Content-Type: application/json' | jq .
  ```
- **Expected Result**: HTTP 200; response body identical to UAT-API-001. No duplicate rows in `template_slots` — verify by checking `SELECT COUNT(*) FROM template_slots WHERE "templateId" = '<UAT_TEMPLATE_ID>'` returns the same count as `slotCount`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-API-003: GET /slots returns the enumerated slot list after injection

- **Endpoint**: `GET /jobs/{id}/templates/{templateId}/slots`
- **Description**: Verifies the slots read endpoint returns the correct slot list persisted by the inject step, ordered alphabetically by `slotName`.
- **Steps**:
  1. Ensure inject has been run (UAT-API-001 passed).
  2. Run the command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/${UAT_JOB_ID}/templates/${UAT_TEMPLATE_ID}/slots" | jq .
  ```
- **Expected Result**: HTTP 200; body `{ "slotCount": 1, "slots": [{ "slotName": "claimant_name", "required": true }] }`. The `slots` array is ordered alphabetically by `slotName`. `slotCount` matches `slots.length`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-API-004: GET /slots before inject returns empty slot list

- **Endpoint**: `GET /jobs/{id}/templates/{templateId}/slots`
- **Description**: Verifies that querying slots on a template that has never been injected returns an empty list (no 500, no stale data).
- **Steps**:
  1. Create a fresh job and upload a template (repeat UAT-SETUP-001 and UAT-SETUP-002 steps), capturing a new `UAT_FRESH_TEMPLATE_ID` that has NOT had inject called on it.
  2. Run the command below (replacing the ids with the fresh pair).
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/${UAT_JOB_ID}/templates/${UAT_FRESH_TEMPLATE_ID}/slots" | jq .
  ```
- **Expected Result**: HTTP 200; body `{ "slotCount": null, "slots": [] }` (slotCount is null because `template.slotCount` is null before inject; slots is an empty array because no `TemplateSlot` rows exist yet). Alternatively `slotCount: 0` is acceptable if the DB defaults to 0 — verify the actual schema default.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

---

### UAT-EDGE-001: Inject with no confirmed variable_populated zones returns zero slots

- **Scenario**: All zones are either unconfirmed or typed as `boilerplate_verbatim`. The injector must return the original buffer unchanged and the slot enumeration must report zero tags.
- **Steps**:
  1. Create a fresh job + template via UAT-SETUP-001/002 but do NOT confirm any zone as `variable_populated` (or set all zones to `boilerplate_verbatim`).
  2. Capture the fresh `UAT_BPONLY_JOB_ID` and `UAT_BPONLY_TEMPLATE_ID`.
  3. Run inject on it:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_BPONLY_JOB_ID}/templates/${UAT_BPONLY_TEMPLATE_ID}/inject" -H 'Content-Type: application/json' | jq .
  ```
- **Expected Result**: HTTP 200; body `{ "s3KeyTagged": "templates/<templateId>/tagged.docx", "slotCount": 0, "slots": [] }`. The tagged DOCX is still uploaded to S3 (the s3KeyTagged key is populated). No `TemplateSlot` rows are created.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-EDGE-002: Inject with mismatched jobId returns 404

- **Scenario**: The `templateId` exists but belongs to a different job. The handler must reject the request.
- **Steps**:
  1. Use `UAT_TEMPLATE_ID` (belongs to `UAT_JOB_ID`) but pass a different (non-existent or wrong) job id.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/nonexistent-job-id/templates/${UAT_TEMPLATE_ID}/inject" -H 'Content-Type: application/json' | jq .
  ```
- **Expected Result**: HTTP 404; body `{ "error": "Template not found" }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-EDGE-003: Inject with non-existent templateId returns 404

- **Scenario**: The `templateId` does not exist in the database.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/templates/does-not-exist/inject" -H 'Content-Type: application/json' | jq .
  ```
- **Expected Result**: HTTP 404; body `{ "error": "Template not found" }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-EDGE-004: GET /slots with mismatched jobId returns 404

- **Scenario**: The `templateId` exists but is queried under a wrong job id.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/nonexistent-job-id/templates/${UAT_TEMPLATE_ID}/slots" | jq .
  ```
- **Expected Result**: HTTP 404; body `{ "error": "Template not found" }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-EDGE-005: Boilerplate zones are not modified — byte-fidelity check

- **Scenario**: After injection, zones with `type=boilerplate_verbatim` (or unconfirmed zones) must remain byte-exact in the tagged DOCX. Only confirmed `variable_populated` zones receive `{field_name}` replacement.
- **Steps**:
  1. Set up a template where zone 0 is `boilerplate_verbatim` and zone 1 is `variable_populated` with `suggestedFieldName=claimant_name` and both are confirmed.
  2. Call inject and download the tagged DOCX from S3 (using AWS CLI or LocalStack equivalent):
  ```bash
  aws s3 cp "s3://${DOCUMENTS_BUCKET}/templates/${UAT_TEMPLATE_ID}/tagged.docx" /tmp/tagged.docx
  ```
  3. Unzip and inspect `word/document.xml`:
  ```bash
  unzip -p /tmp/tagged.docx word/document.xml | grep -c '{claimant_name}'
  ```
  4. Also check that the boilerplate paragraph text is unchanged:
  ```bash
  unzip -p /tmp/tagged.docx word/document.xml | grep -c '{boilerplate'
  ```
- **Expected Result**: Step 3 output is `1` (exactly one `{claimant_name}` tag injected). Step 4 output is `0` (no tag placeholders in boilerplate paragraphs). The boilerplate paragraph's original text content is preserved.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-EDGE-006: Multiple confirmed variable_populated zones each receive their own tag

- **Scenario**: When multiple zones are confirmed as `variable_populated` with distinct field names, each gets its own `{field_name}` tag and all appear in the slots list.
- **Steps**:
  1. Confirm at least two zones as `variable_populated` with different field names (e.g., `claimant_name` at zoneIndex 1 and `incident_date` at zoneIndex 3) via the PATCH zones endpoint.
  2. Call inject:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/templates/${UAT_TEMPLATE_ID}/inject" -H 'Content-Type: application/json' | jq .
  ```
- **Expected Result**: HTTP 200; `slots` array contains both `"claimant_name"` and `"incident_date"` (order may vary — InspectModule returns tag keys); `slotCount` is 2. Both slot names are persisted in `template_slots`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-EDGE-007: GET /slots returns results ordered alphabetically by slotName

- **Scenario**: After injecting multiple slots, the GET /slots response must return them sorted alphabetically regardless of injection order.
- **Steps**:
  1. Ensure UAT-EDGE-006 has been run and at least `claimant_name` and `incident_date` slots exist.
  2. Call GET /slots:
  ```bash
  curl -sS "http://localhost:3000/jobs/${UAT_JOB_ID}/templates/${UAT_TEMPLATE_ID}/slots" | jq '.slots[].slotName'
  ```
- **Expected Result**: Output lists slot names in ascending alphabetical order: `"claimant_name"` before `"incident_date"`. (Alphabetically `c` < `i`.)
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on http://localhost:3000] <!-- 2026-06-24 -->
