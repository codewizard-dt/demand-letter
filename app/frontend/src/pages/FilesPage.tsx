import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchFiles } from '../lib/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDate } from '../lib/format';

function fileTypeBadge(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('wordprocessingml') || mimeType.includes('docx')) return 'DOCX';
  return 'FILE';
}

function roleBadge(role: string): { label: string; className: string } {
  return role === 'template'
    ? { label: 'Template', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
    : { label: 'Case Doc', className: 'bg-amber-50 text-amber-700 border-amber-200' };
}

export default function FilesPage() {
  useDocumentTitle('Documents — Steno');
  const query = useQuery({
    queryKey: ['files'],
    queryFn: fetchFiles,
    staleTime: 30_000,
  });
  const files = query.data ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl text-primary mb-8">Documents</h1>

      {query.isLoading && <p className="text-text-muted">Loading…</p>}
      {query.isError && <p className="text-red-600">Failed to load documents.</p>}

      {!query.isLoading && files.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <p className="mb-4">No documents uploaded yet.</p>
          <Link to="/upload" className="text-primary underline">Upload your first document</Link>
        </div>
      )}

      {files.length > 0 && (
        <ul className="divide-y divide-border border border-border rounded-md bg-surface overflow-hidden">
          {files.map((file, i) => {
            const badge = fileTypeBadge(file.mimeType);
            const role = roleBadge(file.role);
            return (
              <li key={`${file.jobId}-${i}`} className="flex items-center gap-4 px-4 py-3">
                <span className="shrink-0 w-12 text-center px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded bg-gray-100 text-gray-500 border border-gray-200">
                  {badge}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary truncate">{file.fileName}</p>
                  <p className="text-xs text-text-muted mt-0.5">{formatDate(file.createdAt)}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded border ${role.className}`}>
                  {role.label}
                </span>
                <Link
                  to={`/jobs/${file.jobId}/generate`}
                  className="shrink-0 text-xs text-primary underline hover:text-primary/80"
                >
                  View →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
