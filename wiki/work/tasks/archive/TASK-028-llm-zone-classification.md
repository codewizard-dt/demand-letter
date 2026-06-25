---
id: TASK-028
title: "LLM Zone Classification — Claude on Bedrock Classifies Zones as Boilerplate or Variable"
status: done
created: 2026-06-24
updated: 2026-06-24
depends_on: [TASK-027]
blocks: []
parallel_safe_with: []
uat: "[[UAT-028]]"
tags: [llm, bedrock, zone-classification, template, zone-detection]
---

# TASK-028 — LLM Zone Classification — Claude on Bedrock Classifies Zones as Boilerplate or Variable

implements::[[DEC-0001#D1]]

## Objective

Implement a Lambda handler and a service module that takes the full zone list extracted from a template DOCX and sends it to Claude on Bedrock for classification. The LLM classifies each zone as either `boilerplate_verbatim` (fixed legal language that must never be paraphrased) or `variable_populated` (a slot the attorney fills in per-case). For `variable_populated` zones, the LLM also suggests a field name from the canonical ~40-field schema. Classification proposals are stored in `zones.type` and `zones.suggestedFieldName` (not yet confirmed — confirmation happens in Phase 3). All calls are logged to `LlmAuditLog` via the existing AI provider wrapper with `feature: zone_classification`.

## Approach

The classification is a single structured-output LLM call: send all zone texts with their position indices in one prompt, receive a JSON array of `{ zoneIndex, type, suggestedFieldName }` objects. Using one call for the whole zone list is cheaper and gives the model full document context for better disambiguation. The canonical field schema (~40 fields from the PRD) is embedded in the system prompt as a reference list. The handler (`POST /jobs/:id/templates/:templateId/classify`) reads zones from the DB, calls Claude, writes proposals back to the DB, and returns the updated zone list.

## Steps

### 1. Embed the canonical field schema in a shared constant  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/zone-field-schema.ts` exporting a `CANONICAL_FIELDS` string constant — a newline-separated list of the ~40 field names from the demand-letter input contract:
  ```
  plaintiff_name, defendant_name, firm_name, attorney_name, date_of_loss,
  incident_location, policy_number, claim_number, adjuster_name,
  adjuster_email, demand_amount, settlement_conditions, liability_summary,
  witness_summary, property_damage_summary, medical_providers,
  total_medical_specials, lost_wages, future_medical, pain_and_suffering,
  medical_narrative, ccp_999_deadline, policy_limits, ... (full list)
  ```
  Derive the full list from `wiki/knowledge/concepts/demand-letter-input-contract.md` or `raw/research/demand-letter-agentic-inputs/index.md`.

### 2. Implement the zone classification service  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/zone-classifier.ts`:

```typescript
import { invokeModel } from './ai-provider';
import { CANONICAL_FIELDS } from './zone-field-schema';
import { ZoneType } from '@demand-letter/db';

export interface ZoneClassification {
  zoneIndex: number;
  type: ZoneType;
  suggestedFieldName: string | null;
}

export async function classifyZones(
  zones: Array<{ zoneIndex: number; textContent: string }>,
  userId: string,
): Promise<ZoneClassification[]> {
  const systemPrompt = `You are a legal document classifier. Classify each zone of a demand letter template as either "boilerplate_verbatim" (fixed legal language that must never be paraphrased) or "variable_populated" (a fill-in slot). For variable zones, suggest a field name from this canonical schema:\n${CANONICAL_FIELDS}\n\nRespond ONLY with a JSON array: [{"zoneIndex": N, "type": "boilerplate_verbatim"|"variable_populated", "suggestedFieldName": "field_name"|null}]`;

  const userContent = zones
    .map(z => `Zone ${z.zoneIndex}: "${z.textContent}"`)
    .join('\n');

  const result = await invokeModel(
    { system: systemPrompt, messages: [{ role: 'user', content: userContent }] },
    { feature: 'zone_classification', userId },
  );

  return JSON.parse(result.text) as ZoneClassification[];
}
```

### 3. Create the Lambda handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/post-jobs-templates-classify.ts`:
  - Parse `event.pathParameters.id` (job id) and `event.pathParameters.templateId`.
  - Fetch all zones for the template from the DB: `prisma.zone.findMany({ where: { templateId }, orderBy: { zoneIndex: 'asc' } })`.
  - Call `classifyZones(zones, userId)` (use `"system"` as userId placeholder until auth is wired).
  - For each classification, update the DB: `prisma.zone.update({ where: { id }, data: { type, suggestedFieldName } })` using `Promise.all`.
  - Return `200` with the updated zone list.
  - Handle parse errors (LLM returned invalid JSON) with a `502` response.

### 4. Register the handler in SAM template  <!-- agent: general-purpose -->

- [x] Open `template.yaml`.
- [x] Add `PostJobsTemplatesClassifyFunction`:
  ```yaml
  PostJobsTemplatesClassifyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/post-jobs-templates-classify.handler
      CodeUri: packages/api/
      Layers:
        - !Ref DbLayer
      Environment:
        Variables:
          BEDROCK_MODEL_ID: !Sub "/${Stage}/demand-letter/bedrock-model-id"
      Events:
        Api:
          Type: Api
          Properties:
            Path: /jobs/{id}/templates/{templateId}/classify
            Method: post
  ```

### 5. TypeScript typecheck  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from the monorepo root.
- [x] Fix any type errors (common: JSON.parse return type, `ZoneType` enum values). <!-- db package rebuilt to update dist/ with ZoneType export -->
- [x] Confirm zero errors.
