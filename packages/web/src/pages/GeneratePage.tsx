import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGapReport } from '../hooks/useJobQueries';
import { useGenerateJob, useDownloadOutput } from '../hooks/useJobMutations';

import { RefinementPanel } from '../components/RefinementPanel';
import { RefinementHistory } from '../components/RefinementHistory';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

import WorkflowStepper from '../components/WorkflowStepper';
import ErrorCard from '../components/ErrorCard';

export default function GeneratePage() {
  useDocumentTitle('Generate — Steno');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [output, setOutput] = useState('');
  const [isDone, setIsDone] = useState(false);

  const gapReportQuery = useGapReport(id);
  const generateMutation = useGenerateJob();
  const downloadMutation = useDownloadOutput();

  function handleGenerate() {
    setOutput('');
    generateMutation.mutate(
      { jobId: id!, onChunk: (chunk) => setOutput((prev) => prev + chunk) },
      { onSuccess: () => setIsDone(true) },
    );
  }

  function handleDownload() {
    downloadMutation.mutate(id!);
  }

  const canGenerate =
    !gapReportQuery.isLoading &&
    !gapReportQuery.isError &&
    gapReportQuery.data !== undefined &&
    gapReportQuery.data.gaps.length === 0;

  const disabledReason = gapReportQuery.isLoading
    ? 'Checking sufficiency — please wait…'
    : gapReportQuery.isError
      ? `Could not check gap report: ${String(gapReportQuery.error)}`
      : gapReportQuery.data && gapReportQuery.data.gaps.length > 0
        ? `${gapReportQuery.data.gaps.length} required slot${gapReportQuery.data.gaps.length === 1 ? '' : 's'} still uncovered. Go to the Gap Report to fill or accept them before generating.`
        : null;

  const isGenerating = generateMutation.isPending;
  const isDownloading = downloadMutation.isPending;
  const error = generateMutation.error ? String(generateMutation.error) : null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <WorkflowStepper currentStep={2} />
      <h1 className="text-2xl font-bold mb-6">Generate Demand Letter</h1>

      {!isDone && (
        <div>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            title={disabledReason ?? undefined}
            className="btn-primary"
          >
            Generate Demand Letter
          </button>
          {disabledReason && !isGenerating && (
            <p className="mt-2 text-sm text-yellow-700">{disabledReason}</p>
          )}
        </div>
      )}

      {isGenerating && (
        <div className="flex items-center gap-3 mt-4">
          <svg
            className="animate-spin h-5 w-5 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span className="text-primary font-medium">Building document…</span>
        </div>
      )}

      {error && <ErrorCard message={error} onRetry={handleGenerate} />}

      {output && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="false"
          className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed bg-gray-50 p-4 rounded"
        >
          {output}
        </div>
      )}

      {isDone && (
        <RefinementPanel
          jobId={id!}
          currentText={output}
          onAccepted={(newText) => setOutput(newText)}
        />
      )}

      {isDone && (
        <RefinementHistory jobId={id!} />
      )}

      {isDone && (
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => navigate(`/jobs/${id}/editor`)}
            className="btn-primary"
          >
            Open in Editor
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-outline"
          >
            {isDownloading ? 'Preparing…' : 'Download DOCX'}
          </button>
        </div>
      )}
    </div>
  );
}
