import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useJobFiles, useJobLogs } from '../hooks/useJobQueries';
import type { FileRow, JobLogRow } from '../lib/api';
import WorkflowStepper from '../components/WorkflowStepper';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function LevelBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    error: 'bg-red-100 text-red-700 border-red-300',
    warn: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    info: 'bg-gray-100 text-gray-600 border-gray-300',
  };
  const cls = colors[level] ?? colors.info;
  return (
    <span className={`inline-block px-1.5 py-0.5 text-xs border rounded font-mono ${cls}`}>
      {level}
    </span>
  );
}

function FilesTable({ files }: { files: FileRow[] }) {
  if (files.length === 0) {
    return <p className="text-gray-400 text-sm">No files uploaded yet.</p>;
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 text-left border border-gray-300">File Name</th>
          <th className="p-2 text-left border border-gray-300">Type</th>
          <th className="p-2 text-left border border-gray-300">MIME</th>
          <th className="p-2 text-left border border-gray-300">Uploaded</th>
        </tr>
      </thead>
      <tbody>
        {files.map((f) => (
          <tr key={f.id} className="hover:bg-gray-50">
            <td className="p-2 border border-gray-300 font-mono text-xs">{f.fileName}</td>
            <td className="p-2 border border-gray-300">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                f.role === 'template'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {f.role === 'template' ? 'Template' : 'Case Doc'}
              </span>
            </td>
            <td className="p-2 border border-gray-300 text-gray-500 text-xs">{f.mimeType}</td>
            <td className="p-2 border border-gray-300 text-gray-500">{formatDate(f.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LogEntry({ entry }: { entry: JobLogRow }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-200 rounded p-3 mb-2 bg-white">
      <div className="flex items-start gap-2 text-sm">
        <LevelBadge level={entry.level} />
        <span className="text-gray-500 text-xs font-mono">{entry.handler}</span>
        <span className="flex-1 text-gray-800">{entry.message}</span>
        <span className="text-gray-400 text-xs whitespace-nowrap">{formatDate(entry.createdAt)}</span>
      </div>
      {entry.stack && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-blue-600 underline cursor-pointer"
          >
            {expanded ? 'Hide stack trace' : 'Show stack trace'}
          </button>
          {expanded && (
            <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre-wrap text-gray-700">
              {entry.stack}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  useDocumentTitle('Documents — Steno');
  const { id: jobId } = useParams<{ id: string }>();

  const filesQuery = useJobFiles(jobId);
  const logsQuery = useJobLogs(jobId);

  const files = filesQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const hasErrors = logs.some((l) => l.level === 'error' || l.level === 'warn');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <WorkflowStepper currentStep={0} jobId={jobId} />

      <div className="mb-6">
        <Link to={`/jobs/${jobId}/gap-report`} className="text-blue-600 underline text-sm">
          ← Back to Gap Report
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-8">Documents</h1>

      {/* Uploaded Files section */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Uploaded Files</h2>
        {filesQuery.isLoading && <p className="text-gray-400 text-sm">Loading files…</p>}
        {filesQuery.isError && (
          <p className="text-red-600 text-sm">Failed to load files: {filesQuery.error.message}</p>
        )}
        {filesQuery.isSuccess && <FilesTable files={files} />}
      </section>

      {/* Job Log section */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Job Log</h2>
        {logsQuery.isLoading && <p className="text-gray-400 text-sm">Loading logs…</p>}
        {logsQuery.isError && (
          <p className="text-red-600 text-sm">Failed to load logs: {logsQuery.error.message}</p>
        )}
        {logsQuery.isSuccess && (
          <>
            {logs.length === 0 || !hasErrors ? (
              <p className="text-gray-400 text-sm">No errors recorded.</p>
            ) : null}
            {logs.map((entry) => (
              <LogEntry key={entry.id} entry={entry} />
            ))}
          </>
        )}
      </section>
    </div>
  );
}
