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

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

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
  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
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
  const data = await res.json() as { aggregates?: LlmCostAggregate[]; recentRows?: LlmAuditRow[] };
  return {
    aggregates: asArray(data.aggregates),
    recentRows: asArray(data.recentRows),
  };
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
      if (eventLine?.trim() === 'event: error') {
        const fallback = 'Refinement failed.';
        if (!dataLine) throw new Error(fallback);
        try {
          const payload = JSON.parse(dataLine.slice('data:'.length).trimStart()) as { message?: string };
          throw new Error(payload.message ?? fallback);
        } catch (err) {
          if (err instanceof Error) throw err;
          throw new Error(fallback);
        }
      }
      if (dataLine) {
        const raw = dataLine.slice('data:'.length).trimStart();
        let text = raw;
        try {
          const payload = JSON.parse(raw) as { type?: string; text?: string };
          text = payload.type === 'chunk' ? (payload.text ?? '') : '';
        } catch {
          // Backward compatibility with old raw text SSE chunks.
        }
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

export interface JobFile {
  fileName: string;
  mimeType: string;
  role: string;
}

export interface JobSummary {
  id: string;
  status: string;
  createdAt: string;
  files: JobFile[];
}

export async function fetchFiles(): Promise<(JobFile & { jobId: string; createdAt: string })[]> {
  const jobs = await fetchJobs();
  return jobs.flatMap((job) =>
    job.files.map((file) => ({ ...file, jobId: job.id, createdAt: job.createdAt })),
  );
}

export async function fetchJobs(): Promise<JobSummary[]> {
  const res = await fetch(`${API_BASE}/jobs`);
  if (!res.ok) throw new Error(`GET /jobs failed: ${res.status}`);
  const data = await res.json() as { jobs?: (Omit<JobSummary, 'files'> & { files?: JobFile[] })[] };
  return asArray(data.jobs).map((job) => ({
    ...job,
    files: asArray(job.files),
  }));
}

export async function saveEditorContent(jobId: string, doc: unknown): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/editor/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc }),
  });
  if (!res.ok) throw new Error(`Failed to save editor content: ${res.status}`);
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

export interface Zone {
  id: string;
  zoneIndex: number;
  textContent: string;
  runPath?: {
    paragraph?: {
      style?: string;
      alignment?: 'left' | 'center' | 'right' | 'both';
    };
    source?: {
      part: 'header' | 'body' | 'footer';
      path: string;
      variant?: 'default' | 'first' | 'even';
    };
    images?: {
      relId: string;
      target: string;
      dataUrl: string;
    }[];
    runs?: {
      runIndex: number;
      text: string;
      bold: boolean;
      italic: boolean;
      underline: boolean;
      font?: string;
      fontSize?: number;
      hasImage?: boolean;
      images?: {
        relId: string;
        target: string;
        dataUrl: string;
      }[];
    }[];
  };
  type: 'boilerplate_verbatim' | 'variable_populated' | null;
  suggestedFieldName: string | null;
  templateText?: string | null;
  confirmed: boolean;
  part?: 'header' | 'body' | 'footer';
  stationaryVariant?: string;
}

export async function getTemplateZones(jobId: string, templateId: string): Promise<Zone[]> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/${templateId}/zones`);
  if (!res.ok) throw new Error(`Failed to fetch zones: ${res.status}`);
  const data = await res.json() as Zone[] | { zones?: Zone[] };
  return Array.isArray(data) ? data : asArray(data.zones);
}

export async function fetchTemplateOriginalDocx(jobId: string, templateId: string): Promise<ArrayBuffer> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/${templateId}/original.docx`);
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/templates/${templateId}/original.docx failed: ${res.status}`);
  return readDocxResponse(res);
}

export async function fetchTemplateOriginalPreview(jobId: string, templateId: string): Promise<OutputDocxPreview> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/${templateId}/original/preview`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; error?: string };
    const message = body.message ?? body.error ?? `GET /jobs/${jobId}/templates/${templateId}/original/preview failed: ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<OutputDocxPreview>;
}

export async function patchTemplateZones(
  jobId: string,
  templateId: string,
  zones: { id: string; type: string | null; textContent?: string; suggestedFieldName: string | null; templateText?: string | null; confirmed: boolean }[],
  removeZoneIds: string[] = [],
) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/${templateId}/zones`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zones, removeZoneIds }),
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
  const data = (await res.json()) as { refinements?: RefinementRow[] };
  return asArray(data.refinements);
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
  const data = await res.json() as { fields?: ExtractedFieldRow[] };
  return asArray(data.fields);
}

export interface BlockRow {
  id: string;
  sourceFileId: string;
  sourceFile?: { s3Key: string };
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
  const data = await res.json() as { blocks?: BlockRow[] };
  return asArray(data.blocks);
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
  const data = await res.json() as { changes?: ChangeRow[] };
  return asArray(data.changes);
}

export async function deleteJobChange(jobId: string, changeId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/changes/${changeId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`DELETE /jobs/${jobId}/changes/${changeId} failed: ${res.status}`);
}

export async function saveValues(
  jobId: string,
  fields: { fieldName: string; value: string }[],
  acceptMissing: string[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/save-values`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields, acceptMissing }),
  });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/save-values failed: ${res.status}`);
}

export interface IngestResponse {
  processed: number;
  pending: number;
  blocks: number;
}

export async function ingestDocuments(jobId: string, options?: { force?: boolean; fileId?: string }): Promise<IngestResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/documents/ingest`, {
    method: 'POST',
    ...(options ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options) } : {}),
  });
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

export async function injectTemplate(
  jobId: string,
  templateId: string,
  options?: { confirmed?: boolean },
): Promise<{ slotCount: number }> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/${templateId}/inject`, {
    method: 'POST',
    ...(options ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options) } : {}),
  });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/templates/${templateId}/inject failed: ${res.status}`);
  return res.json() as Promise<{ slotCount: number }>;
}

export async function replaceTemplateImage(
  jobId: string,
  templateId: string,
  target: string,
  file: File,
): Promise<void> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(
    `${API_BASE}/jobs/${jobId}/templates/${templateId}/images/replace?target=${encodeURIComponent(target)}`,
    { method: 'POST', body: form },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; error?: string };
    throw new Error(body.message ?? body.error ?? `Image replace failed: ${res.status}`);
  }
}

export interface OutputBodyImage {
  target: string;
  dataUrl: string;
}

export async function fetchOutputImages(jobId: string): Promise<OutputBodyImage[]> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/output/images`);
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/output/images failed: ${res.status}`);
  const data = await res.json() as { images?: OutputBodyImage[] };
  return asArray(data.images);
}

export async function replaceOutputImage(jobId: string, target: string, file: File): Promise<void> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(
    `${API_BASE}/jobs/${jobId}/output/images/replace?target=${encodeURIComponent(target)}`,
    { method: 'POST', body: form },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; error?: string };
    throw new Error(body.message ?? body.error ?? `Image replace failed: ${res.status}`);
  }
}

export async function addOutputImage(jobId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${API_BASE}/jobs/${jobId}/output/images/add`, { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; error?: string };
    throw new Error(body.message ?? body.error ?? `Image add failed: ${res.status}`);
  }
}

export interface LatestTemplate {
  templateId: string;
  slotCount: number | null;
  ingestedAt: string;
}

export async function fetchLatestTemplate(jobId: string): Promise<LatestTemplate> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/latest`);
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/templates/latest failed: ${res.status}`);
  return res.json() as Promise<LatestTemplate>;
}

export interface TemplateSlotRow {
  slotName: string;
  required: boolean;
  defaultValue?: string | null;
}

export async function fetchTemplateSlots(jobId: string, templateId: string): Promise<TemplateSlotRow[]> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/${templateId}/slots`);
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/templates/${templateId}/slots failed: ${res.status}`);
  const data = await res.json() as { slots?: TemplateSlotRow[] };
  return asArray(data.slots);
}

export async function extractFields(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/extract`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/extract failed: ${res.status}`);
  await waitForOptionalStream(() => connectExtractStream(jobId, () => {}));
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
  const data = await res.json() as { files?: FileRow[] };
  return asArray(data.files);
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
  const data = await res.json() as { logs?: JobLogRow[] };
  return asArray(data.logs);
}

export async function triggerGenerateJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/generate`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  res.body?.cancel();
}

export async function fetchJob(jobId: string): Promise<{ id: string; status: string; outputS3Key: string | null }> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error(`GET /jobs/${jobId} failed: ${res.status}`);
  return res.json() as Promise<{ id: string; status: string; outputS3Key: string | null }>;
}

export type GenerateStreamEvent =
  | { type: 'progress'; message: string }
  | { type: 'zone'; zoneIndex: number; content: string }
  | { type: 'zone-chunk'; zoneIndex: number; chunk: string }
  | { type: 'complete' }
  | { type: 'error'; message: string };

export type ExtractStreamEvent =
  | { type: 'progress'; message: string }
  | { type: 'complete'; jobId: string; totalFields: number; filledFields: number; nullFields: number }
  | { type: 'error'; message: string };

export type TemplateClassificationStreamEvent =
  | { type: 'progress'; message: string }
  | { type: 'complete'; jobId: string; templateId: string; zoneCount: number }
  | { type: 'error'; message: string };

async function connectEventStream<T extends { type: string }>(
  url: string,
  onEvent: (event: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, { ...(signal ? { signal } : {}) });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      if (block.startsWith(':')) continue; // SSE keep-alive ping
      const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      try {
        const event = JSON.parse(dataLine.slice(5).trimStart()) as T;
        onEvent(event);
        if (event.type === 'complete' || event.type === 'error') {
          reader.cancel();
          return;
        }
      } catch {
        // ignore malformed SSE events
      }
    }
  }
}

async function waitForOptionalStream(connect: () => Promise<void>): Promise<void> {
  try {
    await connect();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // API Gateway REST APIs return 403 "Missing Authentication Token" when an
    // optional stream route is not deployed.
    if (/\bfailed:\s*(403|404|405)\b/.test(message)) return;
    throw err;
  }
}

export async function connectGenerateStream(
  jobId: string,
  onEvent: (event: GenerateStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  await connectEventStream(`${API_BASE}/jobs/${jobId}/generate/stream`, onEvent, signal);
}

export async function connectExtractStream(
  jobId: string,
  onEvent: (event: ExtractStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  await connectEventStream(`${API_BASE}/jobs/${jobId}/extract/stream`, onEvent, signal);
}

export async function connectTemplateClassificationStream(
  jobId: string,
  templateId: string,
  onEvent: (event: TemplateClassificationStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  await connectEventStream(`${API_BASE}/jobs/${jobId}/templates/${templateId}/classify/stream`, onEvent, signal);
}
