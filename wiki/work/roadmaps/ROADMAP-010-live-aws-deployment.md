---
id: ROADMAP-010
title: Live AWS deployment
status: active
created: 2026-07-01
updated: 2026-07-01
owner: David Taylor
linked_requirements: —
linked_decisions: —
tags: [infra, aws, deployment]
---

# Roadmap 010: Live AWS deployment

## Goal

Ship a live AWS deployment path for the Demand Letter app: the SAM API is deployed, the database is migrated, the frontend is hosted, and production API/WebSocket URLs are wired.

## Phase 1: Stabilize

- [ ] [[TASK-113: Fix local deployment gates and SAM lint blockers]]

## Phase 2: Provision

- [ ] [[TASK-114: Create or pass a Textract completion SNS topic ARN]]
- [ ] [[TASK-115: Seed production AWS parameters and confirm deployment inputs]]

## Phase 3: API

- [x] [[TASK-116: Deploy the SAM stack to AWS]]
- [x] [[TASK-117: Run Prisma migrations against RDS]]

## Phase 4: Web

- [ ] [[TASK-118: Host the frontend on AWS and wire live API/WebSocket URLs]]

## Notes
