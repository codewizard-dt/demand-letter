import { useRef, useState } from 'react';
import { diffLines } from 'diff';
import { useRefineJob, useAcceptRefinement, useRejectRefinement } from '../hooks/useJobMutations';
import { useRefinements } from '../hooks/useJobQueries';
import LoadingSpinner from './LoadingSpinner';

const SCOPE_OPTIONS = ['all', 'medical_narrative', 'damages', 'liability', 'demand_amount'] as const;

interface RefinementPanelProps {
  jobId: string;
  isEnabled: boolean;
  currentText: string;
  onAccepted: (newText: string) => void;
}

export function RefinementPanel({ jobId, isEnabled, currentText, onAccepted }: RefinementPanelProps) {
  const [instruction, setInstruction] = useState('');
  const [scope, setScope] = useState('all');
  const [refinedText, setRefinedText] = useState('');
  const [refinementId, setRefinementId] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const historyEndRef = useRef<HTMLDivElement>(null);

  const refineMutation = useRefineJob(jobId);
  const acceptMutation = useAcceptRefinement(jobId);
  const rejectMutation = useRejectRefinement(jobId);
  const { data: historyRows = [], isLoading: historyLoading } = useRefinements(jobId);

  function handleRefine() {
    setRefinedText('');
    setRefinementId(null);
    setShowDiff(false);
    refineMutation.mutate(
      {
        instruction,
        scope: scope === 'all' ? undefined : scope,
        onChunk: (chunk) => { setRefinedText((prev) => prev + chunk); },
      },
      {
        onSuccess: (result) => {
          setRefinementId(result.refinementId);
          setShowDiff(false);
          setTimeout(() => historyEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        },
      },
    );
  }

  function handleAccept() {
    if (!refinementId) return;
    acceptMutation.mutate(refinementId, {
      onSuccess: () => {
        onAccepted(refinedText);
        setInstruction('');
        setRefinedText('');
        setRefinementId(null);
        setShowDiff(false);
      },
    });
  }

  function handleRevert() {
    if (!refinementId) return;
    rejectMutation.mutate(refinementId, {
      onSuccess: () => { setRefinedText(''); setRefinementId(null); setShowDiff(false); },
    });
  }

  const isRefining = refineMutation.isPending;
  const error =
    refineMutation.error?.message ??
    acceptMutation.error?.message ??
    rejectMutation.error?.message ??
    null;
  const hasResult = refinedText.length > 0;
  const isComplete = hasResult && !isRefining;
  const diffParts = isComplete && showDiff ? diffLines(currentText, refinedText) : [];

  return (
    <div className="flex flex-col border border-gray-200 rounded bg-white overflow-hidden" style={{ minHeight: '500px', maxHeight: '72vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">Refine Letter</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Scope:</label>
          <select
            className="border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={scope}
            onChange={(e) => { setScope(e.target.value); }}
            disabled={isRefining || !isEnabled}
          >
            {SCOPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'All' : opt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scrollable history + active result */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {!isEnabled && (
          <p className="text-sm text-gray-400 text-center mt-8">Generate the letter first to enable refinements.</p>
        )}

        {isEnabled && historyLoading && (
          <p className="text-xs text-gray-400">Loading history…</p>
        )}

        {isEnabled && !historyLoading && historyRows.length === 0 && !hasResult && (
          <p className="text-xs text-gray-400 text-center mt-8">No refinements yet. Use the input below to refine the letter.</p>
        )}

        {/* History rows */}
        {historyRows.map((row) => (
          <div key={row.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${row.accepted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                {row.accepted ? 'Accepted' : 'Rejected'}
              </span>
              <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-600 border border-blue-200">
                {row.scope}
              </span>
              <span className="text-[10px] text-gray-400 ml-auto">{new Date(row.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-700 break-words">
              {row.instruction.length > 120 ? row.instruction.slice(0, 120) + '…' : row.instruction}
            </p>
          </div>
        ))}

        {/* Active refinement */}
        {isRefining && (
          <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
            <LoadingSpinner className="h-3.5 w-3.5 text-blue-500" />
            <span>Refining…</span>
          </div>
        )}

        {hasResult && (
          <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
              <span>Suggested revision</span>
              {isComplete && (
                <>
                  <button
                    className="ml-auto px-2 py-0.5 text-[10px] font-medium border border-gray-300 rounded bg-white hover:bg-gray-50"
                    onClick={() => { setShowDiff((v) => !v); }}
                  >
                    {showDiff ? 'Text' : 'Diff'}
                  </button>
                  <button
                    className="px-2 py-0.5 text-[10px] font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    onClick={handleAccept}
                    disabled={!refinementId}
                  >
                    Accept
                  </button>
                  <button
                    className="px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200 disabled:opacity-50"
                    onClick={handleRevert}
                    disabled={!refinementId}
                  >
                    Revert
                  </button>
                </>
              )}
            </div>
            {isComplete && showDiff ? (
              <div className="border border-gray-200 rounded overflow-auto max-h-48 text-[10px] font-mono bg-white">
                {diffParts.map((part, i) => {
                  const lines = part.value.split('\n');
                  const displayLines = lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
                  return displayLines.map((line, j) => (
                    <div
                      key={`${i}-${j}`}
                      className={
                        part.added
                          ? 'bg-green-100 text-green-800 px-2 py-0.5'
                          : part.removed
                            ? 'bg-red-100 text-red-800 line-through px-2 py-0.5'
                            : 'px-2 py-0.5 text-gray-700'
                      }
                    >
                      {part.added ? '+ ' : part.removed ? '- ' : '  '}{line}
                    </div>
                  ));
                })}
              </div>
            ) : (
              <pre className="text-[10px] font-mono text-gray-700 whitespace-pre-wrap overflow-auto max-h-48 bg-white border border-gray-200 rounded p-2">
                {refinedText}
              </pre>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <div ref={historyEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-gray-200 px-4 py-3 space-y-2">
        <textarea
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
          rows={3}
          placeholder={isEnabled ? 'e.g. Make the demand amount stronger' : 'Generate the letter first…'}
          value={instruction}
          onChange={(e) => { setInstruction(e.target.value); }}
          disabled={isRefining || !isEnabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && isEnabled && !isRefining && instruction.trim()) {
              e.preventDefault();
              handleRefine();
            }
          }}
        />
        <div className="flex justify-end">
          <button
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleRefine}
            disabled={isRefining || !instruction.trim() || !isEnabled}
          >
            {isRefining ? 'Refining…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
