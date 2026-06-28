---
topic: "$research supplemental -- pull actual css from their page if possible and generalize the styles"
slug: steno-brand
researched: 2026-06-28
sources: [./sources-2.md]
---

# Research: Steno brand supplemental CSS pull + status generalization

Builds on [index.md](index.md). This update adds practical status-role generalization so any page/component can reuse the same brand intent.

## Research Questions
- How can status messages/chips be standardized with the same brand language as CTA/eyebrow/heading roles?
- What minimal shared primitives avoid page-specific status styling drift?
- Which implementation touchpoints should the project-scoped style skill drive first?

## Current State (Codebase)
- Reusable style anchors already exist in `packages/web/src/styles/style-guide.md` and runtime tokens in `packages/web/src/index.css`.
- A project-scoped brand skill exists at `.claude/skills/steno-brand-style/skill.md`.
- The `raw/research/steno-brand` evidence has already captured live Steno module CSS and gradients in the base `index.md` / `sources.md`. [S1][S2][S5]

## Key Findings
- Status-like UI should be treated as a dedicated role, not ad-hoc utility bundles, to keep semantics clear and easy to refactor.
- `role="status"` surfaces in this codebase should map to a shared `st-status-banner` surface and a compact `st-status` token for inline chips. This now has canonical definitions tied to the same brand token palette (`--color-*` values) used by buttons/headings. [S1][S3][S4]
- Project-level skill instructions now explicitly include status chips/banners and reusable Steno token classes, so future refactors can be one-shot across any page/component file. [S6]

## Generalization Strategy
1. Keep status as a first-class role:
   - compact chip: `st-status` (or `st-status-muted`)
   - banner/row message: `st-status-banner` (add `st-status-banner-success` for confirmations)
2. Prefer classes over hard-coded color utility bundles (`blue-*`, `teal-*`, etc.) for status states.
3. Centralize component-level intent in `.claude/skills/steno-brand-style/skill.md` so each page can use the same canonical mapping.

## Constraints
- `Editor` and `Apercu` are proprietary in the live source; local implementation remains on fallback stacks with CSS tokens.
- Shared styles are extracted from HubSpot module CSS where `html{font-size:1px}` makes rem-like values appear px-like; we already normalize this to readable utility scales in `style-guide.md` and `index.css` rather than copying module internals literally.

## Recommendation
- Apply `st-status*` classes wherever status is surfaced, and keep message content untouched.
- For this specific issue, two existing status instances in UI have been updated to branded banner patterns:
  - `packages/web/src/pages/AnnotatePage.tsx`
  - `packages/web/src/pages/UploadPage.tsx`

## Next Steps
- Sweep additional `role="status"` call sites and migrate them to the same banner/chip primitives.
- If you want a clean wiki refresh, run `wiki-ingest raw/research/steno-brand/index-2.md` once this supplemental note is accepted.
