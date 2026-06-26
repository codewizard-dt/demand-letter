import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGapReport, useExtractedFields, useBlocks } from '../hooks/useJobQueries';
import { useSubmitAttorneyJudgment, useTriggerGenerateJob } from '../hooks/useJobMutations';

const PRIORITY_SLOTS = new Set<string>([]);


export default function GapReportPage() {
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

  if (gapReportQuery.isLoading) return <div style={{ padding: '2rem' }}>Loading gap report…</div>;
  if (gapReportQuery.isError) return <div style={{ padding: '2rem', color: 'red' }}>Error: {gapReportQuery.error.message}</div>;
  const report = gapReportQuery.data!;

  const handleBlockClick = (blockId: string) => {
    setActiveBlockId(blockId);
    const el = blockRefs.current[blockId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>
        {/* Left column: existing gap-report table + submit form */}
        <div style={{ maxWidth: '900px' }}>
          <h1>Gap Report</h1>
          <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            <strong>{report.covered} of {report.total}</strong> slots covered.
            {report.gaps.length === 0 && <span style={{ color: 'green' }}> All slots satisfied — ready to generate.</span>}
          </p>

          {mutationError && (
            <div style={{ color: 'red', marginBottom: '1rem' }}>{mutationError}</div>
          )}

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

        {/* Right column: citation sidebar */}
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', height: 'fit-content', maxHeight: '80vh', overflowY: 'auto', background: '#fafafa' }}>
          <h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 600 }}>Citation Sources</h3>
          {extractedFields.length === 0 && <p style={{ color: '#888', fontSize: '0.85rem' }}>No extracted fields yet.</p>}
          {extractedFields.map((field) => (
            <div key={field.fieldName} style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 500, color: '#333' }}>{field.fieldName}</div>
              {field.blockIds.length === 0 ? (
                <span style={{ color: '#999' }}>—</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                  {field.blockIds.map((bid) => (
                    <button
                      key={bid}
                      onClick={() => handleBlockClick(bid)}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        background: activeBlockId === bid ? '#2563eb' : '#e8eef8',
                        color: activeBlockId === bid ? '#fff' : '#2563eb',
                        border: '1px solid #93b4f0',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      {bid.slice(0, 8)}…
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
        <div style={{ marginTop: '2rem', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', maxHeight: '500px', overflowY: 'auto', background: '#fff' }}>
          <h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 600 }}>Source Document Preview</h3>
          {blocks.map((block) => (
            <div
              key={block.id}
              id={block.id}
              ref={(el) => { blockRefs.current[block.id] = el; }}
              style={{
                padding: '8px 12px',
                marginBottom: 8,
                borderRadius: 4,
                border: activeBlockId === block.id ? '2px solid #2563eb' : '1px solid #e8e8e8',
                background: activeBlockId === block.id ? '#eff6ff' : '#fafafa',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#999', marginBottom: 4 }}>
                [{block.type}] p.{block.page} · id: {block.id}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#222', whiteSpace: 'pre-wrap' }}>{block.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
