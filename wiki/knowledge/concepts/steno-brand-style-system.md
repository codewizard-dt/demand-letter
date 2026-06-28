---
id: steno-brand-style-system
title: Steno Brand Style System
aliases:
  - Steno brand system
  - Steno style system
updated: 2026-06-28
sources:
  - ../../raw/research/steno-brand/index.md
  - ../../raw/research/steno-brand/index-2.md
  - ../../raw/research/steno-brand/sources.md
  - ../../raw/research/steno-brand/sources-2.md
tags: [design-system, brand, frontend]
---

# Steno Brand Style System

uses::[[../entities/organisations/steno.md]] | derived_from::[[../sources/steno-brand.md]]

The Steno brand style system combines cream-based surfaces, dark teal body text, gold accents, and editorial serif headings to create a premium legal-tech tone. In practice, the system is operationalized in `packages/web/src/styles/style-guide.md` as concrete color, typography, spacing, and component patterns.

A key practical pattern is **consistency over novelty**: same visual primitives recur across homepage, legal-tech, transcript product, and DelayPay surfaces (button styling, section headings, eyebrow labels, card surfaces, and status chips), which lets frontend pages stay on-brand without bespoke component one-offs.

The 2026-06-28 supplement adds status-role standardization to the style system: role surfaces should use shared banner/chip classes (for example `st-status` and `st-status-banner`) so status semantics remain consistent even as copy changes by page.

This concept links the visual evidence (`wiki/knowledge/sources/steno-brand.md`) to implementation targets in the web codebase, especially token usage in `packages/web/src/index.css` and reusable component class mapping.
