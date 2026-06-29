---
id: node-24-runtime-upgrade
title: Research — Node 24 Runtime Upgrade
aliases: [Node 24 Runtime Upgrade, Node runtime upgrade research]
updated: 2026-06-29
sources:
  - ../../raw/research/node-24-runtime-upgrade/index.md
tags: [node, runtime, lambda, ci]
---

# Research — Node 24 Runtime Upgrade

This source concludes that **Node 24 is the highest currently safe repo-wide Node target** because rel::[[AWS Lambda]] supports `nodejs24.x` as a managed runtime, while Node 26 is only listed as an upcoming Lambda runtime. The recommendation supersedes the earlier raw Node 22 assessment by using fresher Lambda runtime availability and Node LTS evidence; it does not require major dependency upgrades.

The runtime policy is uses::[[Node.js]] 24 across local tooling, CI, Lambda, handler bundling, package engines, and type declarations. The source records that Vite/Vitest, Prisma 5, `pdfjs-dist`, and AWS SDK v3 package metadata allow Node 24, and that async Lambda handler exports in the active app do not rely on callback-style completion APIs.

The implemented surface area is broad: `template.yaml` moves Lambda runtime/layer/build declarations to `nodejs24.x`, handler esbuild targets move to `node24`, GitHub Actions uses Node 24, `.nvmrc` and `.node-version` pin Node 24, package manifests require `>=24 <25`, and Node typings are pinned to `^24.0.0`. Verification passed under Node 24 for Prisma generation, server/web typechecks, server/web/db builds, and basic `sam validate`; `sam validate --lint` still reports unrelated RDS PostgreSQL 16.3 and placeholder SNS ARN warnings. relates_to::[[Node Runtime Policy]]
