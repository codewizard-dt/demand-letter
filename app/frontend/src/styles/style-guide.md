# Style Guide — Demand Letter Generator

Derived from the Steno.com visual audit (re-audited 2026-06-24 with live DOM extraction
from steno.com homepage and services/court-reporting page). Use this as the single
source of truth when writing Tailwind utilities, CSS variables, or component tokens.

---

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#193D3D` | Primary text, dark section backgrounds, footer |
| `primary-gold` | `#A18050` | CTA buttons, accent links |
| `secondary` | `#346E4A` | Secondary actions |
| `secondary-steel` | `#27455C` | Dark section variant |
| `bg` | `#F0F1E8` | Page background (off-white cream) |
| `surface` | `#F9FFFA` | Light section backgrounds, cards |
| `white` | `#FFFFFF` | Card fills, text on dark backgrounds |
| `border` | `#E8E5DC` | Subtle borders, dividers (muted sand) |
| `text` | `#193D3D` | Default body text (same as primary) |
| `text-muted` | `#696969` | Secondary / supporting body text |
| `accent` | `#ABDFD4` | Gradient accent, light teal highlights |
| `error` | `#B5006A` | Error states (pulled from accent gradient) |

---

## Typography

> **Note on fonts:** Apercu and Editor are proprietary Steno.com typefaces and are
> not available via Google Fonts or npm. Use the fallback-safe stacks below, which
> approximate each typeface's character. Swap in licensed font files if/when
> procured and add `@font-face` declarations in `main.css`.

### Font families

| Role | Stack |
|------|-------|
| Body / UI (replaces Apercu, humanist sans-serif) | `'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif` |
| Headings / display (replaces Editor, editorial serif) | `'Playfair Display', ui-serif, Georgia, serif` |

### Weight scale

| Token | Value |
|-------|-------|
| `font-thin` | 100 |
| `font-normal` | 400 |
| `font-medium` | 500 |
| `font-semibold` | 600 |
| `font-bold` | 700 |

### Base type

Body text is variable-size in practice; use Tailwind's `text-sm`/`text-base`/`text-lg` utilities.

| Property | Value | Notes |
|----------|-------|-------|
| Body weight | `100` (thin) | All body copy is weight 100 |
| Card body | `14px` / `22.4px` line-height / `0.35px` letter-spacing | Small descriptions inside cards |
| Default body | `16px` / `25.6px` line-height / `0.25px` letter-spacing | General paragraphs |
| Lead / intro | `18px` / `28.8px` line-height / `0.25px` letter-spacing | Section intro paragraphs |

### Heading scale (display / serif font)

| Level | Size | Weight | Line-height | Letter-spacing |
|-------|------|--------|-------------|----------------|
| H1 | `55px` | 400 | `66px` | `0.25px` |
| H2 | `48px` | 400 | `57.6px` | `0.25px` |
| H3 | `38px` | 500 | `45.6px` | `0.25px` |
| H4 | `28px` | 500 | `33.6px` | `0.25px` |

---

## Spacing

Base unit: **4px**

| Token | Value |
|-------|-------|
| `space-1` | `4px` |
| `space-2` | `8px` |
| `space-3` | `12px` |
| `space-4` | `16px` |
| `space-6` | `24px` |
| `space-8` | `32px` |
| `space-12` | `48px` |

---

## Borders

| Token | Value |
|-------|-------|
| `radius-sm` | `2px` |
| `radius-md` | `10px` |
| `radius-lg` | `50px` (pill) |
| `radius-circle` | `50%` |
| Border color | `#E8E5DC` (muted sand) |

---

## Shadows

All shadows are tinted with the brand primary `#193D3D`.

| Level | Value |
|-------|-------|
| `shadow-sm` | `rgba(25, 61, 61, 0.10) 0px 1px 12px 0px` |
| `shadow-md` | `rgba(25, 61, 61, 0.20) 0px 5px 25px 0px` |
| `shadow-lg` | `rgba(25, 61, 61, 0.30) 0px 10px 50px 0px` |

---

## Gradients

### Accent gradient (Hero / CTA sections)
```
linear-gradient(80deg, #CE11A4 0%, #B5006A 30%, #493087 76%, #2F317C 93%)
```

### Section wash (Green/Cream transition)

> **Note:** This gradient was not observed in the live DOM during the 2026-06-24 audit;
> it may be used on pages not audited or as a CSS background-image on specific components.
> Keep for reference but verify before using.

```
linear-gradient(0deg, #ABDFD4 0%, #D6ECE2 30%, #EFF2E9 80%, #F5F5EE 100%)
```

---

## Buttons (primary CTA)

| Property | Value |
|----------|-------|
| Background | `#A18050` |
| Text color | `#FFFFFF` |
| Border-radius | `50px` (pill) |
| Padding | `8px 20px 7px` |
| Font size | `12px` |
| Font weight | `400` |
| Text transform | `uppercase` |
| Letter spacing | `0.25px` |

---

## Eyebrow / Label

Small uppercase callout that sits above a heading to categorise the section (e.g. "Deferred Payment Solutions for Every Firm").

| Property | Value |
|----------|-------|
| Color | `#A18050` (primary-gold) |
| Font size | `12px` |
| Font weight | `400` |
| Text transform | `uppercase` |
| Letter spacing | `1px` (wider than buttons — creates label distinction) |
| Font family | Body / sans (Apercu → Inter fallback) |

Tailwind utility shorthand:
```
text-[12px] font-normal tracking-[1px] uppercase text-primary-gold
```

## Status and Live Feedback

Use these shared role classes for status-like elements:

| Role | Utility class | Notes |
|------|---------------|-------|
| Inline chip | `st-status` | Pill badge with uppercase microcopy and gold edge treatment |
| Muted chip | `st-status-muted` | Muted border/text variant of `st-status` |
| Inline banner | `st-status-banner` | Banner-style `role="status"` treatment for message rows |
| Success banner | `st-status-banner-success` | Success-state variant of `st-status-banner` |

---

## Products / Services Reference

Steno's live navigation as of 2026-06-25. Use when naming features or sections in the app UI to stay on-brand.

**What We Do (Services)**
- Court Reporting
- Remote Depositions
- DelayPay
- Legal Technology
- Litigation Support Services (CA)

**Technology & Integrations**
- Transcript Genius
- Steno Connect for Zoom
- Firm Dashboard
- Clio Integration
- Litify Integration

---

## Tone

Professional legal-tech brand that balances editorial refinement with
contemporary tech confidence. Copy is direct and concise, using active voice
throughout — describe what the product does, not how it feels. Warmth is
conveyed through the teal/gold palette and measured editorial serif headings
rather than casual or colloquial language.

---

## Tailwind Theme Overrides

Paste into `tailwind.config.js` → `theme.extend`. Ready for TASK-019.

```js
// tailwind.config.js — theme.extend section
// Source: app/frontend/src/styles/style-guide.md (Steno.com audit)
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#193D3D', // dark teal — primary text, dark section backgrounds, footer
        gold: '#A18050',    // CTA buttons / accent links
      },
      secondary: {
        DEFAULT: '#346E4A', // forest green — secondary actions
        steel: '#27455C',   // dark section variant
      },
      bg: '#F0F1E8',          // page background (off-white cream)
      surface: '#F9FFFA',     // light section backgrounds, cards
      border: '#E8E5DC',      // muted sand dividers
      accent: '#ABDFD4',      // light teal gradient accent / section wash
      error: '#B5006A',       // error states (pulled from accent gradient)
      'text-muted': '#696969',// secondary / supporting body text
    },
    fontFamily: {
      // Replaces Steno's proprietary Apercu (humanist sans-serif)
      sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      // Replaces Steno's proprietary Editor (editorial serif)
      serif: ['Playfair Display', 'ui-serif', 'Georgia', 'serif'],
    },
    borderRadius: {
      sm: '2px',
      md: '10px',
      lg: '50px',   // pill — used on primary CTA buttons
      circle: '50%',
    },
    boxShadow: {
      // All shadows tinted with brand primary #193D3D
      sm: 'rgba(25, 61, 61, 0.10) 0px 1px 12px 0px',
      md: 'rgba(25, 61, 61, 0.20) 0px 5px 25px 0px',
      lg: 'rgba(25, 61, 61, 0.30) 0px 10px 50px 0px',
    },
  },
},
```
