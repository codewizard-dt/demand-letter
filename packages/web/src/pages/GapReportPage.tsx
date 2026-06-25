import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface GapItem {
  fieldName: string;
  nullReason: string | null;
  acceptMissing: boolean;
}

interface GapReport {
  covered: number;
  total: number;
  gaps: GapItem[];
}

const PRIORITY_SLOTS = new Set(['demand_amount', 'general_damages_estimate', 'future_medical_estimate']);
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export default function GapReportPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<GapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fillValues, setFillValues] = useState<Record<string, string>>({});
  const [acceptMissing, setAcceptMissing] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/gap-report`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GapReport = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gap report');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const hasAnyAction = Object.values(fillValues).some(v => v.trim() !== '') ||
    Object.values(acceptMissing).some(Boolean);

  const handleSubmit = async () => {
    if (!jobId) return;
    setSubmitting(true);
    try {
      const fields = Object.entries(fillValues)
        .filter(([, v]) => v.trim() !== '')
        .map(([fieldName, value]) => ({ fieldName, value }));
      const acceptList = Object.entries(acceptMissing)
        .filter(([, checked]) => checked)
        .map(([fieldName]) => fieldName);

      const res = await fetch(`${API_BASE}/jobs/${jobId}/attorney-judgment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, acceptMissing: acceptList }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFillValues({});
      setAcceptMissing({});
      await fetchReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit judgment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!jobId) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/generate`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      navigate(`/jobs/${jobId}/output`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading gap report…</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>;
  if (!report) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Gap Report</h1>
      <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
        <strong>{report.covered} of {report.total}</strong> slots covered.
        {report.gaps.length === 0 && <span style={{ color: 'green' }}> All slots satisfied — ready to generate.</span>}
      </p>

      {report.gaps.length > 0 && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ccc' }}>Slot Name</th>
                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ccc' }}>Null Reason</th>
                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ccc' }}>Fill Value</th>
                <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ccc' }}>Accept Missing</th>
              </tr>
            </thead>
            <tbody>
              {report.gaps.map((gap) => {
                const isPriority = PRIORITY_SLOTS.has(gap.fieldName);
                return (
                  <tr key={gap.fieldName} style={{ background: isPriority ? '#fff8e1' : undefined }}>
                    <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: isPriority ? 'bold' : undefined }}>
                      {gap.fieldName}{isPriority && <span style={{ color: '#e65100', marginLeft: 4 }}>★</span>}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', color: '#666' }}>
                      {gap.nullReason ?? '—'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                      <input
                        type="text"
                        value={fillValues[gap.fieldName] ?? ''}
                        onChange={(e) => setFillValues(prev => ({ ...prev, [gap.fieldName]: e.target.value }))}
                        placeholder="Enter value…"
                        style={{ width: '100%', padding: '4px' }}
                        disabled={acceptMissing[gap.fieldName]}
                      />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'center' }}>
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
            style={{ marginRight: '1rem', padding: '8px 16px', cursor: hasAnyAction && !submitting ? 'pointer' : 'not-allowed' }}
          >
            {submitting ? 'Submitting…' : 'Submit Attorney Judgment'}
          </button>
        </>
      )}

      <button
        onClick={handleGenerate}
        disabled={report.gaps.length > 0 || generating}
        style={{ padding: '8px 16px', cursor: report.gaps.length === 0 && !generating ? 'pointer' : 'not-allowed' }}
      >
        {generating ? 'Generating…' : 'Proceed to Generate'}
      </button>
    </div>
  );
}
