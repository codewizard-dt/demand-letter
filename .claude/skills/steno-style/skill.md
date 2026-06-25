---
name: steno-style
description: Apply the Steno brand style guide to a React/TSX component. Pass the path to the component file as the argument. Reads the canonical style guide at packages/web/src/styles/style-guide.md, audits the component's current styling, and rewrites it using Steno brand tokens (Tailwind utilities + CSS variables). Use whenever a component needs to match steno.com's visual language.
category: executing
model: claude-sonnet-4-6
---

# Steno Style — Apply Brand Tokens to a Component

Applies the Steno brand design system to a single React/TSX component file.

**Invocation:** `/steno-style <relative-path-to-component>`

---

## Step 0: Read the style guide

Before touching any code, read the full style guide:

```
packages/web/src/styles/style-guide.md
```

This is the canonical source of truth. Do not rely on memory or defaults — read it now.

---

## Step 1: Audit the component

Use `get_symbols_overview` and `find_symbol` (Serena) to understand the component's current structure:

1. What HTML/JSX elements does it render?
2. What Tailwind classes or inline styles does it currently use?
3. Which visual roles are present: headings, body text, eyebrows, CTAs, cards, surfaces, borders, shadows?

---

## Step 2: Map roles to Steno tokens

For each visual role identified, apply the corresponding token from the style guide:

| Role | Token / Class |
|------|---------------|
| Page background | `bg-bg` (`#F0F1E8`) |
| Card / surface | `bg-surface` (`#F9FFFA`) |
| Body text | `text-primary` (`#193D3D`) |
| Muted / secondary text | `text-text-muted` (`#696969`) |
| H1 | `font-serif text-[55px] leading-[66px] tracking-[0.25px] font-normal` |
| H2 | `font-serif text-[48px] leading-[57.6px] tracking-[0.25px] font-normal` |
| H3 | `font-serif text-[38px] leading-[45.6px] tracking-[0.25px] font-medium` |
| H4 | `font-serif text-[28px] leading-[33.6px] tracking-[0.25px] font-medium` |
| Body copy | `font-sans text-base leading-[1.618] font-normal` |
| Eyebrow label | `font-sans text-[12px] font-normal uppercase tracking-[1px] text-primary-gold` |
| Primary CTA button | `bg-primary-gold text-white rounded-lg px-5 py-2 text-[12px] uppercase tracking-[0.25px] font-normal` |
| Border / divider | `border-border` (`#E8E5DC`) |
| Shadow sm | `shadow-sm` |
| Shadow md | `shadow-md` |
| Accent teal | `text-accent` / `bg-accent` (`#ABDFD4`) |
| Error / danger | `text-error` (`#B5006A`) |
| Hero gradient | `bg-[linear-gradient(80deg,#CE11A4_0%,#B5006A_30%,#493087_76%,#2F317C_93%)]` |

Tailwind border-radius tokens: `rounded-sm` (2px), `rounded-md` (10px), `rounded-lg` (50px pill), `rounded-circle` (50%).

---

## Step 3: Rewrite the component

Using Serena's symbolic or file/line editing tools:

1. Replace generic Tailwind classes (`bg-white`, `text-gray-900`, `text-blue-600`, `rounded`, etc.) with Steno brand equivalents from the map above.
2. Replace any hardcoded hex colors in `style={{}}` props with `var(--color-*)` CSS variables or Tailwind tokens.
3. Add `font-serif` to heading elements that lack it.
4. Add `font-sans` to body text and UI elements.
5. Add `text-primary` as the default text color if the component root lacks it.
6. If the component has buttons, ensure they use the primary CTA pattern above.
7. If the component has section labels / category tags, apply the eyebrow pattern.

**Do not change** component logic, prop interfaces, event handlers, or data-fetching. Only modify className strings, style props, and element variants.

---

## Step 4: Verify

After editing, run:

```bash
pnpm --filter web typecheck
```

Confirm there are no TypeScript errors introduced. If the project has a running dev server, describe what to visually verify in the component (correct background, font, button color, etc.) so the developer can confirm in the browser.

---

## Reference: CSS variables available globally

These are set on `:root` in `packages/web/src/index.css` and available in any inline `style` prop or custom CSS:

```
--color-primary        #193D3D  dark teal
--color-primary-gold   #A18050  gold accent / CTAs
--color-secondary      #346E4A  forest green
--color-secondary-steel #27455C dark blue-slate
--color-bg             #F0F1E8  page background (cream)
--color-surface        #F9FFFA  card surface (near-white)
--color-border         #E8E5DC  muted sand dividers
--color-accent         #ABDFD4  light teal
--color-error          #B5006A  error / danger
--color-text-muted     #696969  secondary text
--gradient-hero        linear-gradient(80deg, #CE11A4 0%, #B5006A 30%, #493087 76%, #2F317C 93%)
```
