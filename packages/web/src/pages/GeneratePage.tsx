import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateJob, downloadOutput, fetchGapReport, GapReport } from '../lib/api';

import { RefinementPanel } from '../components/RefinementPanel';
import { RefinementHistory } from '../components/RefinementHistory';
export default function GeneratePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [gapReport, setGapReport] = useState<GapReport | null>(null);
  const [gapLoading, setGapLoading] = useState(true);
  const [gapError, setGapError] = useState<string | null>(null);
  const [refinementRefresh, setRefinementRefresh] = useState(0);

  useEffect(() => {
    if (!id) return;
    setGapLoading(true);
    fetchGapReport(id)
      .then((report) => setGapReport(report))
      .catch((e: Error) => setGapError(e.message))
      .finally(() => setGapLoading(false));
  }, [id]);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    setOutput('');
    try {
      await generateJob(id!, (chunk) => setOutput((prev) => prev + chunk));
      setIsDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const url = await downloadOutput(id!);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'demand-letter.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  }

  const canGenerate = !gapLoading && !gapError && gapReport !== null && gapReport.gaps.length === 0;
  const disabledReason = gapLoading
    ? 'Checking sufficiency — please wait…'
    : gapError
      ? `Could not check gap report: ${gapError}`
      : gapReport && gapReport.gaps.length > 0
        ? `${gapReport.gaps.length} required slot${gapReport.gaps.length === 1 ? '' : 's'} still uncovered. Go to the Gap Report to fill or accept them before generating.`
        : null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Generate Demand Letter</h1>

      {!isDone && (
        <div>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            title={disabledReason ?? undefined}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="animate-spin h-5 w-5 text-blue-600"
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
          <span className="text-blue-700 font-medium">Building document…</span>
        </div>
      )}

      {error && (
        <p className="mt-4 text-red-600">{error}</p>
      )}

      {output && (
        <pre className="mt-6 whitespace-pre-wrap bg-gray-100 p-4 rounded text-sm">
          {output}
        </pre>
      )}

      {isDone && (
        <RefinementPanel
          jobId={id!}
          currentText={output}
          onAccepted={(newText) => { setOutput(newText); setRefinementRefresh((n) => n + 1); }}
        />
      )}

      {isDone && (
        <RefinementHistory jobId={id!} refreshTrigger={refinementRefresh} />
      )}

      {isDone && (
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {isDownloading ? 'Preparing download…' : 'Download DOCX'}
        </button>
      )}

      {isDone && (
        <button
          onClick={() => navigate(`/jobs/${id}/editor`)}
          className="mt-4 ml-2 px-4 py-2 bg-purple-600 text-white rounded"
        >
          Open in Editor
        </button>
      )}
    </div>
  );
}
