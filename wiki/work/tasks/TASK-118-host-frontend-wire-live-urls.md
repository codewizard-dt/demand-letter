---
id: TASK-118
title: "Host the frontend on AWS and wire live API/WebSocket URLs"
status: in-progress
created: 2026-07-01
updated: 2026-07-01
depends_on: [TASK-116]
blocks: []
parallel_safe_with: [TASK-117]
uat: ""
tags: [frontend, aws, deployment]
---

# TASK-118 — Host the frontend on AWS and wire live API/WebSocket URLs

## Objective

Deploy the Vite frontend to AWS hosting and configure it with the live REST API and WebSocket URLs emitted by the SAM stack.

## Approach

Use AWS Amplify Hosting as the quickest frontend path unless a stronger reason appears during execution to add S3 + CloudFront IaC. The frontend build must receive `VITE_API_URL` and `VITE_WS_API_URL` at build time.

## Steps

### 1. Configure AWS frontend hosting  <!-- agent: general-purpose -->

- [x] Create or configure the AWS Amplify Hosting app for `app/frontend` <!-- Completed: 2026-07-01 22:57; connected app `d2qz3c6ux2u72z` to GitHub repo, recreated repo-backed `main` branch with live env vars, enabled auto-build, and started Amplify job `1` -->
- [x] Set the build command to install dependencies and run the Vite frontend build
- [x] Set the publish directory to the frontend `dist` output
<!-- Updated: 2026-07-01 22:57 -->

### 2. Wire live environment variables  <!-- agent: general-purpose -->

- [x] Set `VITE_API_URL` to the deployed REST API URL from `TASK-116`
- [x] Set `VITE_WS_API_URL` to the deployed WebSocket API URL from `TASK-116`
- [x] Confirm the frontend code path in `app/frontend/src/lib/api.ts` receives `VITE_API_URL`
<!-- Updated: 2026-07-01 20:59 -->

### 3. Verify hosted frontend  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Load the hosted frontend URL
- [DEFERRED-TO-UAT] Confirm the app can reach the live `/jobs` API route
- [DEFERRED-TO-UAT] Confirm the editor WebSocket path uses the live WebSocket URL
<!-- Updated: 2026-07-01 21:02 -->
