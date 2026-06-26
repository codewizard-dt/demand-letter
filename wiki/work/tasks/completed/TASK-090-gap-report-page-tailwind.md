---
id: TASK-090
title: "Convert GapReportPage inline styles to Tailwind"
status: done
created: 2026-06-26
updated: 2026-06-26
<!-- Updated: 2026-06-26 -->
depends_on: []
blocks: []
parallel_safe_with: [TASK-089, TASK-092, TASK-093, TASK-094, TASK-096, TASK-097]
uat: "[[UAT-090]]"
tags: [ui, tailwind, frontend]
---

# TASK-090 — Convert GapReportPage inline styles to Tailwind

## Objective

Replace all `style={{ }}` props in `packages/web/src/pages/GapReportPage.tsx` with equivalent Tailwind utility classes, eliminating every inline style from this component.

## Approach

Direct class mapping for all style objects in the file. Key items: outer padding, grid layout, table and cell borders, sidebar, block preview panel, citation pill buttons (with active/inactive variants), and loading/error early returns. The `PRIORITY_SLOTS` dead-code constant stays (it has its own task, TASK-098) — this task only removes inline styles.

## Steps

### 1. Convert loading and error early-return divs  <!-- agent: general-purpose -->

- [x] Replace `<div style={{ padding: '2rem' }}>Loading gap report…</div>` with `<div className="p-8">Loading gap report…</div>`
- [x] Replace `<div style={{ padding: '2rem', color: 'red' }}>` with `<div className="p-8 text-red-600">`

### 2. Convert outer wrapper and grid layout  <!-- agent: general-purpose -->

- [x] Replace outer `style={{ padding: '2rem' }}` with `className="p-8"`
- [x] Replace grid div `style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}` with `className="grid gap-8" style={{ gridTemplateColumns: '1fr 360px' }}` (keep CSS grid template columns as style since Tailwind cannot do arbitrary fr values without arbitrary variants; or use `className="grid grid-cols-[1fr_360px] gap-8 items-start"` using Tailwind JIT)
  - Use `className="grid grid-cols-[1fr_360px] gap-8 items-start"` — Tailwind v3 JIT supports arbitrary values
- [x] Replace left-column div `style={{ maxWidth: '900px' }}` with `className="max-w-[900px]"`
- [x] Replace summary paragraph `style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}` with `className="text-lg mb-6"`
- [x] Replace green "All slots satisfied" span `style={{ color: 'green' }}` with `className="text-green-600"`
- [x] Replace mutation error div `style={{ color: 'red', marginBottom: '1rem' }}` with `className="text-red-600 mb-4"`

### 3. Convert gaps table  <!-- agent: general-purpose -->

- [x] Replace table `style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}` with `className="w-full border-collapse mb-6"`
- [x] Replace `<tr style={{ background: '#f0f0f0' }}>` in thead with `className="bg-gray-100"`
- [x] Replace all `<th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ccc' }}>` with `className="p-2 text-left border border-gray-300"`
- [x] Replace th with `textAlign: 'center'` with `className="p-2 text-center border border-gray-300"`
- [x] Replace priority row `<tr ... style={{ background: isPriority ? '#fff8e1' : undefined }}>` with `className={\`\${isPriority ? 'bg-amber-50' : ''}\`}`
- [x] Replace priority td `style={{ padding: '8px', border: '1px solid #ccc', fontWeight: isPriority ? 'bold' : undefined }}` with `className={\`p-2 border border-gray-300 \${isPriority ? 'font-bold' : ''}\`}`
- [x] Replace priority star span `style={{ color: '#e65100', marginLeft: 4 }}` with `className="text-orange-700 ml-1"`
- [x] Replace null-reason td `style={{ padding: '8px', border: '1px solid #ccc', color: '#666' }}` with `className="p-2 border border-gray-300 text-gray-500"`
- [x] Replace fill-value td `style={{ padding: '8px', border: '1px solid #ccc' }}` with `className="p-2 border border-gray-300"`
- [x] Replace fill input `style={{ width: '100%', padding: '4px' }}` with `className="w-full px-1 py-0.5 border rounded"`
- [x] Replace accept-missing td `style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'center' }}` with `className="p-2 border border-gray-300 text-center"`

### 4. Convert submit and generate buttons  <!-- agent: general-purpose -->

- [x] Replace submit button `style={{ marginRight: '1rem', padding: '8px 16px', cursor: ... }}` with `className={\`mr-4 px-4 py-2 \${hasAnyAction && !submitting ? 'cursor-pointer' : 'cursor-not-allowed'}\`}`
- [x] Replace generate button `style={{ padding: '8px 16px', cursor: ... }}` with `className={\`px-4 py-2 \${report.gaps.length === 0 && !generating ? 'cursor-pointer' : 'cursor-not-allowed'}\`}`

### 5. Convert citation sidebar  <!-- agent: general-purpose -->

- [x] Replace sidebar div `style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', height: 'fit-content', maxHeight: '80vh', overflowY: 'auto', background: '#fafafa' }}` with `className="border border-gray-200 rounded-lg p-4 h-fit max-h-[80vh] overflow-y-auto bg-gray-50"`
- [x] Replace sidebar `<h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 600 }}>` with `className="mt-0 text-base font-semibold"`
- [x] Replace "No extracted fields" `<p style={{ color: '#888', fontSize: '0.85rem' }}>` with `className="text-gray-400 text-sm"`
- [x] Replace field entry div `style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}` with `className="mb-3 text-sm"`
- [x] Replace field name div `style={{ fontWeight: 500, color: '#333' }}` with `className="font-medium text-gray-800"`
- [x] Replace em-dash span `style={{ color: '#999' }}` with `className="text-gray-400"`
- [x] Replace pill container div `style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}` with `className="flex flex-wrap gap-1 mt-0.5"`
- [x] Replace citation pill button with conditional styles:
  ```tsx
  className={`px-2 py-0.5 text-xs border rounded cursor-pointer ${
    activeBlockId === bid
      ? 'bg-blue-600 text-white border-blue-300'
      : 'bg-blue-50 text-blue-600 border-blue-200'
  }`}
  ```

### 6. Convert source document preview panel  <!-- agent: general-purpose -->

- [x] Replace preview panel div `style={{ marginTop: '2rem', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', maxHeight: '500px', overflowY: 'auto', background: '#fff' }}` with `className="mt-8 border border-gray-200 rounded-lg p-4 max-h-[500px] overflow-y-auto bg-white"`
- [x] Replace preview `<h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 600 }}>` with `className="mt-0 text-base font-semibold"`
- [x] Replace block div `style={{ padding: '8px 12px', marginBottom: 8, borderRadius: 4, border: activeBlockId === block.id ? '2px solid #2563eb' : '1px solid #e8e8e8', background: activeBlockId === block.id ? '#eff6ff' : '#fafafa', transition: 'border-color 0.15s, background 0.15s' }}` with:
  ```tsx
  className={`px-3 py-2 mb-2 rounded transition-colors duration-150 ${
    activeBlockId === block.id
      ? 'border-2 border-blue-600 bg-blue-50'
      : 'border border-gray-200 bg-gray-50'
  }`}
  ```
- [x] Replace block metadata div `style={{ fontSize: '0.7rem', color: '#999', marginBottom: 4 }}` with `className="text-[11px] text-gray-400 mb-1"`
- [x] Replace block text div `style={{ fontSize: '0.85rem', color: '#222', whiteSpace: 'pre-wrap' }}` with `className="text-sm text-gray-900 whitespace-pre-wrap"`

### 7. Verify no inline styles remain  <!-- agent: general-purpose -->

- [x] Search `GapReportPage.tsx` for any remaining `style=` occurrences and convert them
