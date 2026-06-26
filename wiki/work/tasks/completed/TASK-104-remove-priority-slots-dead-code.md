---
id: TASK-104
title: "Remove PRIORITY_SLOTS dead code from GapReportPage"
status: done
created: 2026-06-26
updated: 2026-06-26 <!-- implementation complete -->
depends_on: [TASK-102]
blocks: []
parallel_safe_with: [TASK-098, TASK-099, TASK-100, TASK-101, TASK-103, TASK-105, TASK-106]
uat: "[[UAT-104]]"
tags: [ui, frontend, cleanup]
---

# TASK-104 — Remove PRIORITY_SLOTS dead code from GapReportPage

## Objective

Delete the `PRIORITY_SLOTS` constant and all code paths that reference it from `packages/web/src/pages/GapReportPage.tsx`, since it is an empty set that never causes any visual difference.

## Approach

`const PRIORITY_SLOTS = new Set<string>([]);` on line 6 of GapReportPage.tsx is always empty, making all `isPriority` checks false. Remove the constant, the `isPriority` local variable, and all conditional styling that references it (amber row background, bold font-weight, orange star span). TASK-102 must complete first as it also edits GapReportPage.tsx.

## Steps

### 1. Remove PRIORITY_SLOTS constant and all usages  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/GapReportPage.tsx`
- [x] Delete the line `const PRIORITY_SLOTS = new Set<string>([]);` and its trailing blank line
- [x] Delete `const isPriority = PRIORITY_SLOTS.has(gap.fieldName);` inside the gap map
- [x] Replace the `<tr key={gap.fieldName} className={\`\${isPriority ? 'bg-amber-50' : ''}\`}>` with `<tr key={gap.fieldName}>`
- [x] Replace the priority td `className={\`p-2 border border-gray-300 \${isPriority ? 'font-bold' : ''}\`}` with `className="p-2 border border-gray-300"`
- [x] Remove the `{isPriority && <span className="text-orange-700 ml-1">★</span>}` span entirely
- [x] Verify typecheck passes clean — no references to `isPriority` or `PRIORITY_SLOTS` should remain <!-- Completed: 2026-06-26 -->
