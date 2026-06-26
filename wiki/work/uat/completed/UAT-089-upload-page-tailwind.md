---
id: UAT-089
title: "UAT: Convert UploadPage inline styles to Tailwind"
status: passed
task: TASK-089
created: 2026-06-26
updated: 2026-06-26
---

# UAT-089 — UAT: Convert UploadPage inline styles to Tailwind

implements::[[TASK-089]]

> **Source task**: [[TASK-089]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Web dev server running: `pnpm --filter web dev` (serves at `http://localhost:5173`)
- [ ] Browser open and pointed at `http://localhost:5173/upload`

---

## Test Cases

### UAT-UI-001: No inline style attributes remain on the page

- **Page**: `http://localhost:5173/upload`
- **Description**: Verifies that no element on the UploadPage carries a `style` attribute — all styling must be via Tailwind className.
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Open browser DevTools → Elements panel
  3. Use `Ctrl+F` / `Cmd+F` in the Elements panel to search for `style=`
  4. Alternatively run in the DevTools Console: `document.querySelectorAll('[style]').length`
- **Expected Result**: Zero elements match `[style]` — `document.querySelectorAll('[style]').length` returns `0`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-002: Container div has correct Tailwind classes

- **Page**: `http://localhost:5173/upload`
- **Description**: Verifies the outermost wrapper `<div>` carries the classes `max-w-[480px] mx-auto mt-12 px-4` (replaces `style={{ maxWidth: 480, margin: '48px auto', padding: '0 16px' }}`).
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. In DevTools Console run:
     ```js
     const el = document.querySelector('div.max-w-\\[480px\\]');
     [el?.classList.contains('mx-auto'), el?.classList.contains('mt-12'), el?.classList.contains('px-4'), !el?.hasAttribute('style')]
     ```
  3. Observe the returned array
- **Expected Result**: `[true, true, true, true]` — all four checks pass
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-003: Template section div has correct Tailwind class

- **Page**: `http://localhost:5173/upload`
- **Description**: Verifies the form-group `<div>` wrapping the template input carries `mb-5` (replaces `style={{ marginBottom: 20 }}`).
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. In DevTools Console run:
     ```js
     const label = document.querySelector('label[for="template"]');
     const div = label?.closest('div.mb-5');
     [!!div, !div?.hasAttribute('style')]
     ```
  3. Observe the returned array
- **Expected Result**: `[true, true]` — div exists with `mb-5` class and no inline style
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-004: Template label has correct Tailwind classes

- **Page**: `http://localhost:5173/upload`
- **Description**: Verifies the template `<label>` carries `block mb-1.5 font-semibold` (replaces `style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}`).
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. In DevTools Console run:
     ```js
     const lbl = document.querySelector('label[for="template"]');
     [lbl?.classList.contains('block'), lbl?.classList.contains('mb-1.5'), lbl?.classList.contains('font-semibold'), !lbl?.hasAttribute('style')]
     ```
  3. Observe the returned array
- **Expected Result**: `[true, true, true, true]`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-005: Case documents section div has correct Tailwind class

- **Page**: `http://localhost:5173/upload`
- **Description**: Verifies the form-group `<div>` wrapping the case documents input carries `mb-6` (replaces `style={{ marginBottom: 24 }}`).
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. In DevTools Console run:
     ```js
     const label = document.querySelector('label[for="caseDocs"]');
     const div = label?.closest('div.mb-6');
     [!!div, !div?.hasAttribute('style')]
     ```
  3. Observe the returned array
- **Expected Result**: `[true, true]` — div exists with `mb-6` class and no inline style
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-006: Case documents label has correct Tailwind classes

- **Page**: `http://localhost:5173/upload`
- **Description**: Verifies the caseDocs `<label>` carries `block mb-1.5 font-semibold` (replaces `style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}`).
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. In DevTools Console run:
     ```js
     const lbl = document.querySelector('label[for="caseDocs"]');
     [lbl?.classList.contains('block'), lbl?.classList.contains('mb-1.5'), lbl?.classList.contains('font-semibold'), !lbl?.hasAttribute('style')]
     ```
  3. Observe the returned array
- **Expected Result**: `[true, true, true, true]`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-007: Submit button has correct idle Tailwind classes

- **Page**: `http://localhost:5173/upload`
- **Description**: Verifies the submit button carries `px-6 py-2.5 text-base cursor-pointer` in its idle (non-loading) state and has no inline style attribute (replaces `style={{ padding: '10px 24px', fontSize: 16, cursor: 'pointer', opacity: 1 }}`).
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Do NOT select any files (keep the form empty so loading is false)
  3. In DevTools Console run:
     ```js
     const btn = document.querySelector('button[type="submit"]');
     [btn?.classList.contains('px-6'), btn?.classList.contains('py-2.5'), btn?.classList.contains('text-base'), btn?.classList.contains('cursor-pointer'), !btn?.classList.contains('cursor-not-allowed'), !btn?.classList.contains('opacity-60'), !btn?.hasAttribute('style')]
     ```
  4. Observe the returned array
- **Expected Result**: `[true, true, true, true, true, true, true]` — all seven checks pass
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-EDGE-001: Error div appears with correct Tailwind classes on upload failure

- **Page**: `http://localhost:5173/upload`
- **Description**: Verifies the conditional error `<div>` uses `bg-red-100 border border-red-400 text-red-700 rounded-md px-4 py-3 mb-4` when shown (replaces `style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}`). Trigger by submitting the form while the API is unreachable.
- **Steps**:
  1. Stop any running API server (or confirm it is not running on port 3000)
  2. Navigate to `http://localhost:5173/upload`
  3. Select any `.docx` file for the template input
  4. Select any `.pdf` file for the case documents input
  5. Click "Upload & Continue"
  6. Wait for the error banner to appear
  7. In DevTools Console run:
     ```js
     const err = document.querySelector('.bg-red-100');
     [!!err, err?.classList.contains('border'), err?.classList.contains('border-red-400'), err?.classList.contains('text-red-700'), err?.classList.contains('rounded-md'), err?.classList.contains('px-4'), err?.classList.contains('py-3'), err?.classList.contains('mb-4'), !err?.hasAttribute('style')]
     ```
  8. Observe the returned array
- **Expected Result**: `[true, true, true, true, true, true, true, true, true]` — error div exists with all nine Tailwind classes and no inline style
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-EDGE-002: Submit button shows loading Tailwind classes during upload

- **Page**: `http://localhost:5173/upload`
- **Description**: Verifies the submit button switches to `cursor-not-allowed opacity-60` (and loses `cursor-pointer`) while `loading` is true — replaces the conditional `style={{ cursor: 'not-allowed', opacity: 0.6 }}`.
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Select a `.docx` file for the template input
  3. Select a `.pdf` file for the case documents input
  4. Click "Upload & Continue" and immediately (before the request resolves or errors) run in DevTools Console:
     ```js
     const btn = document.querySelector('button[type="submit"]');
     [btn?.classList.contains('cursor-not-allowed'), btn?.classList.contains('opacity-60'), !btn?.classList.contains('cursor-pointer'), btn?.textContent?.trim()]
     ```
  5. Observe the returned array
- **Expected Result**: `[true, true, true, "Uploading..."]` — button shows loading state with correct classes and label
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->
