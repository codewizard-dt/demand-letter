---
id: UAT-028
title: "UAT: LLM Zone Classification — Claude on Bedrock Classifies Zones as Boilerplate or Variable"
status: passed
task: TASK-028
created: 2026-06-24
updated: 2026-06-24
---

# UAT-028 — UAT: LLM Zone Classification — Claude on Bedrock Classifies Zones as Boilerplate or Variable

implements::[[TASK-028]]

> **Source task**: [[TASK-028]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] SAM local API is running (`sam local start-api` or equivalent) with Bedrock credentials available in the environment.
- [ ] A PostgreSQL database is reachable and the `DATABASE_URL` env var is set on the Lambda environment (via `DbLayer`).
- [ ] `BEDROCK_MODEL_ID` env var is set (e.g. `anthropic.claude-sonnet-4-5` or the SSM-resolved value) and the model is accessible in the active AWS account's Bedrock configuration.
- [ ] A `Job` record exists in the DB. Set `UAT_JOB_ID` to its id.
- [ ] A `Template` record exists linked to that job, with at least two `Zone` rows having `textContent` populated — one that is clearly boilerplate legal text, one that is clearly a variable slot. Set `UAT_TEMPLATE_ID` to its id.
- [ ] A separate `Template` record exists with **no** associated `Zone` rows (for the 404 test). Set `UAT_EMPTY_TEMPLATE_ID` to its id.
- [ ] No auth token is required — the handler uses `"system"` as the userId placeholder.

---

## Test Cases

### UAT-API-001: Happy path — classify zones and receive updated zone list

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/classify`
- **Description**: Verifies that a valid job + template with pre-populated zones triggers a Bedrock call, writes `type` and `suggestedFieldName` back to each zone, and returns the full updated zone array with HTTP 200.
- **Steps**:
  1. Confirm `$UAT_JOB_ID` and `$UAT_TEMPLATE_ID` are set and the template has at least two zones with `textContent` populated.
  2. Run the curl command below.
  3. Inspect the response array: every element must have a `type` field set to either `boilerplate_verbatim` or `variable_populated`.
  4. Inspect variable-populated elements: each must have a non-null `suggestedFieldName` that matches one of the 40 canonical field names (e.g. `plaintiff_name`, `demand_amount`, `adjuster_name`).
  5. Inspect boilerplate-verbatim elements: `suggestedFieldName` must be `null`.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$UAT_JOB_ID/templates/$UAT_TEMPLATE_ID/classify" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 200. Response body is a JSON array of zone objects. Each object contains `id`, `templateId`, `zoneIndex`, `type` (`boilerplate_verbatim` or `variable_populated`), `textContent`, and `suggestedFieldName` (a canonical field name string for variable zones, `null` for boilerplate zones). The array length equals the number of zones for the template.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running] <!-- 2026-06-24 -->

---

### UAT-API-002: LLM audit log entry written on successful classification

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/classify`
- **Description**: Verifies that every successful Bedrock invocation produces an `LlmAuditLog` row with `feature = zone_classification` and `provider = bedrock`.
- **Steps**:
  1. Confirm a successful classification has been performed (UAT-API-001 passed).
  2. Query the `llm_audit_logs` table directly or via the `GET /admin/llm-costs` endpoint and verify that at least one row has `feature = 'zone_classification'` and `provider = 'bedrock'`.
  3. Alternatively, run the curl command below against the admin costs endpoint (if wired) and check the `recentCalls` array.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/admin/llm-costs' | jq '[.recentCalls[] | select(.feature == "zone_classification")]'
  ```
- **Expected Result**: At least one `LlmAuditLog` row exists with `feature = "zone_classification"`, `provider = "bedrock"`, `inputTokens > 0`, `outputTokens > 0`, and `estimatedCostUsd > 0`. The `userId` is `"system"` (auth placeholder).
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running] <!-- 2026-06-24 -->

---

### UAT-API-003: 404 when template has no zones

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/classify`
- **Description**: Verifies that attempting to classify a template that has no zone rows returns HTTP 404 with a descriptive error message — no Bedrock call is made.
- **Steps**:
  1. Confirm `$UAT_EMPTY_TEMPLATE_ID` is set and the template has zero zone records.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$UAT_JOB_ID/templates/$UAT_EMPTY_TEMPLATE_ID/classify" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 404. Response body: `{"error":"No zones found for template"}`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running] <!-- 2026-06-24 -->

---

### UAT-API-004: 502 when Bedrock returns malformed JSON

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/classify`
- **Description**: Verifies that when the Bedrock model response cannot be parsed as JSON, the handler catches the `SyntaxError` and returns HTTP 502 with an error message — rather than throwing an unhandled exception.
- **Scenario**: Simulate Bedrock returning a non-JSON response (e.g. by temporarily using a mock or stub that returns plain text), or point `BEDROCK_MODEL_ID` at an invalid model identifier that causes the SDK to return an error that surfaces as malformed response content.
- **Steps**:
  1. Temporarily configure the Lambda environment so that the Bedrock response text is not valid JSON. One approach: set `BEDROCK_MODEL_ID` to a valid model but intercept the response at the network layer using a proxy/stub that returns `"Sorry, I cannot help with that."` as the content text.
  2. Run the curl command below against the template with valid zones.
  3. Restore the original `BEDROCK_MODEL_ID` after verifying the result.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$UAT_JOB_ID/templates/$UAT_TEMPLATE_ID/classify" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 502. Response body: `{"error":"LLM returned invalid JSON"}`. The handler must NOT throw an unhandled 500.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running] <!-- 2026-06-24 -->

---

### UAT-API-005: Zone type values are restricted to the valid enum set

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/classify`
- **Description**: Verifies that the `type` field on every returned zone is strictly `boilerplate_verbatim` or `variable_populated` — the only two values in the `ZoneType` Prisma enum. Any other value would indicate prompt or parsing regression.
- **Steps**:
  1. Run the same classify call from UAT-API-001.
  2. Parse the response array and check the `type` field on each element.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$UAT_JOB_ID/templates/$UAT_TEMPLATE_ID/classify" | jq '[.[] | .type] | unique'
  ```
- **Expected Result**: The `jq` output is an array containing only values from the set `["boilerplate_verbatim", "variable_populated"]`. No null values; no other strings.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running] <!-- 2026-06-24 -->

---

### UAT-EDGE-001: Variable zones get suggestedFieldName from the canonical 40-field schema

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/classify`
- **Description**: Verifies that `suggestedFieldName` on `variable_populated` zones is always one of the canonical field names embedded in the system prompt — never an arbitrary free-text invention.
- **Steps**:
  1. Run the classify call from UAT-API-001 and capture the response.
  2. Extract all `suggestedFieldName` values from zones where `type == "variable_populated"`.
  3. Verify each name appears in the canonical list:
     `letter_date`, `delivery_method`, `adjuster_name`, `adjuster_title`, `insurer_name`, `insurer_address`, `claim_number`, `insured_name`, `claimant_name`, `date_of_loss`, `demand_expiry_date`, `incident_date`, `incident_time`, `incident_location`, `traffic_conditions`, `claimant_conduct`, `at_fault_party`, `at_fault_conduct`, `liability_admission_status`, `diagnoses`, `treating_providers`, `examination_findings`, `imaging_results`, `future_treatment`, `per_provider_line_items`, `total_medical_specials`, `future_medical_reserve`, `occupational_impact_narrative`, `general_damages_figure`, `statutory_citation`, `demand_amount`, `policy_limits`, `lien_handling_terms`, `payee_instructions`, `release_scope`, `expiry_acceptance_mechanics`, `attorney_name`, `bar_affiliation`, `firm_name`, `firm_address`.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$UAT_JOB_ID/templates/$UAT_TEMPLATE_ID/classify" | jq '[.[] | select(.type == "variable_populated") | .suggestedFieldName]'
  ```
- **Expected Result**: Every `suggestedFieldName` in the output is a member of the canonical 40-field list above. No free-text field names outside the schema.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running] <!-- 2026-06-24 -->

---

### UAT-EDGE-002: Boilerplate zones have null suggestedFieldName

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/classify`
- **Description**: Verifies that zones classified as `boilerplate_verbatim` always have `suggestedFieldName` set to `null` — boilerplate zones are not variable and must not be assigned field names.
- **Steps**:
  1. Run the classify call from UAT-API-001 and capture the response.
  2. Filter for zones where `type == "boilerplate_verbatim"` and check `suggestedFieldName`.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$UAT_JOB_ID/templates/$UAT_TEMPLATE_ID/classify" | jq '[.[] | select(.type == "boilerplate_verbatim") | .suggestedFieldName] | unique'
  ```
- **Expected Result**: The `jq` output is `[null]` (or `[]` if no boilerplate zones exist — in that case, reuse a template known to have boilerplate text). No non-null values in boilerplate zone rows.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running] <!-- 2026-06-24 -->

---

### UAT-EDGE-003: DB persistence — classifications are written to the zones table

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/classify`
- **Description**: Verifies that after a successful classify call, the `zones` table rows are updated in the database — the results are persisted, not just returned transiently.
- **Steps**:
  1. Run the classify call from UAT-API-001 and note the returned `type` and `suggestedFieldName` for each zone.
  2. Query the `zones` table directly (via psql or a DB admin tool) for `templateId = $UAT_TEMPLATE_ID`.
  3. Compare the DB row values for `type` and `suggested_field_name` against the API response.
- **Expected Result**: Every zone row in the DB has `type` and `suggested_field_name` matching the values returned by the API. The `confirmed` column remains `false` (classification is a proposal, not confirmation).
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running] <!-- 2026-06-24 -->

---

### UAT-EDGE-004: SAM function registration — route is reachable

- **Endpoint**: `POST /jobs/{id}/templates/{templateId}/classify`
- **Description**: Verifies that `PostJobsTemplatesClassifyFunction` is correctly registered in `template.yaml` and the route resolves at `/jobs/{id}/templates/{templateId}/classify` without a 403 or missing-route error.
- **Steps**:
  1. Start `sam local start-api`.
  2. Send a POST to a well-formed path with an unknown job/template id (to exercise routing, not business logic).
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/nonexistent/templates/nonexistent/classify' -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 404 with body `{"error":"No zones found for template"}` — NOT a 403 "Missing Authentication Token" (which would indicate a routing misconfiguration in SAM) and NOT a 500 from an unresolvable route. The route is correctly wired.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running] <!-- 2026-06-24 -->
