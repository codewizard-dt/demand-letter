---
id: UAT-029
title: "UAT: Attorney Annotation UI — Zone Review and Confirmation Page"
status: passed
task: TASK-029
created: 2026-06-24
updated: 2026-06-24
---

# UAT-029 — UAT: Attorney Annotation UI — Zone Review and Confirmation Page

implements::[[TASK-029]]

> **Source task**: [[TASK-029]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] `sam local start-api` running on `http://localhost:3000` with `DATABASE_URL` set to a live PostgreSQL instance
- [ ] Prisma migrations applied (`pnpm --filter @demand-letter/db exec prisma migrate deploy`)
- [ ] At least one Job row exists in the DB with a known `jobId`
- [ ] At least one Template row exists linked to that job with a known `templateId`
- [ ] At least two Zone rows exist for that template: one with `type = 'variable_populated'` and one with `type = 'boilerplate_verbatim'`
- [ ] Frontend dev server running (`pnpm --filter @demand-letter/web dev`) at `http://localhost:5173`
- [ ] `$UAT_JOB_ID` and `$UAT_TEMPLATE_ID` env vars set to the known IDs
- [ ] `$UAT_ZONE_ID_VAR` set to the ID of the `variable_populated` zone; `$UAT_ZONE_ID_BKPLATE` set to the ID of the `boilerplate_verbatim` zone

---

## Test Cases

### UAT-STATIC-001: Handler files exist and are registered in SAM template
- **Description**: Confirms that both handler files were created and wired up correctly in `template.yaml`
- **Steps**:
  1. Check that `packages/api/src/handlers/get-jobs-template-zones.ts` exists
  2. Check that `packages/api/src/handlers/patch-jobs-template-zones.ts` exists
  3. Search `template.yaml` for `GetJobsTemplateZonesFunction` with `Path: /jobs/{id}/templates/{templateId}/zones` and `Method: get`
  4. Search `template.yaml` for `PatchJobsTemplateZonesFunction` with `Path: /jobs/{id}/templates/{templateId}/zones` and `Method: patch`
- **Expected Result**: Both files exist; both SAM resources appear with the correct path and HTTP method
- [x] Pass <!-- 2026-06-24 -->

### UAT-STATIC-002: AnnotatePage.tsx exists and route is wired in App.tsx
- **Description**: Confirms the React page component and its router registration are in place
- **Steps**:
  1. Check that `packages/web/src/pages/AnnotatePage.tsx` exists and has a default export named `AnnotatePage`
  2. Check that `packages/web/src/App.tsx` contains the route `path="/jobs/:id/templates/:templateId/annotate"` wired to `<AnnotatePage />`
- **Expected Result**: File exists with correct default export; route is present in App.tsx
- [x] Pass <!-- 2026-06-24 -->

### UAT-STATIC-003: api.ts exports getTemplateZones and patchTemplateZones
- **Description**: Confirms the API helper functions are exported from the lib module
- **Steps**:
  1. Check that `packages/web/src/lib/api.ts` exports both `getTemplateZones` and `patchTemplateZones`
  2. Verify `getTemplateZones` calls `GET ${API_BASE}/jobs/${jobId}/templates/${templateId}/zones`
  3. Verify `patchTemplateZones` calls `PATCH` with body `{ zones }` and `Content-Type: application/json`
- **Expected Result**: Both exports present with correct HTTP method, URL pattern, and request shape
- [x] Pass <!-- 2026-06-24 -->

### UAT-STATIC-004: TypeScript typecheck passes clean
- **Description**: Ensures no type errors were introduced by this task
- **Steps**:
  1. Run: `pnpm typecheck` from the monorepo root
- **Command**:
  ```bash
  pnpm typecheck
  ```
- **Expected Result**: Exits with code 0; zero errors across all three packages
- [x] Pass <!-- 2026-06-24 -->

### UAT-API-001: GET zones — happy path returns ordered zone array
- **Auth-Required**: false
- **Endpoint**: `GET /jobs/{id}/templates/{templateId}/zones`
- **Description**: Fetches all zones for a template, confirming 200 status and correct ordering by `zoneIndex`
- **Steps**:
  1. Ensure the prerequisite zone rows exist in the DB
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$UAT_JOB_ID/templates/$UAT_TEMPLATE_ID/zones" | jq '.'
  ```
- **Expected Result**: HTTP 200; response body is a JSON array of zone objects each containing at minimum `id`, `zoneIndex`, `textContent`, `type`, `suggestedFieldName`, `confirmed`; array is sorted by `zoneIndex` ascending
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-API-002: GET zones — 400 on missing templateId path parameter
- **Auth-Required**: false
- **Endpoint**: `GET /jobs/{id}/templates//zones`
- **Description**: Confirms the handler returns 400 when `templateId` is absent from the path
- **Steps**:
  1. Run the curl command below (route does not match — SAM will return 403/404 from API GW for unmatched path, but test that a well-formed request with an empty string is rejected)
  2. Alternatively call the handler with a fabricated event missing `templateId`
- **Command**:
  ```bash
  curl -sS -o /dev/null -w "%{http_code}" "http://localhost:3000/jobs/$UAT_JOB_ID/templates/%20/zones"
  ```
- **Expected Result**: Response is 400 (or 403/404 from API GW) — not 200; no zone data returned
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-API-003: PATCH zones — happy path persists all zone updates
- **Auth-Required**: false
- **Endpoint**: `PATCH /jobs/{id}/templates/{templateId}/zones`
- **Description**: Sends a full zones array and confirms 200 with updated records persisted to DB
- **Steps**:
  1. Prepare a payload using the known zone IDs with updated `type`, `suggestedFieldName`, and `confirmed` values
  2. Run the curl command below (substituting real IDs for the placeholder values)
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$UAT_JOB_ID/templates/$UAT_TEMPLATE_ID/zones" -H 'Content-Type: application/json' -d "{\"zones\":[{\"id\":\"$UAT_ZONE_ID_VAR\",\"type\":\"variable_populated\",\"suggestedFieldName\":\"plaintiff_name\",\"confirmed\":true},{\"id\":\"$UAT_ZONE_ID_BKPLATE\",\"type\":\"boilerplate_verbatim\",\"suggestedFieldName\":null,\"confirmed\":false}]}" | jq '.'
  ```
- **Expected Result**: HTTP 200; response body is a JSON array of updated zone objects; `confirmed` is `true` for the variable zone; `confirmedBy` is `"attorney"`; `confirmedAt` is a non-null ISO timestamp
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-API-004: PATCH zones — 400 on invalid body (zones not an array)
- **Auth-Required**: false
- **Endpoint**: `PATCH /jobs/{id}/templates/{templateId}/zones`
- **Description**: Confirms the handler rejects malformed request bodies with 400
- **Steps**:
  1. Send a body where `zones` is not an array
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$UAT_JOB_ID/templates/$UAT_TEMPLATE_ID/zones" -H 'Content-Type: application/json' -d '{"zones":"not-an-array"}' | jq '.'
  ```
- **Expected Result**: HTTP 400; response body contains `{ "error": "Invalid request body" }`
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-API-005: PATCH zones — 400 on missing path parameters
- **Auth-Required**: false
- **Endpoint**: `PATCH /jobs/{id}/templates/{templateId}/zones`
- **Description**: Confirms 400 when `jobId` or `templateId` is absent
- **Steps**:
  1. Run the curl command below with an empty string for the template segment
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$UAT_JOB_ID/templates/%20/zones" -H 'Content-Type: application/json' -d '{"zones":[]}' | jq '.'
  ```
- **Expected Result**: Response is 400 (or API GW 403/404 for unmatched path) — not 200
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-UI-001: Annotate page renders zone list on load
- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Confirms the page loads, shows the heading, and renders one row per zone
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/templates/$UAT_TEMPLATE_ID/annotate` in a browser
  2. Wait for loading spinner to disappear (text "Loading zones…" should briefly appear then resolve)
  3. Observe the rendered page
- **Expected Result**: Page heading "Template Zone Annotation" is visible; at least two zone rows are rendered; each row shows a "Zone N" label, a monospaced text excerpt, "Boilerplate" button, "Variable" button, and a "Confirm" button
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-002: Loading state displays "Loading zones…" before data arrives
- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Confirms the loading sentinel is shown while the GET request is in flight
- **Steps**:
  1. Open browser DevTools → Network → throttle to "Slow 3G"
  2. Navigate to the annotate page
  3. Observe the page before data loads
- **Expected Result**: The text "Loading zones…" is visible while the network request is pending
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-003: Error state shows "Error: …" in red when GET fails
- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Confirms error handling when the GET zones API is unreachable
- **Steps**:
  1. Stop the SAM local API server (or navigate with a non-existent jobId)
  2. Navigate to `http://localhost:5173/jobs/nonexistent-job/templates/nonexistent-tpl/annotate`
  3. Observe the page
- **Expected Result**: An error message beginning with "Error:" is displayed in red (`text-red-600`); no zone rows are shown
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-004: Toggling zone type updates the active button style
- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Confirms that clicking "Boilerplate" or "Variable" updates the active visual state of the toggle buttons and deconfirms the zone
- **Steps**:
  1. Navigate to the annotate page with data loaded
  2. Find a zone currently typed as `variable_populated` (the "Variable" button should show blue highlight)
  3. Click "Boilerplate" on that zone row
  4. Observe the button styles
- **Expected Result**: After clicking "Boilerplate": the "Boilerplate" button shows amber highlight (`bg-amber-100 border-amber-400`); the "Variable" button reverts to the unselected style; the zone's `confirmed` state resets to false (the row loses teal styling if it was previously confirmed); the field name input disappears (it only shows for `variable_populated` zones)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-005: Field name input visible only for variable_populated zones
- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Confirms the field name input is conditionally shown based on zone type
- **Steps**:
  1. Navigate to the annotate page
  2. Locate a zone with `type = 'boilerplate_verbatim'`
  3. Check for a text input in that row
  4. Locate a zone with `type = 'variable_populated'`
  5. Check for a text input in that row
- **Expected Result**: No text input visible for `boilerplate_verbatim` zone; a text input with placeholder "field_name" is visible for `variable_populated` zone
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-006: Editing field name input updates the zone's suggestedFieldName in local state
- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Confirms the controlled text input correctly reflects and updates zone field name state
- **Steps**:
  1. Navigate to the annotate page
  2. Find a `variable_populated` zone's field name input
  3. Clear the input and type "settlement_amount"
  4. Click "Submit Annotations"
  5. Observe the PATCH request payload (use DevTools Network tab)
- **Expected Result**: The PATCH request body includes the zone with `suggestedFieldName: "settlement_amount"`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-007: Per-zone Confirm button toggles confirmed state
- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Confirms the confirm toggle works on individual zone rows
- **Steps**:
  1. Navigate to the annotate page
  2. Click "Confirm" on any unconfirmed zone row
  3. Observe the row's visual state
  4. Click "Confirmed ✓" (same button, now in confirmed state) on the same row
  5. Observe the row again
- **Expected Result**: After first click: button label changes to "Confirmed ✓"; row border changes to teal (`border-teal-400 bg-teal-50`). After second click: button label returns to "Confirm"; teal styling is removed
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-008: "Confirm All Variable Zones" button confirms only variable_populated zones
- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Verifies the bulk-confirm action matches the requirement: only zones with `type === 'variable_populated'` are confirmed
- **Steps**:
  1. Navigate to the annotate page with at least one `variable_populated` zone and one `boilerplate_verbatim` zone
  2. Ensure no zones are confirmed at page load (all "Confirm" buttons show unconfirmed state)
  3. Click "Confirm All Variable Zones"
  4. Inspect all zone rows
- **Expected Result**: All `variable_populated` zones are now confirmed (teal row border, button shows "Confirmed ✓"); all `boilerplate_verbatim` zones remain unconfirmed (gray border, button shows "Confirm")
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-009: "Submit Annotations" sends PATCH with full zones array and shows success alert
- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Confirms the submit flow fires the PATCH request with the correct payload and shows the success alert
- **Steps**:
  1. Navigate to the annotate page
  2. Confirm at least one zone manually
  3. Click "Submit Annotations"
  4. Observe the button during submission and the resulting alert
- **Expected Result**: Button shows "Saving…" and is disabled while the request is in flight; after success, `alert('Zones saved successfully.')` fires; no error message is shown on the page
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-010: Submit button shows "Saving…" and is disabled during submission
- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Confirms the submitting state guard prevents double-submission
- **Steps**:
  1. Navigate to the annotate page with data loaded
  2. Open DevTools → Network → throttle to "Slow 3G"
  3. Click "Submit Annotations"
  4. While the PATCH request is still in flight, observe the button
- **Expected Result**: Button label is "Saving…"; button has `disabled` attribute; button appears visually dimmed (`opacity-50`)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-EDGE-001: Confirmed zone row has distinct teal visual styling
- **Scenario**: Confirmed vs unconfirmed zone row styling is visually distinguishable
- **Steps**:
  1. Navigate to the annotate page
  2. Click "Confirm" on one zone row
  3. Compare the styling of that row with an unconfirmed zone row
- **Expected Result**: Confirmed row has `border-teal-400 bg-teal-50` CSS classes; unconfirmed row has `border-gray-200`
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-24 -->

### UAT-EDGE-002: Toggling type on a confirmed zone resets confirmed to false
- **Scenario**: When an attorney overrides the zone type, the confirmed flag should clear automatically
- **Steps**:
  1. Navigate to the annotate page
  2. Confirm a `variable_populated` zone by clicking "Confirm"
  3. Verify it shows "Confirmed ✓" and teal styling
  4. Click "Boilerplate" on that same zone
  5. Observe the confirm button label and row styling
- **Expected Result**: Immediately after clicking "Boilerplate", the zone's confirmed state resets to false — button reverts to "Confirm"; teal row styling disappears
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-24 -->

### UAT-EDGE-003: PATCH confirmedBy is always "attorney" regardless of payload
- **Scenario**: The server always stamps `confirmedBy: 'attorney'` in the DB — client cannot override this
- **Steps**:
  1. Send a PATCH request that omits `confirmedBy` from the zone objects
  2. Fetch the zone via GET after the PATCH
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$UAT_JOB_ID/templates/$UAT_TEMPLATE_ID/zones" -H 'Content-Type: application/json' -d "{\"zones\":[{\"id\":\"$UAT_ZONE_ID_VAR\",\"type\":\"variable_populated\",\"suggestedFieldName\":\"plaintiff_name\",\"confirmed\":true}]}" | jq '.[0].confirmedBy'
  ```
- **Expected Result**: Response includes `"confirmedBy": "attorney"`; `confirmedAt` is a non-null ISO datetime string
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on http://localhost:3000] <!-- 2026-06-24 -->

### UAT-EDGE-004: PATCH with empty zones array returns 200 with empty array
- **Scenario**: An empty zones array is a valid (no-op) PATCH body
- **Steps**:
  1. Send a PATCH request with `{ "zones": [] }`
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$UAT_JOB_ID/templates/$UAT_TEMPLATE_ID/zones" -H 'Content-Type: application/json' -d '{"zones":[]}' | jq '.'
  ```
- **Expected Result**: HTTP 200; response body is `[]`
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on http://localhost:3000] <!-- 2026-06-24 -->
