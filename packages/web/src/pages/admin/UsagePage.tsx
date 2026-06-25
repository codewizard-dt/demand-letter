import { useEffect, useState } from 'react';
import { fetchLlmCosts, LlmCostAggregate, LlmAuditRow } from '../../lib/api';

export default function UsagePage() {
  const [aggregates, setAggregates] = useState<LlmCostAggregate[]>([]);
  const [recentRows, setRecentRows] = useState<LlmAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLlmCosts(30)
      .then(({ aggregates, recentRows }) => {
        setAggregates(aggregates);
        setRecentRows(recentRows);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading...</p>;
  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>;

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">LLM Usage &amp; Cost</h1>

      {/* Per-feature aggregate table */}
      <section>
        <h2 className="mb-3 text-lg font-medium">By Feature (last 30 days)</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4">Feature</th>
              <th className="pb-2 pr-4 text-right">Calls</th>
              <th className="pb-2 pr-4 text-right">Input Tokens</th>
              <th className="pb-2 pr-4 text-right">Output Tokens</th>
              <th className="pb-2 text-right">Cost (USD)</th>
            </tr>
          </thead>
          <tbody>
            {aggregates.map((row) => (
              <tr key={row.feature} className="border-b last:border-0">
                <td className="py-2 pr-4 font-mono text-xs">{row.feature}</td>
                <td className="py-2 pr-4 text-right">{row._count.id}</td>
                <td className="py-2 pr-4 text-right">{(row._sum.inputTokens ?? 0).toLocaleString()}</td>
                <td className="py-2 pr-4 text-right">{(row._sum.outputTokens ?? 0).toLocaleString()}</td>
                <td className="py-2 text-right">${parseFloat(row._sum.estimatedCostUsd ?? '0').toFixed(4)}</td>
              </tr>
            ))}
            {aggregates.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-gray-400">No data yet</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Recent raw rows */}
      <section>
        <h2 className="mb-3 text-lg font-medium">Recent Calls (last 100)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-3">When</th>
                <th className="pb-2 pr-3">Feature</th>
                <th className="pb-2 pr-3">Model</th>
                <th className="pb-2 pr-3 text-right">In</th>
                <th className="pb-2 pr-3 text-right">Out</th>
                <th className="pb-2 pr-3 text-right">Cost</th>
                <th className="pb-2 text-right">ms</th>
              </tr>
            </thead>
            <tbody>
              {recentRows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-1.5 pr-3 text-gray-400">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="py-1.5 pr-3 font-mono">{row.feature}</td>
                  <td className="py-1.5 pr-3 text-gray-500">{row.model}</td>
                  <td className="py-1.5 pr-3 text-right">{row.inputTokens.toLocaleString()}</td>
                  <td className="py-1.5 pr-3 text-right">{row.outputTokens.toLocaleString()}</td>
                  <td className="py-1.5 pr-3 text-right">${parseFloat(row.estimatedCostUsd).toFixed(6)}</td>
                  <td className="py-1.5 text-right">{row.durationMs}</td>
                </tr>
              ))}
              {recentRows.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-gray-400">No calls recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
