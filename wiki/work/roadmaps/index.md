---
title: Roadmaps Index
updated: 2026-06-11
---

# Roadmaps — Active Items

Lists **only active** roadmaps (`active`). When a roadmap completes (`done`), delete its line here — the file itself never moves; status lives in its frontmatter. See the [lifecycle](lifecycle.md).

Entry format: `- [ROADMAP-NNN — Title](ROADMAP-NNN-slug.md) — one-line summary · N/M items checked`

- [ROADMAP-001 — End-to-End Skeleton](ROADMAP-001-end-to-end-skeleton.md) — infra + naive Bedrock generation + LLM audit trail wired in; every layer touched · 0/17 items checked
- [ROADMAP-002 — Template Ingestion & Zone Detection](ROADMAP-002-template-ingestion-zone-detection.md) — docx structural parse → LLM zone labeling → attorney annotation UI → docxtemplater delimiter tags + slot enumeration · 0/13 items checked
- [ROADMAP-003 — Case-Record Ingestion & Provenance](ROADMAP-003-case-record-ingestion-provenance.md) — type-branching router → async Textract → bbox provenance store → Claude grounded extraction → sufficiency gate + gap report · 0/13 items checked
- [ROADMAP-004 — Generation Engine](ROADMAP-004-generation-engine.md) — docxtemplater-driven deterministic fill; Claude generates medical narrative only; SSE streaming; citation panel · 0/13 items checked
- [ROADMAP-005 — PHI/PII Compliance Layer](ROADMAP-005-phi-pii-compliance-layer.md) — Comprehend Medical + Comprehend PII detection; custom redaction step; log-scrubbing middleware; dev-view masking · 0/12 items checked
- [ROADMAP-006 — Attorney Refinement Loop](ROADMAP-006-attorney-refinement-loop.md) — scoped second-pass Claude refinement; SSE streaming; diff view; accept/reject/revert; refinement history · 0/11 items checked
- [ROADMAP-007 — Stretch: Collaborative Editing & Word Export](ROADMAP-007-collaborative-editing-word-export.md) — TipTap editor; Y.js CRDT real-time collaboration; per-operation change log; Word export · 0/14 items checked
