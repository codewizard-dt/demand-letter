---
title: Tasks Index
updated: 2026-07-01
---

# Tasks — Active Items

Lists **only active** tasks (`todo`, `in-progress`). When a task leaves the active set (`done`, `trashed`), delete its line here — the file itself never moves; status lives in its frontmatter. See the [lifecycle](lifecycle.md).

Entry format: `- [TASK-NNN — Title](TASK-NNN-slug.md) — one-line summary · status`

- [TASK-111 — Wire eval runner to real handlers and add segmentation coverage](TASK-111-wire-eval-runner.md) — wire run_evals.ts to invoke handlers, add gs-054 golden case, add integration test for template segmentation · todo
- [TASK-112 — Refactor Zone model: elevate templateText to primary source of truth for multi-variable zones](TASK-112-multi-variable-zone-refactor.md) — fix multi-variable zone support: remove 1:1 field dedup, fix generation loop template rendering, update classifier prompt, lazy-migrate old zones · todo
- [TASK-113 — Fix local deployment gates and SAM lint blockers](TASK-113-fix-deployment-gates-sam-lint.md) — clear frontend typecheck, server test, and SAM lint blockers before AWS deployment · in-progress
- [TASK-114 — Create or pass a Textract completion SNS topic ARN](TASK-114-create-textract-completion-sns-arn.md) — provide a valid repeatable Textract completion SNS ARN path for SAM deployment · in-progress
- [TASK-115 — Seed production AWS parameters and confirm deployment inputs](TASK-115-seed-aws-parameters-confirm-inputs.md) — prepare SSM parameters, deploy parameters, and AWS service access for the live stack · in-progress
- [TASK-118 — Host the frontend on AWS and wire live API/WebSocket URLs](TASK-118-host-frontend-wire-live-urls.md) — deploy the Vite frontend and configure live REST and WebSocket endpoints · in-progress
