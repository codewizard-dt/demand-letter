---
topic: "$research supplemental -- pull actual css from their page if possible and generalize the styles"
slug: steno-brand
researched: 2026-06-28
---

# Primary Sources — $research supplemental -- pull actual css from their page if possible and generalize the styles

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `packages/web/src/styles/style-guide.md` | 2026-06-28 | Existing canonical brand token guide and style roles used as the baseline for status-role extension. |
| S2 | codebase | `packages/web/src/index.css` | 2026-06-28 | Shared runtime CSS variables and component classes were extended to include status role classes (`st-status*`, `st-status-banner*`). |
| S3 | codebase | `packages/web/src/pages/AnnotatePage.tsx` | 2026-06-28 | Status confirmation message refactor to branded status banner class pattern. |
| S4 | codebase | `packages/web/src/pages/UploadPage.tsx` | 2026-06-28 | Loading status indicator migrated to branded status banner class pattern. |
| S5 | codebase | `.claude/skills/steno-brand-style/skill.md` | 2026-06-28 | Added explicit status-token mapping and reusable brand-role instructions for any page/component. |
| S6 | web | `https://www.steno.com/` | 2026-06-28 | Live stylesheet references and captured source pages that justify the reusable brand token approach. |

## Excerpts

### S1 — Style Guide status baseline
```md
## Eyebrow / Label
...
Text transform | uppercase
letter-spacing | 1px
```

### S2 — Runtime variables and utility layer extension
```css
.st-status {
  @apply inline-flex items-center px-4 py-1 rounded-full text-[12px] font-normal uppercase tracking-[1px] leading-none;
  border: 1px solid var(--color-primary-gold);
}
```

### S3 — Branded status in template context
```tsx
<div className="mb-4 st-status-banner st-status-banner-success" role="status" aria-live="polite">
```

### S4 — Upload status indicator upgrade
```tsx
<div
  role="status"
  aria-live="polite"
  className="mb-4 st-status-banner"
>
```
