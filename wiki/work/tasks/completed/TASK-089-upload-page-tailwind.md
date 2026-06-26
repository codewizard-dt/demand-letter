---
id: TASK-089
title: "Convert UploadPage inline styles to Tailwind"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: []
blocks: []
parallel_safe_with: [TASK-090, TASK-091, TASK-092, TASK-093]
uat: "[[UAT-089]]"
tags: [ui, tailwind, frontend]
---

# TASK-089 — Convert UploadPage inline styles to Tailwind

## Objective

Replace all `style={{ }}` props in `packages/web/src/pages/UploadPage.tsx` with equivalent Tailwind utility classes, eliminating all inline styles from this component.

## Approach

Direct class mapping: each inline style object maps 1-to-1 to Tailwind utilities. The file has 7 style objects across the outer wrapper, error alert, two form-group divs, two labels, and the submit button. The button has conditional opacity/cursor logic that becomes a conditional className string.

## Steps

### 1. Convert inline styles to Tailwind classes  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/UploadPage.tsx`
- [x] Replace outer wrapper `style={{ maxWidth: 480, margin: '48px auto', padding: '0 16px' }}` with `className="max-w-[480px] mx-auto mt-12 px-4"`
- [x] Replace error div `style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}` with `className="bg-red-100 border border-red-400 text-red-700 rounded-md px-4 py-3 mb-4"`
- [x] Replace template group div `style={{ marginBottom: 20 }}` with `className="mb-5"`
- [x] Replace template label `style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}` with `className="block mb-1.5 font-semibold"`
- [x] Replace caseDocs group div `style={{ marginBottom: 24 }}` with `className="mb-6"`
- [x] Replace caseDocs label `style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}` with `className="block mb-1.5 font-semibold"`
- [x] Replace button `style={{ padding: '10px 24px', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}` with `className={\`px-6 py-2.5 text-base \${loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}\`}`
- [x] Verify no `style=` props remain in the file <!-- Completed: 2026-06-26 -->
