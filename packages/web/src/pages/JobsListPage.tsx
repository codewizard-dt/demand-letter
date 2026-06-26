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
