---
name: "steno-brand-style"
description: "Apply the canonical Steno brand style system to any Steno web page or React/TSX component using shared CSS variables and Tailwind utility mappings."
category: executing
model: claude-sonnet-4-6
---

# Steno Brand Style — Apply to Page or Component

Use this skill when you need to align an existing page/component with Steno’s canonical brand system quickly.

**Invocation:** `/steno-brand-style <relative-path-to-file>`

## Step 0: Read sources

Read both of these files first:

- `packages/web/src/styles/style-guide.md`
- `packages/web/src/index.css`

The style guide is canonical for tokens and component intent; `index.css` is canonical for runtime variables.

## Step 1: Audit the target

Read the target file with:

- Current className usage and visual roles (heading, eyebrow, card, button, link, table, surface, background, status chip, alert/error block)
- Any existing style overrides (`style={{...}}`) and hardcoded hex values
- Whether the target is a full page or reusable component

## Step 2: Remap into brand roles

For each visual role, map to Steno tokens from the style guide:

| Role | Preferred classes/tokens |
| --- | --- |
| Page background | `bg-bg` |
| Surface / card / container | `bg-surface`, optional `rounded-md`, `border`, `border-border`, `shadow-sm`/`shadow-md` |
| Body typography | `font-sans` + `text-base` / `text-sm` + `leading-[1.618]` + `tracking-[0.25px]` |
| Heading typography | `font-serif` plus size/line-height values from the guide (`text-[55px]`…`text-[28px]`, etc.) |
| Eyebrow / label | `text-[12px] font-normal uppercase tracking-[1px] text-primary-gold` |
| Primary CTA | `bg-primary-gold text-white rounded-lg px-5 py-2 text-[12px] uppercase tracking-[0.25px]` |
| Borders and separators | `border-border` with radius from role (`rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-circle`) |
| Error / danger | `text-error` / `border-error` as appropriate |
| Hero gradient | `bg-[linear-gradient(80deg,#CE11A4_0%,#B5006A_30%,#493087_76%,#2F317C_93%)]` |
| Status token (pill) | `st-status` |
| Status token (muted) | `st-status-muted` |
| Status banner (inline or full width) | `st-status-banner` |
| Success banner variant | `st-status-banner-success` |

## Step 3: Rewrite carefully

Use Serena editing for the target file:

1. Replace generic colors and non-brand utility classes (e.g. `bg-white`, `text-black`, `text-blue-600`, `rounded`, generic grays) with brand equivalents.
2. Replace hardcoded hex values in `style` props with equivalent CSS variables from `:root` where possible.
3. Keep component logic unchanged; only update className and style expression tokens that affect presentation.
4. Preserve existing layout structure unless the existing structure conflicts with design intent.
5. Add `font-serif` to heading elements and `font-sans` to supporting text when missing.
6. For any `role="status"` message, badge, or chip, prefer these reusable tokens before introducing ad-hoc colors:
   - `st-status` (neutral label) for compact inline chips
   - `st-status-muted` for neutral secondary pills
   - `st-status-banner` for status banners/inline messages
   - `st-status-banner-success` for success confirmations

## Step 4: Verify

If the target is a React/TSX file:

```bash
pnpm --filter web typecheck
```

If the target is a static markdown page or docs artifact, run a short visual/manual pass:

- Color usage uses only Steno tokens/variables
- Type scale and spacing feel match the style guide
- CTA and labels follow primary CTA / eyebrow patterns
- Borders, surfaces, and shadows are consistent across sections

## Reusable style utility map (from live Steno module CSS)

- `role=status` / small status chips: `st-status`, `st-status-muted`, `st-status-banner`
- Primary CTA: `btn-primary` and `btn-outline` map to the live `#a18050` / uppercase / pill / pill-shadow pattern.
- Headings:
  - `st-section-heading`
  - `text-[55px]`, `text-[48px]`, `text-[38px]`, `text-[28px]` (mapped by context)
- Labels / eyebrow:
  - `st-eyebrow`
- Card surfaces:
  - `st-card`

## Step 5: Report what changed

Summarize:
- Which brand roles were touched (e.g., buttons, cards, headings, alerts)
- Any unsupported old values intentionally preserved and why
- Any follow-up cleanup needed (if a non-class style override blocks full token mapping)
