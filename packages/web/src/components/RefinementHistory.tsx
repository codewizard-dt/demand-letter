import { useRefinements } from '../hooks/useJobQueries';

interface RefinementHistoryProps {
  jobId: string;
}

export function RefinementHistory({ jobId }: RefinementHistoryProps) {
  const { data: rows = [], isLoading: loading, error } = useRefinements(jobId);

  const count = rows.length;

  return (
    <details className="mt-4 border border-gray-200 rounded-lg bg-white">
      <summary className="px-4 py-3 text-sm font-semibold text-gray-700 cursor-pointer select-none">
        Refinement history ({count})
      </summary>
      <div className="px-4 pb-4">
        {loading && <p className="text-sm text-gray-400 mt-2">Loading…</p>}
        {error && <p className="text-sm text-red-500 mt-2">{String(error)}</p>}
        {!loading && !error && count === 0 && (
          <p className="text-sm text-gray-400 mt-2">No refinements yet.</p>
        )}
        {!loading && !error && count > 0 && (
          <ul className="mt-2 space-y-2">
            {rows.map((row) => (
              <li key={row.id} className="flex items-start gap-3 text-sm border-b border-gray-100 pb-2 last:border-0">
                <span
                  className={`mt-0.5 shrink-0 inline-block px-1.5 py-0.5 text-xs font-medium rounded ${
                    row.accepted
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {row.accepted ? 'Accepted' : 'Rejected'}
                </span>
                <span
                  className="shrink-0 inline-block px-1.5 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-600 border border-blue-200"
                >
                  {row.scope}
                </span>
                <span className="text-gray-700 flex-1 break-words">
                  {row.instruction.length > 80
                    ? row.instruction.slice(0, 80) + '…'
                    : row.instruction}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(row.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
