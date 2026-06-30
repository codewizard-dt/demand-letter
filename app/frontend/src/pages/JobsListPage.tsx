import { Link } from 'react-router-dom';
import { useJobs } from '../hooks/useJobQueries';
import { formatDate } from '../lib/format';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { JobFile } from '../lib/api';

function resumePath(jobId: string, status: string): string {
  switch (status) {
    case 'gap_report_ready': return `/jobs/${jobId}/gap-report`;
    case 'generate_complete': return `/jobs/${jobId}/editor`;
    case 'generating': return `/jobs/${jobId}/generate`;
    default: return `/jobs/${jobId}/gap-report`;
  }
}

function stripExt(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

function fileTypeBadge(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('wordprocessingml') || mimeType.includes('docx')) return 'DOCX';
  return 'FILE';
}

export default function JobsListPage() {
  useDocumentTitle('Demand Letters — Steno');
  const jobsQuery = useJobs();
  const jobs = jobsQuery.data ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-4xl text-primary">Demand Letters</h1>
        <Link
          to="/upload"
          className="px-5 py-2.5 bg-primary text-white rounded-md text-sm hover:bg-primary/90 transition-colors"
        >
          New Demand Letter
        </Link>
      </div>

      {jobsQuery.isLoading && <p className="text-text-muted">Loading…</p>}
      {jobsQuery.isError && <p className="text-red-600">Failed to load demand letters.</p>}

      {!jobsQuery.isLoading && jobs.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <p className="mb-4">No demand letters yet.</p>
          <Link to="/upload" className="text-primary underline">Create your first demand letter</Link>
        </div>
      )}

      <ul className="space-y-3">
        {jobs.map((job) => {
          const caseDoc = job.files.find((f: JobFile) => f.role === 'case_doc');
          const title = caseDoc ? stripExt(caseDoc.fileName) : 'Untitled Demand Letter';
          const badge = caseDoc ? fileTypeBadge(caseDoc.mimeType) : null;
          const statusLabel = job.status.replace(/_/g, ' ');

          return (
            <li key={job.id} className="border border-border rounded-md p-4 flex items-center justify-between bg-surface gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {badge && (
                    <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded bg-gray-100 text-gray-500 border border-gray-200">
                      {badge}
                    </span>
                  )}
                  <p className="font-medium text-primary text-sm truncate">{title}</p>
                </div>
                <p className="text-xs text-text-muted mt-0.5 capitalize">{formatDate(job.createdAt)} · {statusLabel}</p>
              </div>
              <Link
                to={resumePath(job.id, job.status)}
                className="shrink-0 text-sm text-primary underline hover:text-primary/80"
              >
                Resume →
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}