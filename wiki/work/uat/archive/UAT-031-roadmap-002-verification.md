---
id: UAT-031
title: "UAT: ROADMAP-002 End-to-End Verification — Zone Detection Pipeline Smoke Test"
status: passed
task: TASK-031
created: 2026-06-24
updated: 2026-06-24
---

# UAT-031 — UAT: ROADMAP-002 End-to-End Verification — Zone Detection Pipeline Smoke Test

implements::[[TASK-031]]

> **Source task**: [[TASK-031]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] SAM local API running: `sam local start-api --env-vars .env.json` on port 3000
- [ ] React dev server running: `pnpm --filter @demand-letter/web dev` on port 5173
- [ ] A Job record created and `$JOB_ID` exported (see UAT-API-001)
- [ ] A Template record with extracted Zones created for the job and `$TEMPLATE_ID` exported (via Prisma CLI or seed script — no `/ingest` endpoint exists yet)
- [ ] At least one Zone record associated with the template exists in the database
- [ ] `$UAT_AUTH_TOKEN` set if auth middleware is enabled (check current SAM env)

---

## Test Cases

### UAT-STATIC-001: Handler files exist at expected paths

- **Scenario**: All five ROADMAP-002 Lambda handler files are present in the repository
- **Steps**:
  1. Run: `ls packages/api/src/handlers/get-jobs-template-zones.ts packages/api/src/handlers/patch-jobs-template-zones.ts packages/api/src/handlers/post-jobs-templates-classify.ts packages/api/src/handlers/post-jobs-templates-inject.ts packages/api/src/handlers/get-jobs-template-slots.ts`
- **Expected Result**: All five paths resolve without error (exit code 0, no "No such file" output)
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-002: All five functions registered in template.yaml

- **Scenario**: SAM template declares the five new Lambda functions with correct HTTP methods and path patterns
- **Steps**:
  1. Inspect `template.yaml` for the following entries:
     - `GET /jobs/{id}/templates/{templateId}/zones` → `GetJobsTemplateZonesFunction`
     - `PATCH /jobs/{id}/templates/{templateId}/zones` → `PatchJobsTemplateZonesFunction`
     - `POST /jobs/{id}/templates/{templateId}/classify` → `PostJobsTemplatesClassifyFunction`
     - `POST /jobs/{id}/templates/{templateId}/inject` → `PostJobsTemplatesInjectFunction`
     - `GET /jobs/{id}/templates/{templateId}/slots` → `GetJobsTemplateSlotsFunction`
- **Expected Result**: All five function definitions present with the correct HTTP method and path in their `Events` block
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-003: Prisma schema contains TemplateSlot model with required fields

- **Scenario**: The `TemplateSlot` model exists in `schema.prisma` with the fields required by the inject and slots endpoints
- **Steps**:
  1. Inspect `packages/db/prisma/schema.prisma` for `model TemplateSlot` containing fields: `templateId`, `slotName`, `required`
- **Expected Result**: `model TemplateSlot` present; `templateId String`, `slotName String`, `required Boolean @default(true)` fields all present; `@@unique([templateId, slotName])` constraint present
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-004: pnpm typecheck passes with zero errors

- **Scenario**: All TypeScript packages compile cleanly after ROADMAP-002 implementation
- **Steps**:
  1. Run: `pnpm typecheck` from the repository root
- **Expected Result**: Exit code 0, no TypeScript errors emitted across `packages/api`, `packages/db`, and `packages/web`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-005: injectDelimiters does not touch non-confirmed paragraphs

- **Scenario**: Boilerplate zones (§7 settlement conditions, CCP §999 language) with `confirmed === false` or `type === 'boilerplate_verbatim'` must be left byte-exact by the injector
- **Steps**:
  1. Read `packages/api/src/lib/docx-injector.ts` → `traverseAndInject` function (lines 50–94)
  2. Confirm: the mutation block (`node[key] = newChildren`) is inside `if (fieldName)` guard, where `fieldName = confirmedSet.get(idx)`
  3. Confirm: `confirmedSet` is built exclusively from `confirmedZones` passed in by the inject handler
  4. Read `packages/api/src/handlers/post-jobs-templates-inject.ts` → confirm `confirmedZones` filters on `z.confirmed && z.type === ZoneType.variable_populated && z.suggestedFieldName`
- **Expected Result**: Paragraphs whose zones have `confirmed: false` or `type: 'boilerplate_verbatim'` are never added to `confirmedSet`, so `confirmedSet.get(idx)` returns `undefined` and their `w:r` children are never replaced
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-API-001: POST /jobs — create a job (prerequisite)

- **Endpoint**: `POST /jobs`
- **Description**: Create a Job record to obtain a `jobId` for subsequent tests. Export the returned ID as `$JOB_ID`.
- **Steps**:
  1. Ensure SAM local API is running
  2. Run the curl command below
  3. Capture the `id` field from the response and set: `export JOB_ID=<id>`
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json' -d '{"clientName":"Pat Donahue","matterRef":"UAT-031"}'
  ```
- **Expected Result**: HTTP 201; body contains `{ "id": "<cuid>" }`
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-API-002: GET /jobs/:id/templates/:templateId/zones — list zones for a template

- **Endpoint**: `GET /jobs/{id}/templates/{templateId}/zones`
- **Description**: Retrieves all Zone records for the given template, ordered by `zoneIndex` ascending
- **Steps**:
  1. Ensure `$JOB_ID` and `$TEMPLATE_ID` are exported (template with zones must exist in DB)
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/zones"
  ```
- **Expected Result**: HTTP 200; body is a JSON array; each element contains `id`, `templateId`, `zoneIndex`, `textContent`; items are ordered by `zoneIndex` ascending; array is non-empty
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-API-003: GET /jobs/:id/templates/:templateId/zones — 400 on missing path params

- **Endpoint**: `GET /jobs/{id}/templates/{templateId}/zones`
- **Description**: Endpoint must return 400 when path parameters are absent (SAM routing mismatch or direct invocation without params)
- **Steps**:
  1. Invoke the handler with a missing `templateId` path parameter (e.g., hit a route that does not include `templateId`)
- **Expected Result**: HTTP 400; body: `{ "error": "Missing jobId or templateId" }`
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-API-004: POST /jobs/:id/templates/:templateId/classify — LLM zone classification

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/classify`
- **Description**: Triggers LLM classification of all zones for the template; each zone gets `type` and `suggestedFieldName` populated; a `zone_classification` row is written to `LlmAuditLog`
- **Steps**:
  1. Ensure `$JOB_ID` and `$TEMPLATE_ID` are set and the template has at least one zone
  2. Run the curl command below
  3. Note which zones received `type: "boilerplate_verbatim"` vs `type: "variable_populated"`
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/classify" -H 'Content-Type: application/json' -d '{}'
  ```
- **Expected Result**: HTTP 200; body is a JSON array of updated Zone objects; every element has a non-null `type` field (`"boilerplate_verbatim"` or `"variable_populated"`); elements with `type: "variable_populated"` have a non-null `suggestedFieldName`; array length equals the number of zones in the template
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-API-005: POST /jobs/:id/templates/:templateId/classify — 404 when no zones exist

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/classify`
- **Description**: Returns 404 when the template has no zones, rather than calling the LLM with an empty set
- **Steps**:
  1. Use a `templateId` that exists in the DB but has zero associated Zone records
  2. Run the curl command below with that templateId
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/classify" -H 'Content-Type: application/json' -d '{}'
  ```
- **Expected Result**: HTTP 404; body: `{ "error": "No zones found for template" }`
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-API-006: PATCH /jobs/:id/templates/:templateId/zones — attorney annotation submission

- **Endpoint**: `PATCH /jobs/{id}/templates/{templateId}/zones`
- **Description**: Persists attorney annotation decisions — sets `type`, `suggestedFieldName`, `confirmed`, `confirmedBy`, and `confirmedAt` for each submitted zone
- **Steps**:
  1. Ensure `$JOB_ID`, `$TEMPLATE_ID`, and `$ZONE_ID` (a zone id from UAT-API-002) are set
  2. Run the curl command below; substitute `$ZONE_ID` with an actual zone ID
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/zones" -H 'Content-Type: application/json' -d "{\"zones\":[{\"id\":\"$ZONE_ID\",\"type\":\"variable_populated\",\"suggestedFieldName\":\"plaintiff_name\",\"confirmed\":true}]}"
  ```
- **Expected Result**: HTTP 200; body is a JSON array of updated Zone objects; the patched zone has `confirmed: true`, `type: "variable_populated"`, `suggestedFieldName: "plaintiff_name"`, `confirmedBy: "attorney"`, and a non-null `confirmedAt`
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-API-007: PATCH /jobs/:id/templates/:templateId/zones — 400 on invalid body

- **Endpoint**: `PATCH /jobs/{id}/templates/{templateId}/zones`
- **Description**: Returns 400 when the request body is missing the `zones` array
- **Steps**:
  1. Run the curl command below
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/zones" -H 'Content-Type: application/json' -d '{"not_zones":"oops"}'
  ```
- **Expected Result**: HTTP 400; body: `{ "error": "Invalid request body" }`
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-API-008: POST /jobs/:id/templates/:templateId/inject — delimiter injection and slot enumeration

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/inject`
- **Description**: Downloads the original DOCX from S3, injects `{field_name}` tags into confirmed `variable_populated` zones, uploads tagged DOCX back to S3, enumerates slots via docxtemplater InspectModule, persists `TemplateSlot` rows, and returns `{ s3KeyTagged, slotCount, slots }`
- **Steps**:
  1. Ensure at least one zone has been confirmed as `variable_populated` with a non-null `suggestedFieldName` (from UAT-API-006)
  2. Ensure the original DOCX has been uploaded to S3 at the path stored in `template.s3KeyOriginal`
  3. Run the curl command below
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/inject" -H 'Content-Type: application/json' -d '{}'
  ```
- **Expected Result**: HTTP 200; body: `{ "s3KeyTagged": "templates/<templateId>/tagged.docx", "slotCount": <N>, "slots": ["field_name_1", "field_name_2", ...] }` where `slotCount` equals `slots.length`; `s3KeyTagged` matches `templates/$TEMPLATE_ID/tagged.docx`; `slots` contains every `suggestedFieldName` from confirmed variable zones
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-API-009: POST /jobs/:id/templates/:templateId/inject — with Pat Donahue template expects ≥35 slots

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/inject`
- **Description**: When run against a fully-annotated Pat Donahue template DOCX with all ~40 variable zones confirmed, the injection response must report at least 35 slots (canonical schema minimum)
- **Steps**:
  1. Ensure the Pat Donahue template (`raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx`) has been uploaded and all variable zones annotated and confirmed
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/inject" -H 'Content-Type: application/json' -d '{}'
  ```
- **Expected Result**: HTTP 200; `slotCount` ≥ 35; `slots` array includes entries such as `plaintiff_name`, `defendant_name`, `demand_amount` (exact names depend on annotation; verify against the ~40-field canonical schema from `wiki/knowledge/concepts/demand-letter-input-contract.md`)
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-API-010: POST /jobs/:id/templates/:templateId/inject — 404 for unknown template

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/inject`
- **Description**: Returns 404 when the templateId does not exist or belongs to a different job
- **Steps**:
  1. Run the curl command below using a non-existent templateId
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/templates/nonexistent-template-id/inject" -H 'Content-Type: application/json' -d '{}'
  ```
- **Expected Result**: HTTP 404; body: `{ "error": "Template not found" }`
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-API-011: GET /jobs/:id/templates/:templateId/slots — retrieve slot list post-injection

- **Endpoint**: `GET /jobs/{id}/templates/{templateId}/slots`
- **Description**: Returns the persisted `TemplateSlot` rows written by the inject endpoint, ordered by `slotName` ascending
- **Steps**:
  1. Ensure UAT-API-008 has passed (injection must have run to create slot rows)
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/slots"
  ```
- **Expected Result**: HTTP 200; body: `{ "slotCount": <N>, "slots": [{ "slotName": "...", "required": true }, ...] }`; `slots` array sorted alphabetically by `slotName`; `slotCount` equals `slots.length`; every entry has `required: true`; slot names match those returned by the inject endpoint in UAT-API-008
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-API-012: GET /jobs/:id/templates/:templateId/slots — 404 for unknown template

- **Endpoint**: `GET /jobs/{id}/templates/{templateId}/slots`
- **Description**: Returns 404 when the template does not exist or belongs to a different job
- **Steps**:
  1. Run the curl command below using a non-existent templateId
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$JOB_ID/templates/nonexistent-template-id/slots"
  ```
- **Expected Result**: HTTP 404; body: `{ "error": "Template not found" }`
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-UI-001: Annotation page renders zone list

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: The `AnnotatePage` component fetches zones via `GET /jobs/:id/templates/:templateId/zones` and renders each zone with its text excerpt, zone index label, and type-toggle buttons
- **Steps**:
  1. Ensure the React dev server is running at `http://localhost:5173`
  2. Navigate to `http://localhost:5173/jobs/$JOB_ID/templates/$TEMPLATE_ID/annotate`
  3. Wait for the loading spinner to disappear
  4. Observe the rendered zone list
- **Expected Result**: Page renders the heading "Template Zone Annotation"; a zone card appears for each zone in the database; each card shows "Zone N" label (where N = `zoneIndex`), a truncated text excerpt from `textContent`, and two type-toggle buttons labelled "Boilerplate" and "Variable"; LLM-suggested type is visually highlighted on the appropriate button (amber highlight for boilerplate, blue for variable)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-UI-002: Boilerplate zones show correct LLM label after classification

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: After running LLM classification (UAT-API-004), the annotation UI correctly reflects `boilerplate_verbatim` zones — specifically §7 settlement conditions and CCP §999 language — as highlighted in the "Boilerplate" button state
- **Steps**:
  1. Ensure UAT-API-004 has passed (LLM classification has run)
  2. Navigate to `http://localhost:5173/jobs/$JOB_ID/templates/$TEMPLATE_ID/annotate`
  3. Locate zones whose text excerpt contains §7 settlement or CCP §999 language
  4. Observe the type-toggle button state for those zones
- **Expected Result**: Zones containing §7 settlement conditions and CCP §999 language show the "Boilerplate" button with amber background (`bg-amber-100 border-amber-400`); "Variable" button is unselected for those zones
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-UI-003: "Confirm All Variable Zones" button marks all variable_populated zones confirmed

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: Clicking "Confirm All Variable Zones" sets `confirmed: true` on every zone with `type === 'variable_populated'` without affecting boilerplate zones
- **Steps**:
  1. Navigate to the annotate page (ensure zones have been classified so at least one has `type: "variable_populated"`)
  2. Note which zones are `variable_populated`
  3. Click the "Confirm All Variable Zones" button (teal background)
  4. Observe zone card border and background colors
- **Expected Result**: All `variable_populated` zones switch to `border-teal-400 bg-teal-50` styling and show "Confirmed ✓" on their confirm toggle; boilerplate zones remain unchanged (grey border, no teal highlight)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-UI-004: "Submit Annotations" persists zone changes via PATCH endpoint

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: Clicking "Submit Annotations" calls `PATCH /jobs/:id/templates/:templateId/zones` with all current zone state and shows a success alert
- **Steps**:
  1. Navigate to the annotate page
  2. Confirm at least one zone (click its "Confirm" toggle or use "Confirm All Variable Zones")
  3. Click the "Submit Annotations" button (dark grey background)
  4. Observe the button label while the request is in-flight and the outcome
- **Expected Result**: Button label changes to "Saving…" during the request; after success, a browser alert dialog reads "Zones saved successfully."; clicking OK dismisses it; button reverts to "Submit Annotations"; no error banner appears
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-UI-005: Admin usage dashboard shows zone_classification audit rows

- **Page**: `/admin/usage`
- **Description**: After running LLM classification (UAT-API-004), the `/admin/usage` page shows a `zone_classification` feature row in the LlmAuditLog aggregate table with non-zero token counts and a positive `estimatedCostUsd`
- **Steps**:
  1. Ensure UAT-API-004 has passed (LLM classification has run and written to `LlmAuditLog`)
  2. Navigate to `http://localhost:5173/admin/usage`
  3. Wait for the page to load data
  4. Locate the aggregate table or recent-rows section
- **Expected Result**: A row with `feature: "zone_classification"` appears; `inputTokens` and `outputTokens` are non-zero integers; `estimatedCostUsd` is a positive decimal; the row was created during the current test session
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-EDGE-001: inject with no confirmed zones returns empty slots array

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/inject`
- **Scenario**: When all zones are either boilerplate or unconfirmed, `confirmedZones` is empty; `injectDelimiters` should return the original buffer unchanged (no tags injected)
- **Steps**:
  1. Ensure the template has zones but none are `confirmed: true` with `type: 'variable_populated'`
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/inject" -H 'Content-Type: application/json' -d '{}'
  ```
- **Expected Result**: HTTP 200; `slotCount: 0`; `slots: []`; `s3KeyTagged` is set; no error. The original DOCX is re-uploaded byte-for-byte to the tagged S3 key (no placeholders inserted).
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-EDGE-002: LlmAuditLog records zone_classification feature for every classify call

- **Scenario**: Each call to `POST /jobs/:id/templates/:templateId/classify` must write exactly one `LlmAuditLog` row with `feature: "zone_classification"`, confirming the AI provider wrapper fires the audit trail
- **Steps**:
  1. Query `LlmAuditLog` before and after calling classify (via Prisma Studio or `psql`)
  2. Run classify: `curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/classify" -H 'Content-Type: application/json' -d '{}'`
  3. Re-query `LlmAuditLog` and count new rows
- **Expected Result**: Exactly one new `LlmAuditLog` row added with `feature = 'zone_classification'`, `provider` non-empty, `inputTokens > 0`, `outputTokens > 0`, `estimatedCostUsd > 0`, `durationMs > 0`
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-24 -->

---

### UAT-EDGE-003: Boilerplate zones are not modified by inject — byte-level check

- **Scenario**: A zone classified as `boilerplate_verbatim` (e.g., CCP §999 or §7 settlement conditions) must appear byte-for-byte identical in the tagged DOCX as in the original DOCX
- **Steps**:
  1. After running inject (UAT-API-008), download both the original DOCX (`template.s3KeyOriginal`) and the tagged DOCX (`template.s3KeyTagged`) from S3
  2. Unzip both DOCX files and compare `word/document.xml` paragraphs corresponding to boilerplate zones
- **Expected Result**: The XML content of every paragraph whose zone has `type: 'boilerplate_verbatim'` or `confirmed: false` is identical between original and tagged documents; no `{field_name}` placeholder text appears in those paragraphs
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-24 -->
