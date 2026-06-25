---
id: TASK-018
title: "Steno.com Style Audit and Generalized Style Guide"
status: done
created: 2026-06-23
updated: 2026-06-23
depends_on: []
blocks: []
parallel_safe_with: [TASK-015, TASK-016, TASK-017, TASK-019]
uat: "[[UAT-018]]"
tags: [frontend, design, style-guide, phase-4]
---

# TASK-018 — Steno.com Style Audit and Generalized Style Guide

## Objective

Audit Steno.com's public UI to extract its design language (fonts, color palette, layout patterns, iconography, tone), then produce a concise style guide document in `packages/web/src/styles/style-guide.md` that governs all front-end work across this and future roadmaps. The style guide feeds directly into TASK-019 (Tailwind config) and subsequent page tasks.

## Approach

Use the Playwright MCP browser tools to navigate Steno.com, screenshot key pages, and extract CSS variables, fonts, and color values from the rendered DOM. Synthesize into a Markdown style guide with concrete tokens (hex values, font stacks, spacing scales, border-radius, shadow levels). Keep it concise — a cheat-sheet, not a design spec.

## Steps

### 1. Capture Steno.com visual references  <!-- agent: general-purpose -->

- [x] Use `mcp__playwright__browser_navigate` to open `https://steno.com` <!-- Completed: 2026-06-24 -->
- [x] Use `mcp__playwright__browser_take_screenshot` on the home page, a feature/product page, and a pricing page if available <!-- Completed: 2026-06-24 -->
- [x] Use `mcp__playwright__browser_evaluate` to extract CSS custom properties: `document.documentElement.style.cssText` and computed styles on key elements (headings, buttons, body) <!-- Completed: 2026-06-24 -->
- [x] Record: primary font family, secondary font (if any), 5–10 key colors, primary button style, card/panel style, spacing rhythm <!-- Completed: 2026-06-24 -->

### 2. Write `packages/web/src/styles/style-guide.md`  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/styles/style-guide.md` with sections: <!-- Completed: 2026-06-24 -->
  - **Colors**: primary, secondary, background, surface, text, muted, accent, error — each as hex
  - **Typography**: font family names, weight scale (400/500/600/700), base size, heading sizes
  - **Spacing**: base unit (px), scale (4px/8px/12px/16px/24px/32px/48px)
  - **Borders**: radius values (sm/md/lg), border color
  - **Shadows**: levels (sm/md/lg)
  - **Tone**: 2–3 sentences on voice/copy style (e.g. professional, concise, legal-neutral)

### 3. Extract Tailwind config tokens  <!-- agent: general-purpose -->

- [x] From the style guide, extract the minimal set of Tailwind theme overrides needed to match the Steno design: <!-- Completed: 2026-06-24 -->
  - `colors` extension (brand palette)
  - `fontFamily` extension
  - `borderRadius` extension if non-standard
- [x] Write these as a commented block at the bottom of `style-guide.md` in `tailwind.config.js` format, ready to paste into TASK-019 <!-- Completed: 2026-06-24 -->
