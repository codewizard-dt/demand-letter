---
id: TASK-022
title: "Download Button for Generation Output"
status: done
created: 2026-06-23
updated: 2026-06-24
depends_on: [TASK-016, TASK-019]
blocks: []
parallel_safe_with: [TASK-020, TASK-021]
uat: "[[UAT-022]]"
tags: [frontend, download, output, phase-4]
---

# TASK-022 — Download Button for Generation Output

## Objective

Implement the download flow in `packages/web/src/pages/GeneratePage.tsx` (added in TASK-021): when the user clicks "Download", call `GET /jobs/:id/output`, receive the plain-text demand letter, and trigger a browser file download saving it as `demand-letter-<id>.txt`. If the job is still processing, show a loading message and poll until done.

## Approach

Use a Blob + object URL approach for the download trigger (no server-side redirect needed). If the API returns 202 (still processing), show a spinner and retry after 2 seconds. On 200, create a Blob from the response text, create an object URL, and programmatically click a hidden `<a>` tag.

## Steps

### 1. Add `downloadOutput` helper to `packages/web/src/lib/api.ts`  <!-- agent: general-purpose -->

- [x] Add: <!-- Completed: 2026-06-24 -->
  ```typescript
  export async function downloadOutput(jobId: string): Promise<Blob | null> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/output`);
    if (res.status === 202) return null; // still processing
    if (!res.ok) throw new Error(`GET /jobs/${jobId}/output failed: ${res.status}`);
    return res.blob();
  }
  ```

### 2. Add download handler to `GeneratePage.tsx`  <!-- agent: general-purpose -->

- [x] Add `isDownloading: boolean` state <!-- Completed: 2026-06-24 -->
- [x] Add `handleDownload` async function: <!-- Completed: 2026-06-24 -->
  ```typescript
  async function handleDownload() {
    setIsDownloading(true);
    try {
      let blob: Blob | null = null;
      while (!blob) {
        blob = await downloadOutput(id!);
        if (!blob) await new Promise(r => setTimeout(r, 2000));
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `demand-letter-${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }
  ```
- [x] Wire it to the "Download" button shown after generation completes: <!-- Completed: 2026-06-24 -->
  ```tsx
  <button onClick={handleDownload} disabled={isDownloading}>
    {isDownloading ? 'Preparing download…' : 'Download Demand Letter'}
  </button>
  ```

### 3. TypeScript check  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` — must pass with zero errors <!-- Completed: 2026-06-24 -->
