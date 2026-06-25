export interface LlmCostAggregate {
  feature: string;
  _count: { id: number };
  _sum: { inputTokens: number | null; outputTokens: number | null; estimatedCostUsd: string | null };
}

export interface LlmAuditRow {
  id: string;
  userId: string;
  feature: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: string;
  durationMs: number;
  createdAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function fetchLlmCosts(days = 30): Promise<{
  aggregates: LlmCostAggregate[];
  recentRows: LlmAuditRow[];
}> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/llm-costs?days=${days}`);
  if (!res.ok) throw new Error(`llm-costs fetch failed: ${res.status}`);
  return res.json();
}

export async function generateJob(jobId: string, onChunk: (text: string) => void): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/generate`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/generate failed: ${res.status}`);
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

export async function downloadOutput(jobId: string): Promise<Blob | null> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/output`);
  if (res.status === 202) return null; // still processing
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/output failed: ${res.status}`);
  return res.blob();
}

export async function createJob(): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (!res.ok) throw new Error(`POST /jobs failed: ${res.status}`);
  return res.json();
}

export async function uploadFile(jobId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/jobs/${jobId}/files`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/files failed: ${res.status}`);
}

export type Zone = {
  id: string;
  zoneIndex: number;
  textContent: string;
  type: 'boilerplate_verbatim' | 'variable_populated' | null;
  suggestedFieldName: string | null;
  confirmed: boolean;
};

export async function getTemplateZones(jobId: string, templateId: string): Promise<Zone[]> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/${templateId}/zones`);
  if (!res.ok) throw new Error(`Failed to fetch zones: ${res.status}`);
  return res.json() as Promise<Zone[]>;
}

export async function patchTemplateZones(
  jobId: string,
  templateId: string,
  zones: Array<{ id: string; type: string | null; suggestedFieldName: string | null; confirmed: boolean }>,
) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/${templateId}/zones`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zones }),
  });
  if (!res.ok) throw new Error(`Failed to patch zones: ${res.status}`);
  return res.json();
}
