---
id: UAT-112
title: "UAT: Refactor Zone model — multi-variable templateText"
status: pending
task: TASK-112
created: 2026-06-30
updated: 2026-06-30
---

# UAT-112 — UAT: Refactor Zone model — multi-variable templateText

implements::[[TASK-112]]

> **Source task**: [[TASK-112]]
> **Generated**: 2026-06-30

---

## Prerequisites

- [ ] Server running at `http://127.0.0.1:3000` (e.g. `sam local start-api` or the project dev command)
- [ ] A job exists with at least one template that has zones. Export env vars:
  ```bash
  export JOB_ID="<your job UUID>"
  export TEMPLATE_ID="<your template UUID>"
  export ZONE_ID="<ID of a variable_populated zone with a non-null suggestedFieldName>"
  export ZONE_ID_A="<ID of first zone>"
  export ZONE_ID_B="<ID of a second zone adjacent to zone A>"
  ```
- [ ] `$ZONE_ID` has `type: 'variable_populated'` and a non-null `suggestedFieldName` (e.g. `claimant_name`)
- [ ] `$ZONE_ID_A` and `$ZONE_ID_B` share the same `suggestedFieldName` (needed for UAT-INT-002)

---

## Test Cases

### UAT-API-001: Lazy migration — null templateText is auto-promoted on PATCH

- **Endpoint**: `PATCH /jobs/:id/templates/:templateId/zones`
- **Description**: Sending `templateText: null` for a `variable_populated` zone that has `suggestedFieldName` set causes the server to auto-promote `templateText` to `{suggestedFieldName}`.
- **Steps**:
  1. Identify the zone's `suggestedFieldName` (e.g. `claimant_name`). Record it.
  2. Run the curl below — it explicitly passes `templateText: null` with `suggestedFieldName: "claimant_name"`.
  3. Check the response array's first element: `templateText` must be `"{claimant_name}"`, not `null`.
- **Command**:
  ```bash
  curl -sS -X PATCH "http://127.0.0.1:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/zones" -H 'Content-Type: application/json' -d "{\"zones\":[{\"id\":\"$ZONE_ID\",\"type\":\"variable_populated\",\"suggestedFieldName\":\"claimant_name\",\"templateText\":null,\"confirmed\":false}]}"
  ```
- **Expected Result**: HTTP 200. Response array zone has `templateText === '{claimant_name}'` (not `null`) and `suggestedFieldName === 'claimant_name'`.
- **Repeatable Unit Test**: Not applicable — tests Prisma update semantics at the route boundary; no isolated unit to extract.
- [ ] Pass

---

### UAT-API-002: Multi-variable templateText is saved verbatim on PATCH

- **Endpoint**: `PATCH /jobs/:id/templates/:templateId/zones`
- **Description**: Sending an explicit multi-variable `templateText` string stores it unchanged.
- **Steps**:
  1. Send the curl below with a three-field template string.
  2. Inspect the response `templateText`.
- **Command**:
  ```bash
  curl -sS -X PATCH "http://127.0.0.1:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/zones" -H 'Content-Type: application/json' -d "{\"zones\":[{\"id\":\"$ZONE_ID\",\"type\":\"variable_populated\",\"suggestedFieldName\":\"incident_date\",\"templateText\":\"On {incident_date} at {incident_location}, {claimant_name} was injured.\",\"confirmed\":true}]}"
  ```
- **Expected Result**: HTTP 200. Response zone has `templateText === 'On {incident_date} at {incident_location}, {claimant_name} was injured.'` and `suggestedFieldName === 'incident_date'` and `confirmed === true`.
- **Repeatable Unit Test**: Not applicable — pass-through storage, no domain logic to unit-test.
- [ ] Pass

---

### UAT-API-003: Omitting templateText from PATCH payload leaves existing value unchanged

- **Endpoint**: `PATCH /jobs/:id/templates/:templateId/zones`
- **Description**: When `templateText` is absent from the patch payload (key omitted, not sent as `null`), the server leaves the existing DB value untouched.
- **Steps**:
  1. Run UAT-API-002 first so the zone has `templateText = 'On {incident_date} at {incident_location}, {claimant_name} was injured.'`
  2. Send the curl below — only `confirmed` changes, `templateText` key is omitted entirely.
  3. Verify the response still shows the templateText from step 1.
- **Command**:
  ```bash
  curl -sS -X PATCH "http://127.0.0.1:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/zones" -H 'Content-Type: application/json' -d "{\"zones\":[{\"id\":\"$ZONE_ID\",\"confirmed\":false}]}"
  ```
- **Expected Result**: HTTP 200. Response zone `templateText` is still `'On {incident_date} at {incident_location}, {claimant_name} was injured.'` — identical to what was set in UAT-API-002. It is not `null` and not overwritten.
- **Repeatable Unit Test**: Not applicable — tests Prisma `undefined` sentinel semantics at the route boundary.
- [ ] Pass

---

### UAT-INT-001: Generation stream fully renders all {field} placeholders in multi-variable templateText

- **Endpoint**: `POST /jobs/:id/generate` → `GET /jobs/:id/generate/stream`
- **Description**: A confirmed zone with multi-variable `templateText` must produce a `zone` SSE event whose `content` has every `{field_name}` token replaced with the real value from the job's data object — no raw placeholder tokens in the output.
- **Steps**:
  1. Run UAT-API-002 to set the zone's `templateText` to `'On {incident_date} at {incident_location}, {claimant_name} was injured.'` with `confirmed: true`.
  2. Trigger generation:
     ```bash
     curl -sS -X POST "http://127.0.0.1:3000/jobs/$JOB_ID/generate"
     ```
  3. Stream the output and capture zone events:
     ```bash
     curl -sS -N "http://127.0.0.1:3000/jobs/$JOB_ID/generate/stream"
     ```
  4. Find the SSE `data:` line where `type === 'zone'` and `zoneIndex` matches the patched zone. Inspect `content`.
- **Expected Result**: The matching `zone` event `content` contains the actual field values (e.g. `"On January 15, 2024 at Main Street, Jane Doe was injured."`). None of the raw tokens `{incident_date}`, `{incident_location}`, or `{claimant_name}` appear in the content.
- **Repeatable Unit Test**: Created: `app/server/src/lib/zone-classifier.test.ts` — the new `'preserves templateText with multiple {field} placeholders across normalizeClassification'` test validates the classifier side. The `renderZoneContent` helper is a private module function; its multi-variable behavior is verified here end-to-end.
- [ ] Pass

---

### UAT-INT-002: Consecutive zones sharing the same suggestedFieldName both produce output

- **Endpoint**: `POST /jobs/:id/generate` → `GET /jobs/:id/generate/stream`
- **Description**: The old `clearSet` deduplication suppressed zones whose `suggestedFieldName` had appeared recently. That code is removed. Both zones must now produce non-empty `zone` events.
- **Steps**:
  1. PATCH both `$ZONE_ID_A` and `$ZONE_ID_B` with the same `suggestedFieldName` and confirm both:
     ```bash
     curl -sS -X PATCH "http://127.0.0.1:3000/jobs/$JOB_ID/templates/$TEMPLATE_ID/zones" -H 'Content-Type: application/json' -d "{\"zones\":[{\"id\":\"$ZONE_ID_A\",\"type\":\"variable_populated\",\"suggestedFieldName\":\"claimant_name\",\"templateText\":null,\"confirmed\":true},{\"id\":\"$ZONE_ID_B\",\"type\":\"variable_populated\",\"suggestedFieldName\":\"claimant_name\",\"templateText\":null,\"confirmed\":true}]}"
     ```
  2. Trigger generation:
     ```bash
     curl -sS -X POST "http://127.0.0.1:3000/jobs/$JOB_ID/generate"
     ```
  3. Stream the output:
     ```bash
     curl -sS -N "http://127.0.0.1:3000/jobs/$JOB_ID/generate/stream"
     ```
  4. Find `zone` events for both zone indices of `$ZONE_ID_A` and `$ZONE_ID_B`.
- **Expected Result**: The stream contains `zone` events for BOTH zone indices. Both have a non-empty `content` equal to the claimant name value. Neither zone is suppressed or produces an empty string.
- **Repeatable Unit Test**: Not applicable — requires live generation pipeline; no isolated unit.
- [ ] Pass

---

### UAT-UI-001: ZoneConfigCard shows "Variables detected" chips for multi-variable templateText

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: When a `variable_populated` zone has `templateText` with multiple `{field_name}` tokens, the ZoneConfigCard renders a chip row showing each detected variable.
- **Steps**:
  1. Open the annotate page for a job whose `$ZONE_ID` now has multi-variable `templateText` (after UAT-API-002).
  2. Locate the zone card.
  3. Observe the template text content-editable area (now shown as the primary field).
  4. Look for the chip row below it.
- **Expected Result**: A "Variables detected" (or similar) chip row is visible below the templateText textarea. It shows individual chips for each `{field_name}` token — e.g. `{incident_date}`, `{incident_location}`, `{claimant_name}`. Chips use a distinct style (blue border/background per the component). No chip row appears for boilerplate zones.
- **Repeatable Unit Test**: Not applicable — requires browser rendering.
- [ ] Pass

---

### UAT-UI-002: Insert variable quick-add appends {varname} to templateText

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: The "Insert variable" input allows an attorney to append a new `{field_name}` placeholder to the zone's `templateText`.
- **Steps**:
  1. Open the annotate page and find a `variable_populated` zone card.
  2. Locate the "Insert variable" text input (placeholder text "Insert variable").
  3. Type `at_fault_party` into the input.
  4. Press Enter or click the `+ Insert` button next to it.
  5. Observe the templateText content area and the "Variables detected" chips row.
- **Expected Result**: `{at_fault_party}` is appended to the zone's `templateText`. A new chip for `{at_fault_party}` appears in the "Variables detected" row. The "Insert variable" input is cleared after insertion. The PATCH call sent to the server includes `suggestedFieldName` equal to the first `{field}` match in the updated templateText.
- **Repeatable Unit Test**: Not applicable — requires browser interaction.
- [ ] Pass

---

### UAT-UI-003: templateText textarea is the primary editable field for variable zones

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: The `templateText` content-editable is the primary (topmost) input for `variable_populated` zones, not a secondary field.
- **Steps**:
  1. Open the annotate page.
  2. Find a `variable_populated` zone card (any zone whose type toggle shows "variable" or "mixed").
  3. Observe the vertical ordering of inputs inside the card's config section.
- **Expected Result**: The template text content-editable area is the first/topmost editable input in the card. A "Variables detected" chip row appears directly below it. The "Insert variable" quick-add input and button appear below the chips. There is no standalone "field name" text input above the template text area.
- **Repeatable Unit Test**: Not applicable — visual layout test.
- [ ] Pass
