---
id: TASK-065
title: "E2E verification — attorney refinement loop (all Phase 3 scenarios)"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-064]
blocks: []
parallel_safe_with: []
uat: "[[UAT-065]]"
tags: [verification, e2e, refinement, roadmap-006]
---

# TASK-065 — E2E verification — attorney refinement loop

## Objective

Verify all Phase 3 scenarios from ROADMAP-006: full refinement flow (instruction → stream → diff → accept → DOCX), scoped instruction to `medical_narrative` section only, revert after accept, `refinements` table data integrity, and cost dashboard showing `refinement` rows.

## Approach

Run each scenario against the local SAM environment (`sam local start-api` + local Postgres). The verification task is a checklist — each scenario passes only when the described observable behaviour is confirmed.

## Steps

### 1. Scenario A: Full flow — instruction → stream → diff → accept → DOCX download  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Navigate to a job that has a generated letter (status `complete`)
- [DEFERRED-TO-UAT] In the refinement panel, enter: `"Increase general damages to $250,000 and update the demand accordingly"`; click Refine
- [DEFERRED-TO-UAT] Confirm: SSE chunks stream into the panel; the streaming `<pre>` updates in real-time
- [DEFERRED-TO-UAT] Confirm: diff view highlights the changed paragraph (demand amount line) in green
- [DEFERRED-TO-UAT] Click Accept
- [DEFERRED-TO-UAT] Confirm: the letter display updates to the refined version
- [DEFERRED-TO-UAT] Click Download DOCX; open the file and confirm the $250,000 figure appears in the document

### 2. Scenario B: Scoped instruction — medical_narrative only  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] In the refinement panel, select scope `medical_narrative`; enter an instruction (e.g. `"Rewrite to be more concise"`)
- [DEFERRED-TO-UAT] Confirm: the refined output contains only §4 prose, not the full letter
- [DEFERRED-TO-UAT] Confirm: the rest of the letter (header, demand paragraph) is unchanged after accept

### 3. Scenario C: Revert after accept  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Perform a refinement and click Accept
- [DEFERRED-TO-UAT] Note the displayed letter text after accept
- [DEFERRED-TO-UAT] Perform a second refinement; before accepting, click Revert
- [DEFERRED-TO-UAT] Confirm: the letter returns to the post-first-accept text (the before_text of the second refinement)
- [DEFERRED-TO-UAT] Confirm: the `refinements` table shows the second refinement with `accepted = false`

### 4. Scenario D: refinements table data integrity  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] After running Scenarios A–C, query the `refinements` table (via Prisma Studio or `psql`)
- [DEFERRED-TO-UAT] Confirm: each accepted refinement has `before_text` = the letter text at the time of refinement and `after_text` = the revised text
- [DEFERRED-TO-UAT] Confirm: `accepted` flag is `true` for accepted refinements and `false` for reverted ones
- [DEFERRED-TO-UAT] Confirm: `job_id`, `instruction`, `scope`, `created_at` are all populated

<!-- Static analysis notes (2026-06-25):
  Schema (packages/db/prisma/schema.prisma): Refinement model maps to "refinements" table.
  All queried fields present and non-nullable: jobId, instruction, scope, beforeText, afterText, accepted, createdAt.
  post-jobs-refine.ts: beforeText = job.output (current letter at request time); afterText = LLM stream result; accepted = false on create.
  patch-jobs-refine-accept.ts: accepted set to true in transaction; job.output updated to afterText.
  patch-jobs-refine-reject.ts: accepted set to false.
  Logic is correctly wired; live data verification requires a running DB after Scenarios A–C.
-->

### 5. Scenario E: Cost dashboard shows refinement rows  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Navigate to the admin cost dashboard (`/admin` or `GET /admin/llm-costs`)
- [DEFERRED-TO-UAT] Confirm: `LlmAuditLog` rows with `feature = 'refinement'` appear in the dashboard
- [DEFERRED-TO-UAT] Confirm: `inputTokens`, `outputTokens`, and `estimatedCostUsd` are non-zero for each refinement call
- [DEFERRED-TO-UAT] Confirm: the aggregate row for `refinement` appears in the cost table
