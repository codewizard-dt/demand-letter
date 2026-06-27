import { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGapReport, useExtractedFields, useBlocks } from '../hooks/useJobQueries';
import { useSubmitAttorneyJudgment, useTriggerGenerateJob } from '../hooks/useJobMutations';


import { useDocumentTitle } from '../hooks/useDocumentTitle';
import WorkflowStepper from '../components/WorkflowStepper';
import ErrorCard from '../components/ErrorCard';

export default function GapReportPage() {
  useDocumentTitle('Gap Report — Steno');
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const gapReportQuery = useGapReport(jobId);
  const extractedFieldsQuery = useExtractedFields(jobId);
  const blocksQuery = useBlocks(jobId);
  const submitJudgmentMutation = useSubmitAttorneyJudgment(jobId!);
  const triggerGenerateMutation = useTriggerGenerateJob();

  const [fillValues, setFillValues] = useState<Record<string, string>>({});
  const [acceptMissing, setAcceptMissing] = useState<Record<string, boolean>>({});
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const extractedFields = extractedFieldsQuery.data ?? [];
  const blocks = blocksQuery.data ?? [];

  const blockMap = useMemo(
    () => new Map(blocks.map((b) => [b.id, b])),
    [blocks]
  );

  const hasAnyAction = Object.values(fillValues).some(v => v.trim() !== '') ||
    Object.values(acceptMissing).some(Boolean);

  const handleSubmit = () => {
    if (!jobId) return;
    const fields = Object.entries(fillValues)
      .filter(([, v]) => v.trim() !== '')
      .map(([fieldName, value]) => ({ fieldName, value }));
    const acceptList = Object.entries(acceptMissing)
      .filter(([, checked]) => checked)
      .map(([fieldName]) => fieldName);
    submitJudgmentMutation.mutate(
      { fields, acceptMissing: acceptList },
      { onSuccess: () => { setFillValues({}); setAcceptMissing({}); } },
    );
  };

  const handleGenerate = () => {
    if (!jobId) return;
    triggerGenerateMutation.mutate(jobId, {
      onSuccess: () => navigate(`/jobs/${jobId}/output`),
    });
  };

  const submitting = submitJudgmentMutation.isPending;
  const generating = triggerGenerateMutation.isPending;
  const mutationError = submitJudgmentMutation.error?.message ?? triggerGenerateMutation.error?.message ?? null;

  const errorCode = gapReportQuery.isError
    ? ((gapReportQuery.error as unknown as Record<string, unknown>).code as string | undefined)
    : undefined;

  useEffect(() => {
    if (errorCode !== 'template_not_ready') return;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 3;
      if (elapsed >= 60) {
        clearInterval(interval);
        return;
      }
      void gapReportQuery.refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [errorCode, gapReportQuery]);

  if (gapReportQuery.isLoading) return <div className="p-8">Loading gap report…</div>;

  if (gapReportQuery.isError) {
    if (errorCode === 'template_not_ready') {
      return (
        <div className="p-8">
          <WorkflowStepper currentStep={1} />
          <div className="max-w-lg mt-8 p-6 border border-yellow-300 bg-yellow-50 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">Preparing documents…</h2>
            <p className="text-yellow-700 mb-4">
              Your files are being processed. This page will update automatically once the template is ready.
            </p>
            <Link
              to={`/jobs/${jobId}/documents`}
              className="text-blue-600 underline text-sm"
            >
              View uploaded files →
            </Link>
          </div>
        </div>
      );
    }
    if (errorCode === 'job_not_found') {
      return <ErrorCard message="Job not found." onRetry={() => gapReportQuery.refetch()} />;
    }
    return <ErrorCard message={gapReportQuery.error.message} onRetry={() => gapReportQuery.refetch()} />;
  }

  const report = gapReportQuery.data!;

  const handleBlockClick = (blockId: string) => {
    setActiveBlockId(blockId);
    const el = blockRefs.current[blockId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="p-8">
      <WorkflowStepper currentStep={1} />
      <div className="grid grid-cols-[1fr_360px] gap-8 items-start">
        {/* Left column: existing gap-report table + submit form */}
        <div className="max-w-[900px]">
          <h1>Gap Report</h1>
          <p className="text-lg mb-6">
            <strong>{report.covered} of {report.total}</strong> slots covered.
            {report.gaps.length === 0 && <span className="text-green-600"> All slots satisfied — ready to generate.</span>}
          </p>

          {mutationError && (
            <div className="text-red-600 mb-4">{mutationError}</div>
          )}

          {report.gaps.length > 0 && (
            <>
              <table className="w-full border-collapse mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left border border-gray-300">Slot Name</th>
                    <th className="p-2 text-left border border-gray-300">Null Reason</th>
                    <th className="p-2 text-left border border-gray-300">Fill Value</th>
                    <th className="p-2 text-center border border-gray-300">Accept Missing</th>
                  </tr>
                </thead>
                <tbody>
                  {report.gaps.map((gap) => {
                    return (
                      <tr key={gap.fieldName}>
                        <td className="p-2 border border-gray-300">
                          {gap.fieldName}
                        </td>
                        <td className="p-2 border border-gray-300 text-gray-500">
                          {gap.nullReason ?? '—'}
                        </td>
                        <td className="p-2 border border-gray-300">
                          <input
                            type="text"
                            value={fillValues[gap.fieldName] ?? ''}
                            onChange={(e) => setFillValues(prev => ({ ...prev, [gap.fieldName]: e.target.value }))}
                            placeholder="Enter value…"
                            className="w-full px-1 py-0.5 border rounded"
                            disabled={acceptMissing[gap.fieldName]}
                          />
                        </td>
                        <td className="p-2 border border-gray-300 text-center">
                          <input
                            type="checkbox"
                            checked={acceptMissing[gap.fieldName] ?? false}
                            onChange={(e) => setAcceptMissing(prev => ({ ...prev, [gap.fieldName]: e.target.checked }))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <button
                onClick={handleSubmit}
                disabled={!hasAnyAction || submitting}
                className="btn-primary mr-4"
              >
                {submitting ? 'Submitting…' : 'Submit Attorney Judgment'}
              </button>
            </>
          )}

          <button
            onClick={handleGenerate}
            disabled={report.gaps.length > 0 || generating}
            className="btn-primary"
          >
            {generating ? 'Generating…' : 'Proceed to Generate'}
          </button>
        </div>

        {/* Right column: citation sidebar */}
        <div className="border border-gray-200 rounded-lg p-4 h-fit max-h-[80vh] overflow-y-auto bg-gray-50">
          <h3 className="mt-0 text-base font-semibold">Citation Sources</h3>
          {extractedFields.length === 0 && <p className="text-gray-400 text-sm">No extracted fields yet.</p>}
          {extractedFields.map((field) => (
            <div key={field.fieldName} className="mb-3 text-sm">
              <div className="font-medium text-gray-800">{field.fieldName}</div>
              {field.blockIds.length === 0 ? (
                <span className="text-gray-400">—</span>
              ) : (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {field.blockIds.map((bid) => (
                    <button
                      key={bid}
                      onClick={() => handleBlockClick(bid)}
                      className={`px-2 py-0.5 text-xs border rounded cursor-pointer ${
                        activeBlockId === bid
                          ? 'bg-blue-600 text-white border-blue-300'
                          : 'bg-blue-50 text-blue-600 border-blue-200'
                      }`}
                    >
                      {(() => {
                        const b = blockMap.get(bid);
                        return b ? `p.${b.page} · ${b.type.slice(0, 4).toUpperCase()}` : `${bid.slice(0, 8)}…`;
                      })()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Source document preview panel */}
      {blocks.length > 0 && (
        <div className="mt-8 border border-gray-200 rounded-lg p-4 max-h-[500px] overflow-y-auto bg-white">
          <h3 className="mt-0 text-base font-semibold">Source Document Preview</h3>
          {blocks.map((block) => (
            <div
              key={block.id}
              id={block.id}
              ref={(el) => { blockRefs.current[block.id] = el; }}
              className={`px-3 py-2 mb-2 rounded transition-colors duration-150 ${
                activeBlockId === block.id
                  ? 'border-2 border-blue-600 bg-blue-50'
                  : 'border border-gray-200 bg-gray-50'
              }`}
            >
              <div className="text-[11px] text-gray-400 mb-1">
                [{block.type}] p.{block.page} · id: {block.id}
              </div>
              <div className="text-sm text-gray-900 whitespace-pre-wrap">{block.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
