---
id: TASK-103
title: "Make zone text expandable on AnnotatePage"
status: done
created: 2026-06-26
updated: 2026-06-26 <!-- tackle completed -->
depends_on: []
blocks: []
parallel_safe_with: [TASK-098, TASK-099, TASK-100, TASK-101, TASK-102, TASK-104, TASK-105, TASK-106]
uat: "[[UAT-103]]"
tags: [ui, frontend, annotate]
---

# TASK-103 — Make zone text expandable on AnnotatePage

## Objective

Remove the `truncate` class from zone text in `AnnotatePage.tsx` and replace it with a click-to-expand pattern so attorneys can read the full zone content without truncation.

## Approach

Currently `packages/web/src/pages/AnnotatePage.tsx` renders each zone's text with `className="font-mono text-sm mb-3 truncate"`. Replace truncation with a toggle: add a per-zone `expanded` map in state, show the full text when expanded, and show a "Show more" / "Show less" link at line 70. A single `expandedZones` Record<string, boolean> keyed by `zone.id` suffices.

## Steps

### 1. Replace truncate with expand/collapse toggle  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/AnnotatePage.tsx`
- [x] Add `const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});`
- [x] Replace the `<p className="font-mono text-sm mb-3 truncate">{zone.textContent}</p>` with:
  ```tsx
  <div className="mb-3">
    <p className={`font-mono text-sm ${expandedZones[zone.id] ? '' : 'line-clamp-2'}`}>
      {zone.textContent}
    </p>
    {zone.textContent.length > 80 && (
      <button
        type="button"
        onClick={() => setExpandedZones(prev => ({ ...prev, [zone.id]: !prev[zone.id] }))}
        className="text-xs text-primary-gold hover:underline mt-0.5"
      >
        {expandedZones[zone.id] ? 'Show less' : 'Show more'}
      </button>
    )}
  </div>
  ```
- [x] Verify Tailwind's `line-clamp-2` works (it requires `@tailwindcss/line-clamp` plugin or Tailwind v3.3+ core). If not available, use `overflow-hidden max-h-10` as fallback instead of `line-clamp-2`.
- [x] Verify typecheck passes clean <!-- Completed: 2026-06-26 -->
