---
id: TASK-094
title: "Add jobs list page as home screen"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: []
blocks: []
parallel_safe_with: [TASK-089, TASK-090, TASK-092, TASK-093, TASK-096, TASK-097]
uat: "[[UAT-094]]"
tags: [ui, frontend, navigation]
---

# TASK-094 — Add jobs list page as home screen

## Objective

Create a `JobsListPage` that shows all past jobs with status and a "Resume" link, then make it the home screen (`/` route). The existing `UploadPage` moves to `/upload` while `/` becomes the new jobs dashboard.

## Approach

The API `GET /jobs` endpoint already exists and returns `{ jobs: Array<{ id: string, status: string, createdAt: string }> }` (up to 50, ordered newest-first). Add a `fetchJobs` API function, a `useJobs` hook, create `JobsListPage.tsx`, wire routing in `App.tsx`. The "New Job" CTA on JobsListPage navigates to `/upload`.

Job status values from the DB schema will determine resume link: jobs with status `gap_report_ready` resume at `/jobs/:id/gap-report`, `generate_complete` at `/jobs/:id/editor`, etc. Use a helper to derive the resume path.

## Steps

### 1. Add fetchJobs to api.ts  <!-- agent: general-purpose -->

- [x] Add to `packages/web/src/lib/api.ts`: <!-- Completed: 2026-06-26 -->
  ```ts
  export interface JobSummary {
    id: string;
    status: string;
    createdAt: string;
  }

  export async function fetchJobs(): Promise<JobSummary[]> {
    const res = await fetch(`${API_BASE}/jobs`);
    if (!res.ok) throw new Error(`GET /jobs failed: ${res.status}`);
    const data = await res.json() as { jobs: JobSummary[] };
    return data.jobs;
  }
  ```

### 2. Add jobs query key and useJobs hook  <!-- agent: general-purpose -->

- [x] Add to `packages/web/src/hooks/queryKeys.ts`: <!-- Completed: 2026-06-26 -->
  ```ts
  jobs: () => ['jobs'] as const,
  ```
- [x] Add to `packages/web/src/hooks/useJobQueries.ts`: <!-- Completed: 2026-06-26 -->
  ```ts
  import { fetchJobs } from '../lib/api';
  
  export function useJobs() {
    return useQuery({
      queryKey: queryKeys.jobs(),
      queryFn: fetchJobs,
    });
  }
  ```

### 3. Create JobsListPage component  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/pages/JobsListPage.tsx`: <!-- Completed: 2026-06-26 -->
  ```tsx
  import { Link } from 'react-router-dom';
  import { useJobs } from '../hooks/useJobQueries';

  function resumePath(jobId: string, status: string): string {
    switch (status) {
      case 'gap_report_ready': return `/jobs/${jobId}/gap-report`;
      case 'generate_complete': return `/jobs/${jobId}/editor`;
      case 'generating': return `/jobs/${jobId}/generate`;
      default: return `/jobs/${jobId}/gap-report`;
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  export default function JobsListPage() {
    const jobsQuery = useJobs();
    const jobs = jobsQuery.data ?? [];

    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-4xl text-primary">Jobs</h1>
          <Link
            to="/upload"
            className="px-5 py-2.5 bg-primary text-white rounded-md text-sm hover:bg-primary/90 transition-colors"
          >
            New Job
          </Link>
        </div>

        {jobsQuery.isLoading && <p className="text-text-muted">Loading jobs…</p>}
        {jobsQuery.isError && <p className="text-red-600">Failed to load jobs.</p>}

        {!jobsQuery.isLoading && jobs.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            <p className="mb-4">No jobs yet.</p>
            <Link to="/upload" className="text-primary underline">Create your first job</Link>
          </div>
        )}

        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id} className="border border-border rounded-md p-4 flex items-center justify-between bg-surface">
              <div>
                <p className="font-medium text-primary text-sm">{job.id}</p>
                <p className="text-xs text-text-muted mt-0.5">{formatDate(job.createdAt)} · {job.status.replace(/_/g, ' ')}</p>
              </div>
              <Link
                to={resumePath(job.id, job.status)}
                className="text-sm text-primary underline hover:text-primary/80"
              >
                Resume →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  ```

### 4. Update App.tsx routing  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/App.tsx` <!-- Completed: 2026-06-26 -->
- [x] Import `JobsListPage` from `'./pages/JobsListPage'` <!-- Completed: 2026-06-26 -->
- [x] Change `<Route path="/" element={<UploadPage />} />` to `<Route path="/" element={<JobsListPage />} />` <!-- Completed: 2026-06-26 -->
- [x] Add `<Route path="/upload" element={<UploadPage />} />` below the `/` route <!-- Completed: 2026-06-26 -->
- [x] Verify all existing routes remain intact <!-- Completed: 2026-06-26 -->
