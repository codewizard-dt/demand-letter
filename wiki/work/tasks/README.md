---
title: Tasks Index
updated: 2026-06-24 <!-- TASK-044 added -->
last_task: TASK-044-docxtemplater-render-s3-template-load.md
next_task_number: '045'
---

# Tasks — Active Items

Lists **only active** tasks (`todo`, `in-progress`). When a task leaves the active set (`done`, `trashed`), delete its row here and move the file to `archive/` — the task file status field is authoritative. See the [lifecycle](lifecycle.md).

## Active Tasks

| #   | Slug                                                                                        | Progress | UAT  | Flags                                                | Objective                                                                                         |
| --- | ------------------------------------------------------------------------------------------- | -------- | ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 005 | [TASK-005-bedrock-model-access](TASK-005-bedrock-model-access.md)                           | 1/4      | none | [BLOCKED: AWS CLI not installed in this environment] | Enable access to `anthropic.claude-sonnet-4-6` in Amazon Bedrock.                                 |
| 011 | [TASK-011-admin-llm-costs-endpoint](TASK-011-admin-llm-costs-endpoint.md)                   | 4/5      | none | [DEFERRED-TO-UAT: step 5 smoke test]                 | Implement `GET /admin/llm-costs` Lambda endpoint returning LLM cost aggregates and recent rows.   |
| 012 | [TASK-012-admin-usage-dashboard-page](TASK-012-admin-usage-dashboard-page.md)               | 4/5      | none | [DEFERRED-TO-UAT: runtime render check]              | Build `/admin/usage` React page fetching from `GET /admin/llm-costs` with cost summary tables.    |
| 013 | [TASK-013-post-jobs-endpoint](TASK-013-post-jobs-endpoint.md)                               | 5/5      | none | [DEFERRED-TO-UAT: curl smoke test]                   | Implement `POST /jobs` Lambda handler that creates a Job record and returns `{ id }` with 201.    |
| 014 | [TASK-014-post-jobs-files-endpoint](TASK-014-post-jobs-files-endpoint.md)                   | 5/5      | none | [DEFERRED-TO-UAT: curl smoke test]                   | Implement `POST /jobs/:id/files` — upload DOCX template and PDF case docs to S3 and PostgreSQL.  |
| 017 | [TASK-017-lambda-db-layer-sam-wiring](TASK-017-lambda-db-layer-sam-wiring.md)               | 4/4      | none |                                                      | Create shared `DbLayer` Lambda layer for Prisma client; wire all Lambda functions to use it.      |
| 023 | [TASK-023-end-to-end-smoke-test](TASK-023-end-to-end-smoke-test.md)                         | 1/6      | none | [BLOCKED: SAM CLI not installed; Steps 1-5 blocked]  | Verify full end-to-end skeleton: upload files, trigger Bedrock generation, verify output and audit log. |
