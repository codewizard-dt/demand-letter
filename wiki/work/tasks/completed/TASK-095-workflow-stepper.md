---
id: TASK-095
title: "Add workflow stepper component to all 5 stages"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: [TASK-089, TASK-090, TASK-094]
blocks: []
parallel_safe_with: [TASK-091, TASK-092, TASK-093, TASK-096, TASK-097]
uat: "[[UAT-095]]"
tags: [ui, frontend, navigation]
---

# TASK-095 — Add workflow stepper component to all 5 stages

## Objective

Create a `WorkflowStepper` component that shows the 5-stage demand-letter workflow with the current step highlighted, then embed it in each of the 5 workflow pages so attorneys always know where they are in the process.

## Approach

The 5 stages are: Upload → Gap Report → Generate → Editor → Done. Each workflow page renders the stepper at the top with the active step index passed in. The component is purely presentational — no state, just props. Depends on TASK-089 and TASK-090 completing (to avoid file conflicts) and TASK-094 (Upload now lives at `/upload`, which is step 1).

## Steps

### 1. Create WorkflowStepper component  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/components/WorkflowStepper.tsx`: <!-- Completed: 2026-06-26 -->
  ```tsx
  const STEPS = ['Upload', 'Gap Report', 'Generate', 'Editor', 'Done'];

  interface Props {
    currentStep: number; // 0-indexed
  }

  export default function WorkflowStepper({ currentStep }: Props) {
    return (
      <nav aria-label="Workflow progress" className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={label} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                active ? 'bg-primary text-white' : done ? 'text-primary' : 'text-text-muted'
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${
                  active ? 'bg-white text-primary border-white' : done ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-400'
                }`}>
                  {done ? '✓' : i + 1}
                </span>
                {label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px ${i < currentStep ? 'bg-primary' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </nav>
    );
  }
  ```

### 2. Add stepper to UploadPage (step 0)  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/UploadPage.tsx` <!-- Completed: 2026-06-26 -->
- [x] Import `WorkflowStepper` from `'../components/WorkflowStepper'` <!-- Completed: 2026-06-26 -->
- [x] Add `<WorkflowStepper currentStep={0} />` as the first child inside the outer wrapper div <!-- Completed: 2026-06-26 -->

### 3. Add stepper to GapReportPage (step 1)  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/GapReportPage.tsx` <!-- Completed: 2026-06-26 -->
- [x] Import `WorkflowStepper` and add `<WorkflowStepper currentStep={1} />` before the main grid div <!-- Completed: 2026-06-26 -->

### 4. Add stepper to GeneratePage (step 2)  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/GeneratePage.tsx` <!-- Completed: 2026-06-26 -->
- [x] Import `WorkflowStepper` and add `<WorkflowStepper currentStep={2} />` at the top of the returned JSX <!-- Completed: 2026-06-26 -->

### 5. Add stepper to EditorPage (step 3)  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/EditorPage.tsx` <!-- Completed: 2026-06-26 -->
- [x] Import `WorkflowStepper` and add `<WorkflowStepper currentStep={3} />` at the top of the returned JSX <!-- Completed: 2026-06-26 -->
