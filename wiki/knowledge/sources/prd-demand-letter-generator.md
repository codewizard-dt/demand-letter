---
id: prd-demand-letter-generator
title: PRD — Demand Letter Generator (Steno)
updated: 2026-06-22
sources:
  - ../../raw/prd-demand-letter-generator.md
tags: [prd, ai-generation, legaltech]
---

# PRD — Demand Letter Generator (Steno)

derived_from::[[../../raw/prd-demand-letter-generator.md]]

relates_to::[[../entities/organisations/steno.md]] | relates_to::[[../concepts/demand-letter.md]] | relates_to::[[../concepts/ai-document-generation.md]]

## Overview

**Steno** is building an AI-powered demand letter generator for litigation attorneys. The tool accepts case source documents and a firm-level letter template, then uses a Claude (Anthropic) model to generate a draft demand letter that **matches the template exactly** in structure, formatting, and layout — populated with case-relevant facts. Attorneys can then issue follow-up AI instructions to refine the draft iteratively.

## Functional Scope

The core flow is: upload source materials → upload/select firm template → AI generates draft → attorney iterates via chat instructions. Accuracy is the paramount success criterion. Any code generation used internally must be sandboxed and isolated from sensitive data. The system is not optimised for cost or processing time.

A **stretch goal** adds Google Docs-style real-time collaborative editing of the generated output with full change tracking (per-user attribution), plus `.docx` export.

## Technical Requirements

**Stack:** TypeScript (primary), Python (optional), SQL — React frontend, Node.js backend, AWS Lambda via SAM, PostgreSQL persistence. uses::[[../entities/tools/anthropic-claude.md]]

**Performance constraints:**

- HTTP request/response: ≤ 5 seconds (non-streaming)
- Database queries: ≤ 2 seconds
- AI model calls: SSE streaming preferred
- Batch/agent workflows: asynchronous and queued

**Off-limits:** DeepSeek, platform-as-DX tools (Vercel, Heroku), legacy stacks (Tomcat, IIS).

## Deliverables & Timeline

1-week build. Required deliverables: source code, demo video, AI usage log, test results.

Technical contacts at Steno: relates_to::[[../entities/people/jp-dienst.md]] | relates_to::[[../entities/people/rick-douglas.md]]

## Business Impact

New product offering targeting law firm clients. Success metrics: (1) sales generation via new deal closures with law firms; (2) increased net revenue retention for adopting firms through time saved on demand letter drafting.
