---
topic: "$research supplemental -- pull actual css from their page if possible and generalize the styles"
slug: steno-brand
researched: 2026-06-28
sources: [./sources.md]
---

# Research: Steno brand supplemental CSS pull + generalization

Steno.com pages load a shared HubSpot module CSS stack (`template_styles` + module assets). The live CSS contains a consistent set of reusable visual roles that can be generalized for any page/component in this project.

## Research Questions
- What concrete styles are active on `steno.com` pages as of 2026-06-28?
- Which CSS declarations are shared across modules versus page-specific?
- Which reusable brand tokens should be promoted into shared app styles?
- How should this be applied to inconsistent components like status tags/chips?

## Current State (Codebase)
- A project style guide already exists at `packages/web/src/styles/style-guide.md` and defines canonical tokens for Steno-like styling.
- Runtime variables are already defined in `packages/web/src/index.css` and used by app components.
- A project-scoped skill already exists at `.claude/skills/steno-brand-style` to apply the style guide to pages/components.
- `raw/research/steno-brand/` currently contains only screenshot captures and has no prior `index.md` report payload.

(See [S1], [S2], [S3])

## Key Findings
- `https://www.steno.com/` and related pages resolve to a stable module list that includes these shared assets:
  `template_styles.min.css`, `module_u4m-header-v2.min.css`, `module_u4m-hero-v2.min.css`, `module_u4m-cta-row-v2.min.css`, `module_u4m-cards.min.css`, and `module_u4m-footer.min.css`. Route-specific extras include `module_u4m-Embed.min.css` and `module_u4m-section-intro.min.css` on transcript/other pages. [S3]

- Typography and text roles are explicit and highly reusable:
  - Fonts used directly in modules are `Editor` and `Apercu` with `@font-face` declarations.
  - Modules define `html{font-size:1px}`, so many `rem` values are effectively px-like scale numbers.
  - Eyebrow/label style is `font-size:12rem`, uppercase, and spaced (`letter-spacing:1rem`) with the accent color. [S5]
  - Large heading sizes include `70rem`, `55rem`, `48rem`, `38rem`, and `28rem` variants across hero/cards/testimonial styles. [S5][S6][S7]

- Button/CTA pattern is shared across modules:
  - Base button style is pill-shaped (`border-radius:50rem`) with `background-color:#a18050`, uppercase tracking (`letter-spacing:.25rem`) and white foreground.
  - Hover/focus states commonly switch to `#7848df`.
  - Depth consistently uses `rgba(25,61,61,.1)` in box shadows.
  - Border-gradient `button-stroked` variants exist in multiple modules and use `linear-gradient(19.13deg,#eb5757 3.72%,#9b00e2 97.81%)`. [S5]

- Section/card semantics map well to reusable roles:
  - Cards use bordered, elevated surfaces and muted light backgrounds (e.g., `#eff2e9`) with display and meta text styles suitable for general component adaptation.
  - CTA row module uses a patterned dark block treatment with `linear-gradient(-45deg,#383a81,#241743 50%)` and high-contrast CTA text/link treatment. [S6][S7]

- Cross-check with local baseline:
  - Existing local style guide already aligns broadly on core palette and CTA/button intent, and this supplement adds the exact live rem/font/button signals from the source modules for higher-fidelity parity. [S1][S2][S5]

## Generalization Strategy
Use shared role tokens and avoid hard-coded values in component code.

1. Core brand tokens
- `--st-primary: #193D3D`
- `--st-accent: #A18050`
- `--st-bg: #F0F1E8`
- `--st-text: #193D3D`
- `--st-muted: #696969`
- `--st-soft: #EFF2E9`
- `--st-border: #E8E5DC`
- `--st-shadow: 0 1px 12px 0 rgba(25,61,61,.10)`

2. Typography roles
- `--st-font-display: 'Editor'` (or fallback)
- `--st-font-body: 'Apercu'` (or fallback)
- `.eyebrow`: `12px/1px/uppercase` + `--st-accent`
- `.section-heading`: `font-size: 70px -> 38px` scale ladder by context

3. Status-style token pattern
For status tags/chips, adopt the small label role pattern:
- `inline-flex items-center px-4 py-1 rounded-full text-[12px] uppercase tracking-[1px] font-medium border border-[--st-accent] text-[--st-accent] bg-[--st-bg]`
- Inverse variant: border/text in `--st-soft`, background `--st-primary`.

4. Component role classes
Add reusable role classes (`btn-primary`, `btn-outline`, `section-heading`, `eyebrow`, `card`, `status-badge`) and map those roles in app pages/components.

## Constraints
- `Editor` and `Apercu` are proprietary assets; local app should keep explicit fallbacks unless licensed font files are available.
- Module styles are minified and versioned by HubSpot URLs; upstream changes can affect selector details.
- Some module behavior is section-specific; generalization should preserve semantic roles while allowing per-page overrides.

## Recommendation
### Recommended approach
- Treat this as a supplemental, evidence-backed extension to `style-guide.md`.
- Use role-first classes for status-like elements so they inherit one of:
  - neutral label style,
  - inverse label style,
  - card header style.
- Apply this before manual pixel-tuning to keep components aligned with source behavior.

### Next steps
- If you want immediate enforcement: first apply the role mapping to the status element and then run a quick visual pass.
- Persist to knowledge: `wiki-ingest raw/research/steno-brand/index.md`.
