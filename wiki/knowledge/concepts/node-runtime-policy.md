---
id: node-runtime-policy
title: Node Runtime Policy
aliases: [Node version policy, Runtime version policy, Node 24 policy]
updated: 2026-06-29
sources:
  - ../../raw/research/node-24-runtime-upgrade/index.md
tags: [node, runtime, deployment]
---

# Node Runtime Policy

The project standardizes runtime selection around the **highest managed deployment runtime that the dependency set supports**, not the newest Node version installed locally. For this repo, the selected standard is uses::[[Node.js]] 24 because rel::[[AWS Lambda]] supports `nodejs24.x` and the inspected package engine metadata accepts Node 24.

The policy applies across all executable surfaces: local version selectors (`.nvmrc`, `.node-version`), package `engines.node`, TypeScript Node declarations, CI `setup-node`, Lambda runtime declarations, SAM build methods, Lambda layer compatible runtimes, and esbuild targets. Keeping these surfaces aligned prevents CI, local development, and Lambda deployment from silently validating different Node APIs.

Node 26 is intentionally excluded until Lambda offers it as a managed runtime. The source also records a known non-Node blocker: `sam validate --lint` still flags RDS PostgreSQL 16.3 deprecation and placeholder Textract SNS ARN validation even after the Node 24 template passes basic `sam validate`. derived_from::[[Research — Node 24 Runtime Upgrade]]
