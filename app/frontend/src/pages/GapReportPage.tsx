import { useState, useRef, useMemo, useEffect } from 'react';
import { UserRound } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGapReport, useExtractedFields, useBlocks, useJobFiles, useLatestTemplate, useTemplateSlots } from '../hooks/useJobQueries';
import { useAddCaseDocuments, useProcessCaseDocuments, useProcessSingleCaseDocument, useSaveValues, useTriggerGenerateJob } from '../hooks/useJobMutations';
import LoadingSpinner from '../components/LoadingSpinner';
import { Checkbox } from '../components/Checkbox';

import { useDocumentTitle } from '../hooks/useDocumentTitle';
import WorkflowStepper from '../components/WorkflowStepper';
import ErrorCard from '../components/ErrorCard';

// An inline-editable value cell, styled to match the template page's editable
// divs. It is uncontrolled while focused (commits on blur), so typing never
// fights a re-render; the parent only re-renders after the value is committed.
function EditableValueCell({
  value,
  placeholder,
  textClass,
  onCommit,
}: {
  value: string;
  placeholder: string;
  textClass: string;
  onCommit: (next: string) => void;
}) {
  const baseline = useRef<string | null>(null);
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Value"
      data-placeholder={placeholder}
      onFocus={(e) => { baseline.current = e.currentTarget.innerText; }}
      onBlur={(e) => {
        const next = e.currentTarget.innerText.replace(/\s+$/, '').trim();
        if (next !== (baseline.current ?? '').trim()) onCommit(next);
        baseline.current = null;
      }}
      className={`min-h-[1.75rem] w-full rounded border border-gray-200 px-2 py-1 text-sm leading-5 outline-none whitespace-pre-wrap break-words cursor-text hover:border-gray-300 focus:border-gray-400 focus:bg-white focus:ring-1 focus:ring-primary empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 ${textClass}`}
    >
      {value}
    </div>
  );
}

export default function GapReportPage() {
  useDocumentTitle('Gap Report — Steno');
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const gapReportQuery = useGapReport(jobId);
  const extractedFieldsQuery = useExtractedFields(jobId);
  const blocksQuery = useBlocks(jobId);
  const filesQuery = useJobFiles(jobId);
  const latestTemplateQuery = useLatestTemplate(jobId);
  const templateSlotsQuery = useTemplateSlots(jobId, latestTemplateQuery.data?.templateId);
  const submitJudgmentMutation = useSaveValues(jobId!);
  const addCaseDocumentsMutation = useAddCaseDocuments(jobId!);
  const processCaseDocumentsMutation = useProcessCaseDocuments(jobId!);
  const processSingleDocMutation = useProcessSingleCaseDocument(jobId!);
  const triggerGenerateMutation = useTriggerGenerateJob();

  const [fillValues, setFillValues] = useState<Record<string, string>>({
    letter_date: new Date().toLocaleDateString('en-CA'),
  });
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [caseDrag, setCaseDrag] = useState(false);
  const [caseUploadStatus, setCaseUploadStatus] = useState<string | null>(null);
  const [showFilled, setShowFilled] = useState(true);
  const autoProcessJobRef = useRef<string | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const extractedFields = extractedFieldsQuery.data ?? [];
  const files = filesQuery.data ?? [];
  const hasCaseDocuments = files.some((file) => file.role === 'case_doc');
  const caseDocuments = files.filter((f) => f.role === 'case_doc');
  const templateSlots = templateSlotsQuery.data ?? [];
  const templateSlotNames = useMemo(
    () => new Set(templateSlots.map((slot) => slot.slotName)),
    [templateSlots],
  );
  const templateSlotMap = useMemo(
    () => new Map(templateSlots.map(s => [s.slotName, s])),
    [templateSlots],
  );
  const extractedFieldMap = useMemo(
    () => new Map(extractedFields.map((field) => [field.fieldName, field])),
    [extractedFields],
  );
  const hasUserProvided = useMemo(
    () => extractedFields.some((f) => f.source === 'user-provided'),
    [extractedFields],
  );

  const citationFields = templateSlots.length > 0
    ? templateSlots.map((slot) => extractedFieldMap.get(slot.slotName) ?? {
      fieldName: slot.slotName,
      value: null,
      blockIds: [],
      confidence: 0,
      isNull: true,
      source: null,
      nullReason: null,
      acceptMissing: false,
    })
    : extractedFields.filter((field) => templateSlotNames.size === 0 || templateSlotNames.has(field.fieldName));
  const blocks = blocksQuery.data ?? [];

  const blockMap = useMemo(
    () => new Map(blocks.map((b) => [b.id, b])),
    [blocks]
  );

  const s3KeyToFileName = useMemo(
    () => new Map(files.map((f) => [f.s3Key, f.fileName])),
    [files]
  );

  const blockFileName = (blockId: string): string | null => {
    const b = blockMap.get(blockId);
    if (!b?.sourceFile?.s3Key) return null;
    return s3KeyToFileName.get(b.sourceFile.s3Key) ?? null;
  };

  const hasAnyAction = Object.values(fillValues).some(v => v.trim() !== '');

  const handleSubmit = () => {
    if (!jobId) return;
    const fields = Object.entries(fillValues)
      .filter(([, v]) => v.trim() !== '')
      .map(([fieldName, value]) => ({ fieldName, value }));
    submitJudgmentMutation.mutate(
      { fields, acceptMissing: [] },
      { onSuccess: () => { setFillValues({}); } },
    );
  };

  const handleAddCaseDocuments = (files: FileList | File[]) => {
    if (!jobId) return;
    const caseFiles = Array.from(files);
    if (caseFiles.length === 0) return;
    addCaseDocumentsMutation.mutate(
      { caseFiles, onStatus: setCaseUploadStatus },
      {
        onSettled: () => { setCaseUploadStatus(null); },
      },
    );
  };

  const handleGenerate = () => {
    if (!jobId) return;
    const unfilledGaps = report.gaps.filter(g => !fillValues[g.fieldName]?.trim());
    if (unfilledGaps.length > 0) {
      setShowGenerateModal(true);
    } else {
      triggerGenerateMutation.mutate(jobId, {
        onSuccess: () => { navigate(`/jobs/${jobId}/generate`); },
      });
    }
  };

  const confirmGenerate = () => {
    if (!jobId) return;
    setShowGenerateModal(false);
    const filledFields = Object.entries(fillValues)
      .filter(([, v]) => v.trim() !== '')
      .map(([fieldName, value]) => ({ fieldName, value }));
    const doGenerate = () => { triggerGenerateMutation.mutate(jobId, {
      onSuccess: () => { navigate(`/jobs/${jobId}/generate`); },
    }); };
    if (filledFields.length > 0) {
      submitJudgmentMutation.mutate(
        { fields: filledFields, acceptMissing: [] },
        { onSuccess: () => { setFillValues({}); doGenerate(); } },
      );
    } else {
      doGenerate();
    }
  };

  const handleReprocessCaseDocuments = () => {
    if (!jobId || processingExistingDocuments || addingCaseDocuments) return;
    processCaseDocumentsMutation.mutate(
      { force: true, onStatus: setCaseUploadStatus },
      { onSettled: () => { setCaseUploadStatus(null); } },
    );
  };

  const submitting = submitJudgmentMutation.isPending;
  const addingCaseDocuments = addCaseDocumentsMutation.isPending;
  const processingExistingDocuments = processCaseDocumentsMutation.isPending;
  const generating = triggerGenerateMutation.isPending;
  const mutationError = submitJudgmentMutation.error?.message
    ?? addCaseDocumentsMutation.error?.message
    ?? processCaseDocumentsMutation.error?.message
    ?? triggerGenerateMutation.error?.message
    ?? null;

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
    return () => { clearInterval(interval); };
  }, [errorCode, gapReportQuery]);

  useEffect(() => {
    if (!jobId || autoProcessJobRef.current === jobId) return;
    if (filesQuery.isLoading || blocksQuery.isLoading || gapReportQuery.isLoading) return;
    if (!hasCaseDocuments || blocks.length > 0 || addingCaseDocuments || processingExistingDocuments) return;

    autoProcessJobRef.current = jobId;
    processCaseDocumentsMutation.mutate(
      { onStatus: setCaseUploadStatus },
      { onSettled: () => { setCaseUploadStatus(null); } },
    );
  }, [
    addingCaseDocuments,
    blocks.length,
    blocksQuery.isLoading,
    filesQuery.isLoading,
    gapReportQuery.isLoading,
    hasCaseDocuments,
    jobId,
    processCaseDocumentsMutation,
    processingExistingDocuments,
  ]);

  if (gapReportQuery.isLoading) return <div className="p-8">Loading gap report…</div>;

  if (gapReportQuery.isError) {
    if (errorCode === 'template_not_ready') {
      return (
        <div className="p-8">
          <WorkflowStepper currentStep={2} {...(jobId ? { jobId } : {})} />
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
  const gapSet = new Set(report.gaps.map((g) => g.fieldName));
  const gapMap = new Map(report.gaps.map((g) => [g.fieldName, g]));

  const handleBlockClick = (blockId: string) => {
    setActiveBlockId(blockId);
    const el = blockRefs.current[blockId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="p-8">
      <WorkflowStepper currentStep={2} {...(jobId ? { jobId } : {})} />
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



          <div className="mb-6">
            <label className="block mb-1.5 font-semibold">Add Missed Case Documents (.pdf)</label>
            <div
              className={`border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-colors ${caseDrag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'
                } ${addingCaseDocuments || processingExistingDocuments ? 'opacity-70 cursor-wait' : ''}`}
              onDragOver={(e) => { e.preventDefault(); if (!addingCaseDocuments && !processingExistingDocuments) setCaseDrag(true); }}
              onDragLeave={() => { setCaseDrag(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setCaseDrag(false);
                if (!addingCaseDocuments && !processingExistingDocuments) handleAddCaseDocuments(e.dataTransfer.files);
              }}
              onClick={() => {
                if (!addingCaseDocuments && !processingExistingDocuments) document.getElementById('gapCaseDocs')?.click();
              }}
            >
              <input
                id="gapCaseDocs"
                type="file"
                accept=".pdf"
                multiple
                aria-hidden="true"
                className="hidden"
                disabled={addingCaseDocuments || processingExistingDocuments}
                onChange={(e) => {
                  handleAddCaseDocuments(e.target.files ?? []);
                  e.currentTarget.value = '';
                }}
              />
              <p className="text-sm text-text-muted">
                {addingCaseDocuments || processingExistingDocuments ? (
                  caseUploadStatus ?? 'Uploading & processing…'
                ) : (
                  <>Drag additional .pdf files here or <span className="text-primary underline">browse</span></>
                )}
              </p>
            </div>

            {(addingCaseDocuments || processingExistingDocuments) && caseUploadStatus && (
              <div role="status" aria-live="polite" className="mt-2 flex items-center gap-2 text-sm text-blue-700">
                <LoadingSpinner className="h-4 w-4 text-primary" />
                <span>{caseUploadStatus}</span>
              </div>
            )}
          </div>

          {citationFields.length > 0 && (
            <>
              <div className="mb-4 flex items-center justify-end gap-3">
                <Checkbox
                  className="ml-auto"
                  checked={showFilled}
                  onChange={setShowFilled}
                  label="Show filled slots"
                />
                {(report.gaps.length > 0 || hasAnyAction) && (
                  <button
                    onClick={handleSubmit}
                    disabled={!hasAnyAction || submitting}
                    className="btn-primary"
                  >
                    {submitting ? 'Saving…' : 'Save Values'}
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="btn-primary"
                >
                  {generating ? 'Generating…' : 'Proceed to Generate'}
                </button>
              </div>

              <div className="mb-3 flex items-center gap-3 text-sm text-gray-500 justify-between">
                <span>Fields left blank will be filled in by AI during generation.</span>
                {hasUserProvided && (
                  <span className="flex items-center gap-1 text-xs">
                    <UserRound className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    user provided
                  </span>
                )}
              </div>
              <table className="w-full border-collapse mb-6 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left border border-gray-300">Slot Name</th>
                    <th className="p-2 text-left border border-gray-300">Template Value</th>
                    <th className="p-2 text-left border border-gray-300">Value</th>
                    <th className="p-2 text-left border border-gray-300">Null Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {citationFields.filter((field) => showFilled || gapSet.has(field.fieldName)).map((field) => {
                    const isGap = gapSet.has(field.fieldName);
                    const gap = gapMap.get(field.fieldName);
                    return (
                      <tr
                        key={field.fieldName}
                        className={isGap ? '' : 'bg-green-50'}
                      >
                        <td className="p-2 border border-gray-300 font-medium whitespace-nowrap">
                          <span className={`mr-1.5 ${isGap ? 'text-red-400' : 'text-green-600'}`}>
                            {isGap ? '✗' : '✓'}
                          </span>
                          {field.fieldName}
                        </td>
                        <td className="p-2 border border-gray-300 text-gray-700 max-w-[160px] text-xs break-words">
                          <div className="max-h-24 overflow-y-auto">
                            {templateSlotMap.get(field.fieldName)?.defaultValue ?? <span className="text-gray-300">—</span>}
                          </div>
                        </td>
                        <td className="p-2 border border-gray-300 max-w-[220px]">
                          <div className="flex items-start gap-1">
                            <EditableValueCell
                              value={fillValues[field.fieldName] ?? field.value ?? ''}
                              placeholder="Enter value…"
                              textClass={isGap && field.value && field.confidence < 0.5 ? 'text-gray-500' : 'text-gray-900'}
                              onCommit={(next) => {
                                // Empty is treated as "no value" by hasAnyAction/handleSubmit,
                                // so storing '' is equivalent to clearing without a dynamic delete.
                                setFillValues((prev) => ({ ...prev, [field.fieldName]: next }));
                              }}
                            />
                            {field.source === 'user-provided' && (
                              <span title="user provided" className="mt-1 shrink-0">
                                <UserRound className="h-3.5 w-3.5 text-blue-500" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 border border-gray-300 text-gray-500 max-w-[180px]">
                          <div className="max-h-24 overflow-y-auto">
                            {gap?.nullReason ?? field.nullReason ?? '—'}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>

            </>
          )}
        </div>

        {/* Right column: citation sidebar */}
        <div className="border border-gray-200 rounded-md p-4 h-fit max-h-[80vh] overflow-y-auto bg-gray-50">
          {caseDocuments.length > 0 && (
            <>
              <h3 className="mt-0 text-base font-semibold">Case Documents</h3>
              <div className="space-y-1 mb-2">
                {caseDocuments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-700 truncate">{file.fileName}</span>
                    <button
                      type="button"
                      onClick={() => { processSingleDocMutation.mutate({ fileId: file.id, onStatus: setCaseUploadStatus }); }}
                      disabled={processSingleDocMutation.isPending || processingExistingDocuments || addingCaseDocuments}
                      className="shrink-0 rounded border border-primary px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reprocess
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleReprocessCaseDocuments}
                disabled={addingCaseDocuments || processingExistingDocuments}
                className="w-full rounded border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processingExistingDocuments ? 'Reprocessing…' : 'Reprocess All Case Documents'}
              </button>
              <hr className="my-3 border-gray-200" />
            </>
          )}
          <h3 className="mt-0 text-base font-semibold">Citation Sources</h3>
          {citationFields.length === 0 && <p className="text-gray-400 text-sm">No extracted fields yet.</p>}
          {citationFields.map((field) => (
            <div key={field.fieldName} className="mb-3 text-sm">
              <div className="font-medium text-gray-800">{field.fieldName}</div>
              {field.blockIds.length === 0 ? (
                <span className="text-gray-400">—</span>
              ) : (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {field.blockIds.map((bid) => (
                    <button
                      key={bid}
                      onClick={() => { handleBlockClick(bid); }}
                      className={`px-2 py-0.5 text-xs border rounded cursor-pointer ${activeBlockId === bid
                        ? 'bg-blue-600 text-white border-blue-300'
                        : 'bg-blue-50 text-blue-600 border-blue-200'
                        }`}
                    >
                      {(() => {
                        const b = blockMap.get(bid);
                        if (!b) return `${bid.slice(0, 8)}…`;
                        const name = blockFileName(bid);
                        return name ? `${name} · pg ${b.page}` : `pg ${b.page}`;
                      })()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Citation details panel */}
      {blocks.length > 0 && (
        <div className="mt-8">
          <h3 className="mt-0 mb-2 font-semibold">Source Document Details</h3>
          <div className="border border-gray-200 rounded-md p-4 max-h-[500px] overflow-y-auto bg-white">
            {blocks.map((block) => {
              const fileName = block.sourceFile?.s3Key ? s3KeyToFileName.get(block.sourceFile.s3Key) : null;
              return (
                <div
                  key={block.id}
                  id={block.id}
                  ref={(el) => { blockRefs.current[block.id] = el; }}
                  className={`px-3 py-2 mb-2 rounded transition-colors duration-150 ${activeBlockId === block.id
                    ? 'border-2 border-blue-600 bg-blue-50'
                    : 'border border-gray-200 bg-gray-50'
                    }`}
                >
                  <div className="text-[11px] text-gray-400 mb-1">
                    {fileName && <span className="font-medium text-gray-500">{fileName}</span>}
                    {fileName && ' · '}
                    pg {block.page}
                  </div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">{block.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-md shadow-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-2">Proceed to Generate?</h2>
            <div className="mb-4 rounded-md border-2 border-amber-400 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="h-7 w-7 flex-shrink-0 text-amber-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-base font-bold text-amber-900">
                    The AI does not generate any facts or data.
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    It only supplies standard legal wording (legalese and boilerplate) for these
                    slots. It will <span className="font-semibold">never invent</span> names, dates,
                    dollar amounts, claim numbers, or any other case facts. If a blank slot needs a
                    real value, go back and enter it yourself.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              The following slots have no value and will be filled by AI:
            </p>
            <ul className="mb-5 space-y-1 max-h-60 overflow-y-auto">
              {report.gaps
                .filter(g => !fillValues[g.fieldName]?.trim())
                .map(g => (
                  <li key={g.fieldName} className="text-sm font-mono text-gray-800 bg-gray-50 rounded px-2 py-1">
                    {g.fieldName}
                  </li>
                ))}
            </ul>
            <p className="text-xs text-gray-500 mb-5">
              To enter a value manually instead, close this dialog and type it in the Value column.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowGenerateModal(false); }}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                onClick={confirmGenerate}
                disabled={generating || submitting}
                className="btn-primary"
              >
                {generating || submitting ? 'Working…' : 'Generate with AI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
