import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useJobFiles, useJobLogs } from '../hooks/useJobQueries';
import { useAddCaseDocuments } from '../hooks/useJobMutations';
import type { FileRow, JobLogRow } from '../lib/api';
import WorkflowStepper from '../components/WorkflowStepper';
import LoadingSpinner from '../components/LoadingSpinner';

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
  const navigate = useNavigate();

  const filesQuery = useJobFiles(jobId);
  const logsQuery = useJobLogs(jobId);
  const addCaseDocumentsMutation = useAddCaseDocuments(jobId!);
  const [caseFiles, setCaseFiles] = useState<File[]>([]);
  const [caseDrag, setCaseDrag] = useState(false);
  const [caseUploadStatus, setCaseUploadStatus] = useState<string | null>(null);

  const files = filesQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const hasErrors = logs.some((l) => l.level === 'error' || l.level === 'warn');
  const loading = addCaseDocumentsMutation.isPending;
  const error = addCaseDocumentsMutation.error ? String(addCaseDocumentsMutation.error) : null;

  function appendCaseFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files);
    if (nextFiles.length === 0) return;
    setCaseFiles(prev => [...prev, ...nextFiles]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId || caseFiles.length === 0) return;
    addCaseDocumentsMutation.mutate(
      { caseFiles, onStatus: setCaseUploadStatus },
      {
        onSuccess: () => navigate(`/jobs/${jobId}/gap-report`),
        onSettled: () => setCaseUploadStatus(null),
      },
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <WorkflowStepper currentStep={1} jobId={jobId} />

      <h1 className="text-2xl font-bold mb-6">Upload Case Documents</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 rounded-md px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {loading && caseUploadStatus && (
        <div role="status" aria-live="polite" className="mb-4 st-status-banner">
          <LoadingSpinner className="h-4 w-4 text-primary" />
          <span>{caseUploadStatus}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-10">
        <label className="block mb-1.5 font-semibold">Case Documents (.pdf)</label>
        <div
          className={`border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${caseDrag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'} ${loading ? 'opacity-70 cursor-wait' : ''}`}
          onDragOver={(e) => { e.preventDefault(); if (!loading) setCaseDrag(true); }}
          onDragLeave={() => setCaseDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setCaseDrag(false);
            if (!loading) appendCaseFiles(e.dataTransfer.files);
          }}
          onClick={() => {
            if (!loading) document.getElementById('caseDocs')?.click();
          }}
        >
          <input
            id="caseDocs"
            type="file"
            accept=".pdf"
            multiple
            aria-hidden="true"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              appendCaseFiles(e.target.files ?? []);
              e.currentTarget.value = '';
            }}
          />
          {caseFiles.length > 0 ? (
            <ul className="text-sm text-primary font-medium space-y-0.5">
              {caseFiles.map((f, index) => <li key={`${f.name}-${f.lastModified}-${index}`}>{f.name}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">Drag .pdf files here or <span className="text-primary underline">browse</span></p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || caseFiles.length === 0}
          className="btn-primary mt-4"
        >
          {loading ? 'Uploading & processing…' : 'Upload Case Documents'}
        </button>
      </form>

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
