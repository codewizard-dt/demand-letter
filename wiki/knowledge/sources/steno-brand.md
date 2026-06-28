---
id: steno-brand
aliases:
  - Steno brand assets
  - Steno brand style evidence
title: Research — Steno Brand Style Assets
updated: 2026-06-28
sources:
  - ../../raw/research/steno-brand/index.md
  - ../../raw/research/steno-brand/index-2.md
  - ../../raw/research/steno-brand/sources.md
  - ../../raw/research/steno-brand/sources-2.md
tags: [brand, design-system, steno]
---

# Research — Steno Brand Style Assets

derived_from::[[../../raw/research/steno-brand/index.md]]
relates_to::[[../entities/organisations/steno.md]] | relates_to::[[../concepts/steno-brand-style-system.md]]

This source bundle is a **visual and CSS evidence pack** for Steno’s brand system. It combines screenshots from live marketing pages with extracted stylesheet excerpts from `steno.com` to verify how tone, spacing, and interaction states are consistently implemented across pages.

**Key claim:** Steno’s web modules expose reusable brand roles (headings, eyebrow labels, card containers, primary CTA buttons) rather than isolated page styles, so the app can adopt shared role classes for visual consistency.

**Key claim:** the pages confirm a repeated typography and token pattern (dark slate text, warm gold accents, pill buttons, bordered elevation, and rem-to-10 scaling conventions) that maps cleanly onto the local design tokens in this repository.

An additional recommendation from the second note is to standardize status surfaces via branded utility classes (`st-status`, `st-status-banner`, `st-status-banner-success`) instead of custom per-page utility stacks.

The evidence was used to calibrate the project’s **canonical frontend style map** (`packages/web/src/styles/style-guide.md`, `packages/web/src/index.css`) and to justify role-level updates in key status/notification code paths.
