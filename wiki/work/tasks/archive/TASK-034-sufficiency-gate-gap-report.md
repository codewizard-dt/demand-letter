---
id: TASK-034
title: "ROADMAP-003 Phase 4 — Sufficiency Gate & Gap Report"
status: todo
created: 2026-06-24
updated: 2026-06-24
depends_on: [TASK-033]
blocks: []
parallel_safe_with: [TASK-005]
uat: "[[UAT-034]]"
tags: [sufficiency-gate, gap-report, attorney-judgment, extracted-fields, template-slots, prisma, postgresql, react]
---

# TASK-034 — ROADMAP-003 Phase 4 — Sufficiency Gate & Gap Report

## Objective

After TASK-033 populates `extracted_fields`, compare every field against the `template_slots` slot list to determine coverage. A slot is covered if `isNull = false` AND `confidence >= threshold` (configurable; default 0.80), OR an attorney-judgment value has been stored for it. Uncovered slots are surfaced as a gap report (list of slot names + `nullReason`). A React UI lets the attorney fill the demand amount, general damages estimate, future medical reserve, and any other uncovered slots; those values are persisted in `extracted_fields` with `blockIds = []` and `source = "attorney-judgment"`. Generation is gated: `POST /jobs/:id/generate` returns 422 if any gap-report slots remain uncovered and not marked "accept missing".

## Approach

**Coverage logic**: Pure TypeScript function that joins `extracted_fields` rows for a job against the `template_slots` list. A slot passes if its `extracted_fields` row exists with `isNull = false && confidence >= threshold` or `source = "attorney-judgment"`. Threshold is read from env `SUFFICIENCY_THRESHOLD` with a fallback of `0.80`.

**`source` column on `extracted_fields`**: Add a nullable `source String?` column. Rows written by the grounded extraction step leave `source` as `null` (normal). Attorney-judgment rows are upserted with `source = "attorney-judgment"` and `blockIds = []`.

**`acceptMissing` flag**: Add a nullable boolean `acceptMissing Boolean @default(false)` column to `extracted_fields`. When set to `true` for a slot, the sufficiency gate treats it as satisfied regardless of confidence or nullity.

**Gap report API**: `GET /jobs/:id/gap-report` — returns `{ covered: number, total: number, gaps: GapItem[] }` where `GapItem = { fieldName: string, nullReason: string | null, acceptMissing: boolean }`.

**Attorney-judgment API**: `POST /jobs/:id/attorney-judgment` accepts `{ fields: { fieldName: string, value: string }[], acceptMissing?: string[] }`. Upserts each field into `extracted_fields` with `source = "attorney-judgment"`, `blockIds = []`, `isNull = false`, `confidence = 1.0`. Sets `acceptMissing = true` for fields in the optional `acceptMissing` list.

**Generation gate**: Patch `POST /jobs/:id/generate` handler to call the sufficiency check before invoking Bedrock. If any `GapItem[]` remain (not covered and not `acceptMissing`), return 422 with `{ error: "gap_report_not_cleared", gaps: [...] }`.

**React gap-report UI**: New page/modal at `/jobs/:id/gap-report`. Fetches the gap report, shows a table of uncovered slots, provides an inline form for attorney-judgment values, and a checkbox per row to "accept missing". On submit, calls `POST /jobs/:id/attorney-judgment`, then re-fetches the gap report. A "Proceed to Generate" button is enabled only when `gaps` is empty.

## Steps

### 1. Add `source` and `acceptMissing` columns to ExtractedField  <!-- agent: general-purpose -->

- [x] Open `packages/db/prisma/schema.prisma`. <!-- Completed: 2026-06-24 -->
- [x] In the `ExtractedField` model, add two new fields after `nullReason`:
  ```prisma
  source      String?   // null = grounded extraction; "attorney-judgment" = attorney override
  acceptMissing Boolean @default(false)
  ```
- [x] Run Prisma migration:
  ```bash
  cd packages/db && pnpm prisma migrate dev --name add-extracted-fields-source-accept-missing
  ```
- [x] Run `pnpm prisma generate` in `packages/db`.
- [x] Rebuild the db package: `pnpm --filter @demand-letter/db build`.
- [x] Verify `packages/db/src/index.ts` exports `ExtractedField` (should already be re-exported; confirm it picks up the new columns).

### 2. Implement sufficiency-gate service  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/sufficiency-gate.ts`. <!-- Completed: 2026-06-24 -->
- [x] Read `SUFFICIENCY_THRESHOLD` from `process.env.SUFFICIENCY_THRESHOLD`; parse as float; default to `0.80`.
- [x] Export interface and function:

  ```typescript
  import { prisma } from '@demand-letter/db';

  export interface GapItem {
    fieldName: string;
    nullReason: string | null;
    acceptMissing: boolean;
  }

  export interface GapReport {
    covered: number;
    total: number;
    gaps: GapItem[];
  }

  export async function computeGapReport(jobId: string): Promise<GapReport> {
    // 1. Fetch the template_slots list for this job's template
    const job = await prisma.job.findUniqueOrThrow({
      where: { id: jobId },
      select: { templateId: true },
    });
    const slots = await prisma.templateSlot.findMany({
      where: { templateId: job.templateId },
      select: { slotName: true },
    });

    // 2. Fetch extracted_fields for this job
    const fields = await prisma.extractedField.findMany({
      where: { jobId },
      select: { fieldName: true, isNull: true, confidence: true, source: true, acceptMissing: true, nullReason: true },
    });
    const fieldMap = new Map(fields.map((f) => [f.fieldName, f]));

    const threshold = parseFloat(process.env.SUFFICIENCY_THRESHOLD ?? '0.80');

    const gaps: GapItem[] = [];
    for (const slot of slots) {
      const f = fieldMap.get(slot.slotName);
      const covered =
        f !== undefined &&
        (
          f.acceptMissing ||
          f.source === 'attorney-judgment' ||
          (!f.isNull && f.confidence >= threshold)
        );
      if (!covered) {
        gaps.push({
          fieldName: slot.slotName,
          nullReason: f?.nullReason ?? null,
          acceptMissing: f?.acceptMissing ?? false,
        });
      }
    }

    return { covered: slots.length - gaps.length, total: slots.length, gaps };
  }
  ```

- [x] Confirm TypeScript compiles: `pnpm --filter @demand-letter/api build`. <!-- Completed: 2026-06-24 -->

### 3. Implement GET /jobs/:id/gap-report Lambda handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/get-jobs-gap-report.ts`: <!-- Completed: 2026-06-24 -->

  ```typescript
  import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
  import { prisma } from '@demand-letter/db';
  import { computeGapReport } from '../lib/sufficiency-gate';

  export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const jobId = event.pathParameters?.id;
    if (!jobId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing job ID' }) };
    }
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };
    }
    const report = await computeGapReport(jobId);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    };
  };
  ```

- [x] Register `GetJobsGapReportFunction` in `template.yaml`: <!-- Completed: 2026-06-24 -->
  - `Handler: dist/handlers/get-jobs-gap-report.handler`
  - `Events: GetJobsGapReport: { Type: Api, Properties: { Path: /jobs/{id}/gap-report, Method: get } }`
  - Attach the existing `DbLayer` and `DATABASE_URL` env var.

### 4. Implement POST /jobs/:id/attorney-judgment Lambda handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/post-jobs-attorney-judgment.ts`: <!-- Completed: 2026-06-24 -->

  ```typescript
  import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
  import { prisma } from '@demand-letter/db';

  interface JudgmentBody {
    fields: { fieldName: string; value: string }[];
    acceptMissing?: string[];
  }

  export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const jobId = event.pathParameters?.id;
    if (!jobId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing job ID' }) };
    }
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };
    }

    let body: JudgmentBody;
    try {
      body = JSON.parse(event.body ?? '{}') as JudgmentBody;
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    // Upsert attorney-judgment fields
    for (const { fieldName, value } of body.fields ?? []) {
      await prisma.extractedField.upsert({
        where: { jobId_fieldName: { jobId, fieldName } },
        create: {
          jobId,
          fieldName,
          value,
          blockIds: [],
          confidence: 1.0,
          isNull: false,
          nullReason: null,
          source: 'attorney-judgment',
          acceptMissing: false,
        },
        update: {
          value,
          blockIds: [],
          confidence: 1.0,
          isNull: false,
          nullReason: null,
          source: 'attorney-judgment',
          updatedAt: new Date(),
        },
      });
    }

    // Mark accept-missing slots
    for (const fieldName of body.acceptMissing ?? []) {
      await prisma.extractedField.upsert({
        where: { jobId_fieldName: { jobId, fieldName } },
        create: {
          jobId,
          fieldName,
          value: null,
          blockIds: [],
          confidence: 0,
          isNull: true,
          nullReason: 'attorney accepted as missing',
          source: null,
          acceptMissing: true,
        },
        update: {
          acceptMissing: true,
          updatedAt: new Date(),
        },
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  };
  ```

- [x] Register `PostJobsAttorneyJudgmentFunction` in `template.yaml`: <!-- Completed: 2026-06-24 -->
  - `Handler: dist/handlers/post-jobs-attorney-judgment.handler`
  - `Events: PostJobsAttorneyJudgment: { Type: Api, Properties: { Path: /jobs/{id}/attorney-judgment, Method: post } }`
  - Attach the existing `DbLayer` and `DATABASE_URL` env var.

### 5. Gate generation on gap-report clearance  <!-- agent: general-purpose -->

- [x] Open the existing `POST /jobs/:id/generate` handler (locate in `packages/api/src/handlers/` — likely `post-jobs-generate.ts`). <!-- Completed: 2026-06-24 -->
- [x] At the top of the handler body, after validating the job exists, call:
  ```typescript
  import { computeGapReport } from '../lib/sufficiency-gate';

  const gapReport = await computeGapReport(jobId);
  if (gapReport.gaps.length > 0) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'gap_report_not_cleared',
        message: `${gapReport.gaps.length} slot(s) remain uncovered. Fill or accept-missing all gaps before generating.`,
        gaps: gapReport.gaps,
      }),
    };
  }
  ```
- [x] Confirm TypeScript compiles: `pnpm --filter @demand-letter/api build`. <!-- Completed: 2026-06-24 -->

### 6. React gap-report UI  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/pages/GapReportPage.tsx`. <!-- Completed: 2026-06-24 -->
- [x] The page fetches `GET /jobs/:id/gap-report` on mount using `useEffect` + `fetch`.
- [x] Render a summary banner: "X of Y slots covered."
- [x] When `gaps.length > 0`, render a table with columns: Slot Name | Null Reason | Fill Value | Accept Missing.
  - "Fill Value" column: `<input type="text">` bound to local state keyed by `fieldName`. Pre-populate with empty string.
  - "Accept Missing" column: `<input type="checkbox">` bound to local state keyed by `fieldName`.
  - Highlight the three priority slots with a visual indicator: `demand_amount`, `general_damages_estimate`, `future_medical_estimate`.
- [x] "Submit Attorney Judgment" button (disabled if no rows have a fill value or acceptMissing checked):
  - Collect `fields` (rows with non-empty fill value) and `acceptMissing` (rows where checkbox is checked).
  - `POST /jobs/:id/attorney-judgment` with the body.
  - On success, re-fetch the gap report.
- [x] "Proceed to Generate" button: enabled only when `gaps.length === 0`. Calls `POST /jobs/:id/generate`.
- [x] Wire the route in `packages/web/src/main.tsx` or router config as `/jobs/:id/gap-report`.
- [x] Confirm TypeScript compiles: `pnpm --filter @demand-letter/web build`. <!-- Completed: 2026-06-24 -->

### 7. TypeScript typecheck and final build  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from monorepo root. Fix any errors. <!-- Completed: 2026-06-24 -->
- [x] Run `pnpm build` from monorepo root (or build api, db, web packages individually).
- [x] Confirm zero type errors across all packages.
