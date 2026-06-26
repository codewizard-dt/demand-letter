---
id: TASK-101
title: "Replace raw error strings with actionable error states"
status: in-progress
created: 2026-06-26
updated: 2026-06-26
depends_on: [TASK-089, TASK-090, TASK-097]
blocks: []
parallel_safe_with: [TASK-098, TASK-099, TASK-100, TASK-104, TASK-105, TASK-106]
uat: "[[UAT-101]]"
tags: [ui, frontend, ux, errors]
---

# TASK-101 — Replace raw error strings with actionable error states

## Objective

Replace bare error message strings (`<p className="text-red-600">{error}</p>`) across workflow pages with a consistent error card that includes a retry button and a "Go Home" CTA so attorneys are never left stranded on a broken page.

## Approach

Create a reusable `ErrorCard` component with a message, optional retry callback, and a home link. Apply it to pages that currently show raw error strings: GeneratePage, GapReportPage (mutation errors already styled — apply to critical load errors), AnnotatePage. Depends on TASK-089/090/097 (those tasks already edited these pages — this task runs after them).

## Steps

### 1. Create ErrorCard component  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/components/ErrorCard.tsx`: <!-- Completed: 2026-06-26 -->
  ```tsx
  import { Link } from 'react-router-dom';

  interface Props {
    message: string;
    onRetry?: () => void;
  }

  export default function ErrorCard({ message, onRetry }: Props) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 border border-red-200 rounded-lg bg-red-50 text-center">
        <p className="text-sm font-medium text-red-700 mb-4">{message}</p>
        <div className="flex justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try again
            </button>
          )}
          <Link
            to="/"
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-primary"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }
  ```

### 2. Apply ErrorCard to GeneratePage load errors  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/GeneratePage.tsx` <!-- Completed: 2026-06-26 -->
- [x] Import `ErrorCard` from `'../components/ErrorCard'` <!-- Completed: 2026-06-26 -->
- [x] Replace inline `{error && <p className="mt-4 text-red-600">{error}</p>}` with: <!-- Completed: 2026-06-26 -->
  ```tsx
  {error && <ErrorCard message={error} onRetry={handleGenerate} />}
  ```

### 3. Apply ErrorCard to AnnotatePage error early-return  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/AnnotatePage.tsx` <!-- Completed: 2026-06-26 -->
- [x] Import `ErrorCard` <!-- Completed: 2026-06-26 -->
- [x] Replace `if (error) return <div className="p-8 text-red-600">Error: {error}</div>;` with: <!-- Completed: 2026-06-26 -->
  ```tsx
  if (error) return <ErrorCard message={`Error: ${error}`} />;
  ```

### 4. Apply ErrorCard to GapReportPage error early-return  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/GapReportPage.tsx` <!-- Completed: 2026-06-26 -->
- [x] Import `ErrorCard` <!-- Completed: 2026-06-26 -->
- [x] Replace `if (gapReportQuery.isError) return <div className="p-8 text-red-600">Error: {gapReportQuery.error.message}</div>;` with: <!-- Completed: 2026-06-26 -->
  ```tsx
  if (gapReportQuery.isError) return <ErrorCard message={`Error: ${gapReportQuery.error.message}`} onRetry={() => gapReportQuery.refetch()} />;
  ```
- [x] Verify typecheck passes clean <!-- Completed: 2026-06-26 -->
