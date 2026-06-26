import { useState } from 'react';
import { diffLines } from 'diff';
import { useRefineJob, useAcceptRefinement, useRejectRefinement } from '../hooks/useJobMutations';

const SCOPE_OPTIONS = ['all', 'medical_narrative', 'damages', 'liability', 'demand_amount'] as const;

interface RefinementPanelProps {
  jobId: string;
  currentText: string;
  onAccepted: (newText: string) => void;
}

export function RefinementPanel({ jobId, currentText, onAccepted }: RefinementPanelProps) {
  const [instruction, setInstruction] = useState('');
  const [scope, setScope] = useState('all');
  const [refinedText, setRefinedText] = useState('');
  const [refinementId, setRefinementId] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const refineMutation = useRefineJob(jobId);
  const acceptMutation = useAcceptRefinement(jobId);
  const rejectMutation = useRejectRefinement(jobId);

  function handleRefine() {
    setRefinedText('');
    setRefinementId(null);
    setShowDiff(false);
    refineMutation.mutate(
      {
        instruction,
        scope: scope === 'all' ? undefined : scope,
        onChunk: (chunk) => setRefinedText((prev) => prev + chunk),
      },
      { onSuccess: (result) => setRefinementId(result.refinementId) },
    );
  }

  function handleAccept() {
    if (!refinementId) return;
    acceptMutation.mutate(refinementId, {
      onSuccess: () => onAccepted(refinedText),
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
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
      <h3 className="text-base font-semibold text-gray-800">Refine Letter</h3>

      {/* Instruction input */}
      <textarea
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        rows={3}
        placeholder="e.g. Make the demand amount stronger"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        disabled={isRefining}
      />

      {/* Scope selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Scope:</label>
        <select
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          disabled={isRefining}
        >
          {SCOPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === 'all' ? 'All' : opt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>

        {/* Refine button */}
        <button
          className="ml-auto px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleRefine}
          disabled={isRefining || !instruction.trim()}
        >
          Refine
        </button>
      </div>

      {/* Loading state */}
      {isRefining && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg
            className="animate-spin h-4 w-4 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Refining…</span>
        </div>
      )}

      {/* Streaming / result output */}
      {hasResult && (
        <div className="space-y-2">
          {/* Toggle + action buttons (only when complete) */}
          {isComplete && (
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setShowDiff((v) => !v)}
              >
                {showDiff ? 'Show Text' : 'Show Diff'}
              </button>

              <button
                className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAccept}
                disabled={!refinementId}
              >
                Accept
              </button>

              <button
                className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 border border-red-300 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleRevert}
                disabled={!refinementId}
              >
                Revert
              </button>
            </div>
          )}

          {/* Diff view */}
          {isComplete && showDiff ? (
            <div className="border border-gray-200 rounded-md overflow-auto max-h-96 text-xs font-mono">
              {diffParts.map((part, i) => {
                const lines = part.value.split('\n');
                // trailing empty string from split — skip it
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
                    {part.added ? '+ ' : part.removed ? '- ' : '  '}
                    {line}
                  </div>
                ));
              })}
            </div>
          ) : (
            /* Plain text view (during streaming and when diff is off) */
            <pre className="border border-gray-200 rounded-md p-3 text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-auto max-h-96 bg-gray-50">
              {refinedText}
            </pre>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}
    </div>
  );
}
