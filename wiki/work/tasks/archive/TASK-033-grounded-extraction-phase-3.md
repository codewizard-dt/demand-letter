---
id: TASK-033
title: "ROADMAP-003 Phase 3 — Grounded Extraction: Claude on Bedrock with per-field block_id citations, structured tool_use output, extracted_fields DB table, and LlmAuditLog integration"
status: done
created: 2026-06-24
updated: 2026-06-24 <!-- tackle completed -->
depends_on: [TASK-032]
blocks: []
parallel_safe_with: []
uat: "[[UAT-033]]"
tags: [bedrock, claude, grounded-extraction, tool_use, provenance, extracted-fields, llm-audit, prisma, postgresql]
---

# TASK-033 — ROADMAP-003 Phase 3 — Grounded Extraction: Claude on Bedrock with per-field block_id citations, structured tool_use output, extracted_fields DB table, and LlmAuditLog integration

## Objective

After TASK-032 populates the provenance store with bbox-level `Block` records, this task implements the grounded extraction step. Claude on Bedrock receives the full block list (id + text + page) as context and returns a canonical ~40-field schema where every non-null field value is accompanied by one or more `block_id` citations referencing the exact blocks it was drawn from. Structured output is enforced via Claude's `tool_use` mechanism so the response is always validated JSON — no free-form prose. The extracted values are persisted in a new `extracted_fields` table. Every invocation is logged to `LlmAuditLog` with `feature: "case_extraction"` via the existing provider wrapper.

## Approach

**Provider wrapper extension**: `ai-provider.ts` already exposes `invokeModel` for plain text. Add an `invokeModelWithTools` export that accepts a `tools` array and `tool_choice` parameter, sends the Bedrock `InvokeModelCommand` with `tools` in the request body, parses the `tool_use` content block from the response, and still calls `logAudit`. This keeps audit logging centralised.

**Extraction prompt**: System prompt describes the task; user message lists all blocks as a compact JSON array `[{ id, text, page }, ...]`. The tool definition encodes the canonical field schema as a JSON Schema object with 40 named properties, each an object with `value: string | null`, `block_ids: string[]`, `confidence: number`, `is_null: boolean`, and `null_reason: string | null`.

**`extracted_fields` table**: One row per field per job. Columns: `id`, `jobId`, `fieldName`, `value`, `blockIds` (JSONB `string[]`), `confidence`, `isNull`, `nullReason`. Indexed on `(jobId, fieldName)` unique.

**Handler**: `POST /jobs/:id/extract` — reads all blocks for the job from DB, calls `invokeModelWithTools`, inserts/upserts all field rows, returns the extraction summary.

**Model**: Use `us.anthropic.claude-3-5-sonnet-20241022-v2:0` inference profile (same as TASK-005 verified profile) with `max_tokens: 4096`.

## Steps

### 1. Extend ai-provider.ts with invokeModelWithTools  <!-- agent: general-purpose -->

- [x] Open `packages/api/src/lib/ai-provider.ts`. <!-- Completed: 2026-06-24 -->
- [x] Add interface and export below the existing `invokeModelStream` export: <!-- Completed: 2026-06-24 -->

  ```typescript
  interface Tool {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }

  interface InvokeWithToolsOptions extends InvokeOptions {
    tools: Tool[];
    tool_choice?: { type: 'auto' } | { type: 'any' } | { type: 'tool'; name: string };
  }

  export async function invokeModelWithTools(
    opts: InvokeWithToolsOptions,
  ): Promise<Record<string, unknown>> {
    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      system: opts.system,
      messages: opts.messages,
      tools: opts.tools,
      tool_choice: opts.tool_choice ?? { type: 'any' },
    });

    const start = Date.now();
    try {
      const response = await client.send(
        new InvokeModelCommand({
          modelId: opts.modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: Buffer.from(body),
        }),
      );
      const parsed = JSON.parse(Buffer.from(response.body).toString());
      const inputTokens: number = parsed.usage?.input_tokens ?? 0;
      const outputTokens: number = parsed.usage?.output_tokens ?? 0;

      // Find the tool_use content block
      const toolUseBlock = parsed.content?.find(
        (b: Record<string, unknown>) => b.type === 'tool_use',
      );
      if (!toolUseBlock) {
        throw new Error('Claude did not return a tool_use block');
      }

      logAudit(opts, inputTokens, outputTokens, Date.now() - start);
      return toolUseBlock.input as Record<string, unknown>;
    } catch (err) {
      logAudit(opts, 0, 0, Date.now() - start);
      throw err;
    }
  }
  ```

- [x] Confirm TypeScript compiles with no errors: `pnpm --filter @demand-letter/api build`. <!-- Deferred to Step 6 typecheck -->

### 2. Add ExtractedField Prisma model and migration  <!-- agent: general-purpose -->

- [x] Open `packages/db/prisma/schema.prisma`. <!-- Completed: 2026-06-24 -->
- [x] Add the following model after the `TemplateSlot` model: <!-- Completed: 2026-06-24 -->

  ```prisma
  model ExtractedField {
    id          String   @id @default(cuid())
    jobId       String
    job         Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
    fieldName   String
    value       String?
    blockIds    Json     @default("[]")  // JSONB string[] of Block.id values
    confidence  Float    @default(0)
    isNull      Boolean  @default(false)
    nullReason  String?
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    @@unique([jobId, fieldName])
    @@index([jobId])
    @@map("extracted_fields")
  }
  ```

- [x] Add reverse relation to `Job` model: `extractedFields ExtractedField[]`. <!-- Completed: 2026-06-24 -->
- [x] Run `prisma migrate dev --name add-extracted-fields` from the monorepo root (or `packages/db`). <!-- Completed: 2026-06-24 -->
- [x] Run `prisma generate`. <!-- Completed: 2026-06-24 -->
- [x] Export `ExtractedField` type from `packages/db/src/index.ts`. <!-- Completed: 2026-06-24 -->
- [x] Rebuild db package: `pnpm --filter @demand-letter/db build`. <!-- Completed: 2026-06-24 -->

### 3. Define canonical field schema and extraction tool  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/extraction-schema.ts`. <!-- Completed: 2026-06-24 -->
- [x] Export a `CANONICAL_FIELDS` constant <!-- Completed: 2026-06-24 --> — an array of the ~40 field names for the demand letter schema. Start with the fields below and add any additional fields from the template slots defined in ROADMAP-002 / `template_slots`:

  ```typescript
  export const CANONICAL_FIELDS = [
    // Claimant / plaintiff
    'claimant_name',
    'claimant_dob',
    'claimant_address',
    'claimant_phone',
    'claimant_email',

    // Incident
    'incident_date',
    'incident_location',
    'incident_description',
    'incident_police_report_number',

    // Defendant / insurer
    'defendant_name',
    'defendant_address',
    'insurer_name',
    'insurer_claim_number',
    'insurer_adjuster_name',
    'insurer_adjuster_phone',
    'insurer_adjuster_email',
    'policy_number',
    'policy_limits',

    // Medical treatment
    'treating_physician_name',
    'treating_facility_name',
    'first_treatment_date',
    'last_treatment_date',
    'diagnosis_codes',
    'treatment_summary',
    'future_treatment_recommended',
    'future_treatment_description',

    // Medical costs
    'total_medical_bills',
    'paid_by_health_insurance',
    'outstanding_balance',
    'future_medical_estimate',

    // Lost wages
    'employer_name',
    'lost_wages_amount',
    'lost_wages_period',
    'return_to_work_date',

    // Damages
    'pain_and_suffering_description',
    'general_damages_estimate',
    'demand_amount',
    'demand_expiry_date',

    // Attorney
    'attorney_name',
    'attorney_bar_number',
    'law_firm_name',
    'law_firm_address',
  ] as const;

  export type FieldName = (typeof CANONICAL_FIELDS)[number];
  ```

- [x] Export `buildExtractionTool()` function that returns a `Tool` object <!-- Completed: 2026-06-24 --> whose `input_schema` has a `properties` entry for each field in `CANONICAL_FIELDS`. Each property is typed as:

  ```json
  {
    "type": "object",
    "properties": {
      "value": { "type": ["string", "null"] },
      "block_ids": { "type": "array", "items": { "type": "string" } },
      "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
      "is_null": { "type": "boolean" },
      "null_reason": { "type": ["string", "null"] }
    },
    "required": ["value", "block_ids", "confidence", "is_null", "null_reason"]
  }
  ```

  The top-level `input_schema` is `{ type: "object", properties: { <field>: ..., ... }, required: [...CANONICAL_FIELDS] }`.

### 4. Implement extraction service  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/extraction-service.ts`. <!-- Completed: 2026-06-24 -->
- [x] Import `invokeModelWithTools` from `./ai-provider`, `buildExtractionTool`, `CANONICAL_FIELDS` from `./extraction-schema`, and `prisma` from `@demand-letter/db`. <!-- Completed: 2026-06-24 -->
- [x] Export `async function runGroundedExtraction(jobId: string, userId: string): Promise<void>`: <!-- Completed: 2026-06-24 -->

  1. Fetch all blocks for the job:
     ```typescript
     const blocks = await prisma.block.findMany({
       where: { sourceFile: { jobId } },
       select: { id: true, text: true, page: true },
       orderBy: [{ page: 'asc' }, { createdAt: 'asc' }],
     });
     ```
  2. Build the context string:
     ```typescript
     const blockContext = JSON.stringify(
       blocks.map((b) => ({ id: b.id, text: b.text, page: b.page })),
     );
     ```
  3. Call the provider wrapper:
     ```typescript
     const result = await invokeModelWithTools({
       modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
       feature: 'case_extraction',
       userId,
       system: `You are a precise legal document extraction assistant.
     Extract the requested fields from the provided medical and legal document blocks.
     For every field, cite the exact block IDs that support the value using block_ids.
     If a field cannot be found in the blocks, set is_null to true and provide a null_reason.
     Never invent or hallucinate values — if uncertain, set confidence below 0.5 and explain in null_reason.
     Every block_id you cite MUST appear in the provided block list.`,
       messages: [
         {
           role: 'user',
           content: `Here are all text blocks extracted from the case documents:\n\n${blockContext}\n\nPlease extract all fields using the extract_case_fields tool.`,
         },
       ],
       tools: [buildExtractionTool()],
       tool_choice: { type: 'tool', name: 'extract_case_fields' },
     });
     ```
  4. Upsert each field into `extracted_fields`:
     ```typescript
     for (const fieldName of CANONICAL_FIELDS) {
       const fieldData = result[fieldName] as {
         value: string | null;
         block_ids: string[];
         confidence: number;
         is_null: boolean;
         null_reason: string | null;
       } | undefined;
       if (!fieldData) continue;

       await prisma.extractedField.upsert({
         where: { jobId_fieldName: { jobId, fieldName } },
         create: {
           jobId,
           fieldName,
           value: fieldData.value,
           blockIds: fieldData.block_ids,
           confidence: fieldData.confidence,
           isNull: fieldData.is_null,
           nullReason: fieldData.null_reason,
         },
         update: {
           value: fieldData.value,
           blockIds: fieldData.block_ids,
           confidence: fieldData.confidence,
           isNull: fieldData.is_null,
           nullReason: fieldData.null_reason,
           updatedAt: new Date(),
         },
       });
     }
     ```

### 5. Create POST /jobs/:id/extract Lambda handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/post-jobs-extract.ts`: <!-- Completed: 2026-06-24 -->

  ```typescript
  import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
  import { prisma } from '@demand-letter/db';
  import { runGroundedExtraction } from '../lib/extraction-service';

  export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const jobId = event.pathParameters?.id;
    if (!jobId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing job ID' }) };
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };
    }

    // userId comes from Cognito authorizer context; fall back to system for now
    const userId =
      (event.requestContext as Record<string, unknown>)?.authorizer?.['sub'] as string ??
      'system';

    try {
      await runGroundedExtraction(jobId, userId);

      const fieldCount = await prisma.extractedField.count({ where: { jobId } });
      const nullCount = await prisma.extractedField.count({
        where: { jobId, isNull: true },
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          totalFields: fieldCount,
          filledFields: fieldCount - nullCount,
          nullFields: nullCount,
        }),
      };
    } catch (err) {
      console.error('Extraction failed', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Extraction failed', message: (err as Error).message }),
      };
    }
  };
  ```

- [x] Register `PostJobsExtractFunction` in `template.yaml`: <!-- Completed: 2026-06-24 -->
  - `Handler: dist/handlers/post-jobs-extract.handler`
  - `Events: PostJobsExtract: { Type: Api, Properties: { Path: /jobs/{id}/extract, Method: post } }`
  - Add `bedrock:InvokeModel` policy on the inference profile ARN (same as existing generation functions).
  - Attach the existing `DbLayer` and environment variables (`DATABASE_URL`, `AWS_REGION`).

### 6. TypeScript typecheck and build  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from monorepo root. <!-- Completed: 2026-06-24 -->
- [x] Fix any type errors (common issues: `LlmFeature` string literal — the enum value is `case_extraction` not `"case-extraction"`; ensure import uses the Prisma enum, not a string literal). <!-- Completed: 2026-06-24 -->
- [x] Run `pnpm --filter @demand-letter/api build`. <!-- Completed: 2026-06-24 -->
- [x] Run `pnpm --filter @demand-letter/db build`. <!-- Completed: 2026-06-24 -->
- [x] Confirm zero errors. <!-- Completed: 2026-06-24 -->
