---
id: UAT-018
title: "UAT: Steno.com Style Audit and Generalized Style Guide"
status: passed
task: TASK-018
created: 2026-06-24
updated: 2026-06-24
---

# UAT-018 — UAT: Steno.com Style Audit and Generalized Style Guide

implements::[[TASK-018]]

> **Source task**: [[TASK-018]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] Repository is checked out and `packages/web/src/styles/style-guide.md` exists on disk
- [ ] No other task has modified `packages/web/src/styles/` since TASK-018 completed

---

## Test Cases

### UAT-DOC-001: Style guide file exists at the correct path

- **File**: `packages/web/src/styles/style-guide.md`
- **Description**: Verifies the style guide was created at the exact path the task specifies and is non-empty.
- **Steps**:
  1. Open `packages/web/src/styles/style-guide.md` in any editor or file viewer.
  2. Confirm the file exists and has content.
- **Expected Result**: File exists at `packages/web/src/styles/style-guide.md` and is non-empty.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-DOC-002: Colors section is present with all required tokens

- **File**: `packages/web/src/styles/style-guide.md`
- **Description**: Verifies the `## Colors` section exists and defines each of the eight required semantic tokens: primary, secondary, background, surface, text, muted, accent, error — each with a hex value.
- **Steps**:
  1. Open `packages/web/src/styles/style-guide.md`.
  2. Locate the `## Colors` section.
  3. Confirm each of the following tokens appears with a `#`-prefixed hex value:
     - `primary` — `#193D3D`
     - `primary-gold` (or a `gold` sub-token of primary) — `#A18050`
     - `secondary` — `#346E4A`
     - `bg` — `#F0F1E8`
     - `surface` — `#F9FFFA`
     - `text` or body text color — `#193D3D`
     - `text-muted` — `#696969`
     - `accent` — `#ABDFD4`
     - `error` — `#B5006A`
     - `border` — `#E8E5DC`
- **Expected Result**: All ten tokens listed above are present with the correct hex values.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-DOC-003: Typography section covers font families, weight scale, and heading sizes

- **File**: `packages/web/src/styles/style-guide.md`
- **Description**: Verifies the `## Typography` section documents font stacks, weight scale, base type settings, and the H1–H4 heading scale.
- **Steps**:
  1. Open `packages/web/src/styles/style-guide.md`.
  2. Locate the `## Typography` section.
  3. Confirm the body font stack contains `Inter` as first choice and a generic `sans-serif` fallback.
  4. Confirm the heading/display font stack contains `Playfair Display` as first choice and a generic `serif` fallback.
  5. Confirm the weight scale lists at least weights 400, 500, and 700 (or equivalent named tokens `font-normal`, `font-medium`, `font-bold`).
  6. Confirm the heading scale lists H1, H2, H3, H4 with their font sizes:
     - H1: `55px`
     - H2: `48px`
     - H3: `38px`
     - H4: `28px`
  7. Confirm base body size is `16px` and base line-height is `1.6` (or `25.6px`).
- **Expected Result**: All font stacks, weight tokens, body base specs, and H1–H4 sizes are present and match the values above.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-DOC-004: Spacing section defines a 4px-base scale

- **File**: `packages/web/src/styles/style-guide.md`
- **Description**: Verifies the `## Spacing` section documents a 4px base unit and a named scale including at least 4 / 8 / 12 / 16 / 24 / 32 / 48 px steps.
- **Steps**:
  1. Open `packages/web/src/styles/style-guide.md`.
  2. Locate the `## Spacing` section.
  3. Confirm the base unit is stated as `4px`.
  4. Confirm the following values appear in the spacing scale: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`.
- **Expected Result**: Base unit is 4px and all seven scale steps are present.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-DOC-005: Borders section documents radius tokens and border color

- **File**: `packages/web/src/styles/style-guide.md`
- **Description**: Verifies the `## Borders` section documents at least three radius levels (sm/md/lg) and a border color token.
- **Steps**:
  1. Open `packages/web/src/styles/style-guide.md`.
  2. Locate the `## Borders` section.
  3. Confirm these radius values are present:
     - `radius-sm`: `2px`
     - `radius-md`: `10px`
     - `radius-lg`: `50px` (pill)
  4. Confirm the border color `#E8E5DC` is documented.
- **Expected Result**: All three radius tokens and the border color are present with the correct values.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-DOC-006: Shadows section documents three tinted shadow levels

- **File**: `packages/web/src/styles/style-guide.md`
- **Description**: Verifies the `## Shadows` section documents sm/md/lg levels all using `rgba(25, 61, 61, ...)` (the brand teal tint).
- **Steps**:
  1. Open `packages/web/src/styles/style-guide.md`.
  2. Locate the `## Shadows` section.
  3. Confirm `shadow-sm`, `shadow-md`, and `shadow-lg` are each defined.
  4. Confirm each value contains `rgba(25, 61, 61,` as the shadow color component.
  5. Confirm the three offsets/blurs are distinct (sm is the lightest, lg is the heaviest).
- **Expected Result**: Three shadow levels are present, all using the `#193D3D` tint (`rgba(25, 61, 61, ...)`), and each is visually distinct by opacity and blur.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-DOC-007: Tone section provides voice guidance

- **File**: `packages/web/src/styles/style-guide.md`
- **Description**: Verifies the `## Tone` section exists and contains 2–3 sentences describing the copy voice and style.
- **Steps**:
  1. Open `packages/web/src/styles/style-guide.md`.
  2. Locate the `## Tone` section.
  3. Confirm it contains at least 2 sentences of prose guidance (not just a list of keywords).
  4. Confirm the guidance conveys a professional, direct, legal-tech-appropriate tone.
- **Expected Result**: A prose tone description of 2–3 sentences is present describing the brand voice as professional and direct.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-DOC-008: Tailwind theme override block is present and well-formed

- **File**: `packages/web/src/styles/style-guide.md`
- **Description**: Verifies the `## Tailwind Theme Overrides` section exists at the bottom of the file and contains a valid `tailwind.config.js` snippet covering the four required extensions: `colors`, `fontFamily`, `borderRadius`, `boxShadow`.
- **Steps**:
  1. Open `packages/web/src/styles/style-guide.md`.
  2. Locate the `## Tailwind Theme Overrides` section (should be at or near the bottom).
  3. Confirm a fenced `js` code block is present.
  4. Inside the block, confirm `theme.extend` (or equivalent) contains:
     - `colors:` block with at least `primary`, `secondary`, `bg`, `surface`, `border`, `accent`, `error`, `text-muted` keys
     - `fontFamily:` block with `sans:` and `serif:` arrays
     - `borderRadius:` block with `sm`, `md`, `lg`, `circle` keys
     - `boxShadow:` block with `sm`, `md`, `lg` keys
  5. Confirm the snippet is syntactically well-formed JavaScript (matching braces, no obvious typos in key names).
  6. Confirm the `colors` hex values in the snippet match those in the `## Colors` section above.
- **Expected Result**: The Tailwind override block is present, covers all four extensions, and its color values are consistent with the `## Colors` table.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-DOC-009: Color hex values in Tailwind block are consistent with Colors table

- **File**: `packages/web/src/styles/style-guide.md`
- **Description**: Cross-checks that every hex value in the `## Tailwind Theme Overrides` `colors:` block matches the value in the `## Colors` table — no copy-paste drift.
- **Steps**:
  1. Open `packages/web/src/styles/style-guide.md`.
  2. For each of the following tokens, read the hex from the `## Colors` table and compare to the value in the Tailwind `colors:` block:
     - `primary.DEFAULT` → `#193D3D`
     - `primary.gold` → `#A18050`
     - `secondary.DEFAULT` → `#346E4A`
     - `bg` → `#F0F1E8`
     - `surface` → `#F9FFFA`
     - `border` → `#E8E5DC`
     - `accent` → `#ABDFD4`
     - `error` → `#B5006A`
     - `text-muted` → `#696969`
  3. Confirm no token has a different hex value in the two sections.
- **Expected Result**: All nine token hex values match exactly between the Colors table and the Tailwind override block. Zero discrepancies.
- [x] Pass <!-- 2026-06-24 -->
