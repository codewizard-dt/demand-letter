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

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export interface OutputDocxPreview {
  html: string;
  stationaries: {
    slot: 'header' | 'footer';
    variant: 'default' | 'first' | 'even';
    text: string;
    imageDataUrl?: string;
    imageWidthPx?: number;
    imageHeightPx?: number;
  }[];
}

const looksLikeBase64 = (value: string): boolean => {
  const trimmed = value.replace(/\s/g, '');
  if (trimmed.length < 8 || trimmed.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/=]+$/.test(trimmed)) return false;
  return trimmed.startsWith('UEsDB');
};

async function readDocxResponse(res: Response): Promise<ArrayBuffer> {
  const contentType = res.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  const bytes = new Uint8Array(await res.arrayBuffer());

  if (contentType === 'application/json' || bytes[0] === '{'.charCodeAt(0)) {
    const text = new TextDecoder().decode(bytes);
    try {
      const body = JSON.parse(text) as { message?: string; error?: string };
      const message = body.message ?? body.error ?? 'An unexpected error occurred.';
      throw new Error(message);
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error('Received an invalid DOCX response payload.');
    }
  }

  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return bytes.buffer;
  }

  const asText = new TextDecoder().decode(bytes);
  if (looksLikeBase64(asText)) {
    const cleaned = asText.replace(/\s/g, '');
    const bin = atob(cleaned);
    const decoded = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      decoded[i] = bin.charCodeAt(i);
    }
    return decoded.buffer;
  }

  throw new Error('Unexpected response while fetching DOCX output.');
}

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
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Split on SSE block separator (\n\n); retain last potentially incomplete block
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const lines = block.split('\n');
      const eventLine = lines.find((l) => l.startsWith('event:'));
      const dataLine = lines.find((l) => l.startsWith('data:'));
      if (eventLine?.trim() === 'event: complete') {
        reader.cancel();
        return;
      }
      if (dataLine) {
        const text = dataLine.slice('data:'.length).trimStart();
        if (text) onChunk(text);
      }
    }
  }
}

export async function refineJob(
  jobId: string,
  instruction: string,
  scope: string | undefined,
  onChunk: (text: string) => void,
): Promise<{ afterText: string; refinementId: string }> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction, scope }),
  });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/refine failed: ${res.status}`);
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return { afterText: '', refinementId: '' };
  let buffer = '';
  const collected: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const lines = block.split('\n');
      const eventLine = lines.find((l) => l.startsWith('event:'));
      const dataLine = lines.find((l) => l.startsWith('data:'));
      if (eventLine?.trim() === 'event: complete') {
        let refinementId = '';
        if (dataLine) {
          try {
            const payload = JSON.parse(dataLine.slice('data:'.length).trimStart()) as { refinementId?: string };
            refinementId = payload.refinementId ?? '';
          } catch {
            // malformed complete payload — refinementId stays empty
          }
        }
        reader.cancel();
        return { afterText: collected.join(''), refinementId };
      }
      if (dataLine) {
        const text = dataLine.slice('data:'.length).trimStart();
        if (text) {
          collected.push(text);
          onChunk(text);
        }
      }
    }
  }
  return { afterText: collected.join(''), refinementId: '' };
}

export async function fetchOutputDocxByUrl(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`downloadOutputDocxByUrl failed: ${res.status}`);
  return readDocxResponse(res);
}

export async function fetchOutputDocxPreview(jobId: string): Promise<OutputDocxPreview> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/output/docx/preview`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; error?: string };
    const message = body.message ?? body.error ?? `GET /jobs/${jobId}/output/docx/preview failed: ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<OutputDocxPreview>;
}

export async function downloadOutput(jobId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/output/docx`);
  if (!res.ok) throw new Error(`downloadOutput failed: ${res.status}`);
  const bytes = await readDocxResponse(res);
  return new Blob([bytes], { type: DOCX_MIME });
}

export async function fetchOutputUrl(id: string): Promise<string> {
  const res = await fetch(`${API_BASE}/jobs/${id}/output`);
  if (!res.ok) throw new Error(`Failed to fetch output URL: ${res.status}`);
  const data = await res.json() as { url: string };
  return data.url;
}

export async function fetchOutputDocx(id: string): Promise<ArrayBuffer> {
  const res = await fetch(`${API_BASE}/jobs/${id}/output/docx`);
  if (!res.ok) throw new Error(`downloadOutputDocx failed: ${res.status}`);
  return readDocxResponse(res);
}

export interface GapItem {
  fieldName: string;
  nullReason: string | null;
  acceptMissing: boolean;
}

export interface GapReport {
  covered: number;
  total: number;
  gaps: GapItem[];
}

export async function fetchGapReport(jobId: string): Promise<GapReport> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/gap-report`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; message?: string };
    const err = new Error(body.message ?? `GET /jobs/${jobId}/gap-report failed: ${res.status}`);
    (err as unknown as Record<string, unknown>).code = body.error;
    throw err;
  }
  return res.json() as Promise<GapReport>;
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

export interface JobSummary {
  id: string;
  status: string;
  createdAt: string;
}

export async function fetchJobs(): Promise<JobSummary[]> {
  const res = await fetch(`${API_BASE}/jobs`);
  if (!res.ok) throw new Error(`GET /jobs failed: ${res.status}`);
  const data = await res.json() as { jobs: JobSummary[] };
  return data.jobs;
}

export async function exportDocx(id: string, doc: unknown): Promise<Blob> {
  const res = await fetch(`${API_BASE}/jobs/${id}/export/docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc }),
  });
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
  return res.blob();
}

export async function downloadExportDocx(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${id}/export/docx`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'demand-letter.docx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

export async function acceptRefinement(jobId: string, refinementId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/refine/${refinementId}/accept`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error(`PATCH /jobs/${jobId}/refine/${refinementId}/accept failed: ${res.status}`);
}

export async function rejectRefinement(jobId: string, refinementId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/refine/${refinementId}/reject`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error(`PATCH /jobs/${jobId}/refine/${refinementId}/reject failed: ${res.status}`);
}

export interface RefinementRow {
  id: string;
  instruction: string;
  scope: string;
  accepted: boolean;
  createdAt: string;
}

export async function fetchRefinements(jobId: string): Promise<RefinementRow[]> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/refinements`);
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/refinements failed: ${res.status}`);
  const data = (await res.json()) as { refinements: RefinementRow[] };
  return data.refinements;
}

/**
 * Fetches the raw API response text for a job's output.
 *
 * NOTE: GET /jobs/:id/output currently returns JSON { url: string } where
 * `url` is a presigned S3 URL pointing to a DOCX binary. This function calls
 * res.text() on the API response, so it returns the JSON string as-is
 * (e.g. '{"url":"https://..."}').  The EditorPage will need to handle this
 * by parsing the URL and performing a DOCX→HTML conversion before passing
 * content to TipTap.
 */
export async function fetchOutputText(id: string): Promise<string> {
  const res = await fetch(`${API_BASE}/jobs/${id}/output`);
  if (!res.ok) throw new Error(`Failed to fetch output: ${res.statusText}`);
  return res.text();
}

export interface ExtractedFieldRow {
  fieldName: string;
  value: string | null;
  blockIds: string[];
  confidence: number;
  isNull: boolean;
  source: string | null;
  nullReason: string | null;
  acceptMissing: boolean;
}

export async function fetchExtractedFields(jobId: string): Promise<ExtractedFieldRow[]> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/fields`);
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/fields failed: ${res.status}`);
  const data = await res.json() as { fields: ExtractedFieldRow[] };
  return data.fields;
}

export interface BlockRow {
  id: string;
  sourceFileId: string;
  type: string;
  text: string;
  page: number;
  bbox: unknown;
  confidence: number;
  createdAt: string;
}

export async function fetchBlocks(jobId: string, limit = 500): Promise<BlockRow[]> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/blocks?limit=${limit}&page=1`);
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/blocks failed: ${res.status}`);
  const data = await res.json() as { blocks: BlockRow[] };
  return data.blocks;
}

export interface ChangeRow {
  id: string;
  userId: string;
  userName: string;
  operationType: string;
  contentDelta: unknown;
  createdAt: string;
}

export async function fetchJobChanges(id: string): Promise<ChangeRow[]> {
  const res = await fetch(`${API_BASE}/jobs/${id}/changes`);
  if (!res.ok) throw new Error(`GET /jobs/${id}/changes failed: ${res.status}`);
  const data = await res.json() as { changes: ChangeRow[] };
  return data.changes;
}

export async function deleteJobChange(jobId: string, changeId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/changes/${changeId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`DELETE /jobs/${jobId}/changes/${changeId} failed: ${res.status}`);
}

export async function submitAttorneyJudgment(
  jobId: string,
  fields: Array<{ fieldName: string; value: string }>,
  acceptMissing: string[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/attorney-judgment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields, acceptMissing }),
  });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/attorney-judgment failed: ${res.status}`);
}

export interface IngestResponse {
  processed: number;
  pending: number;
  blocks: number;
}

export async function ingestDocuments(jobId: string): Promise<IngestResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/documents/ingest`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/documents/ingest failed: ${res.status}`);

  const data = await res.json().catch(() => ({})) as Partial<IngestResponse>;
  return {
    processed: typeof data.processed === 'number' ? data.processed : 0,
    pending: typeof data.pending === 'number' ? data.pending : 0,
    blocks: typeof data.blocks === 'number' ? data.blocks : 0,
  };
}

export async function segmentTemplate(jobId: string): Promise<{ templateId: string; slotCount: number }> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/segment`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/templates/segment failed: ${res.status}`);
  return res.json() as Promise<{ templateId: string; slotCount: number }>;
}

export async function classifyTemplate(jobId: string, templateId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/${templateId}/classify`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/templates/${templateId}/classify failed: ${res.status}`);
}

export async function injectTemplate(jobId: string, templateId: string): Promise<{ slotCount: number }> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/${templateId}/inject`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/templates/${templateId}/inject failed: ${res.status}`);
  return res.json() as Promise<{ slotCount: number }>;
}

export async function extractFields(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/extract`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/extract failed: ${res.status}`);
}

export interface FileRow {
  id: string;
  fileName: string;
  mimeType: string;
  role: string;
  contentHash: string | null;
  s3Key: string;
  createdAt: string;
}

export async function fetchJobFiles(jobId: string): Promise<FileRow[]> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/files`);
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/files failed: ${res.status}`);
  const data = await res.json() as { files: FileRow[] };
  return data.files;
}

export interface JobLogRow {
  id: string;
  level: string;
  handler: string;
  message: string;
  stack?: string;
  context: unknown;
  createdAt: string;
}

export async function fetchJobLogs(jobId: string): Promise<JobLogRow[]> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/logs`);
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/logs failed: ${res.status}`);
  const data = await res.json() as { logs: JobLogRow[] };
  return data.logs;
}

export async function triggerGenerateJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/generate`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  res.body?.cancel();
}
