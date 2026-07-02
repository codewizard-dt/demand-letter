// Golden-set eval runner.
//
// Two layers run per case:
//   1. SCHEMA validation — every case is checked for required fields / shape.
//   2. BEHAVIORAL assertion — cases with a real adapter in ADAPTERS below are
//      executed against the ACTUAL system function (no mocks) and their output
//      is checked against must_contain / must_not_contain.
//
// Cases without an adapter are reported as `mode: "schema-only"` and are NOT
// claimed to be behaviorally verified. Only genuinely pure, in-memory functions
// (no DB, no Bedrock, no network) are wired here; the live-model, Prisma-backed,
// and HTTP-handler cases remain schema-only pending their own integration tiers.

import { parse } from 'yaml';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

// ── Real system under test (pure, in-memory functions only) ───────────────────
import { estimateCostUsd } from '../app/server/src/lib/ai';
import { redactText } from '../app/server/src/lib/redact-text';
import { mergeEntities } from '../app/server/src/lib/merge-entities';
import { detectDocumentType } from '../app/server/src/lib/document-type-detector';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface EvalCase {
  id: string;
  description: string;
  query: string;
  tested_files: string[];
  expected_tools: string[];
  must_contain: string[];
  must_not_contain: string[];
}

interface CheckResult {
  schema_valid: 'pass' | 'fail';
  must_contain: 'pass' | 'fail' | 'n/a';
  must_not_contain: 'pass' | 'fail' | 'n/a';
}

interface CaseResult {
  case_id: string;
  stage: 'golden';
  status: 'PASS' | 'FAIL' | 'ERROR' | 'SKIP';
  mode: 'live' | 'live-model' | 'schema-only';
  checks: CheckResult;
  failure_detail?: string;
}

const REQUIRED_FIELDS = [
  'id', 'description', 'query', 'tested_files',
  'expected_tools', 'must_contain', 'must_not_contain',
] as const;

// ── Adapters: map a case id → a call into the REAL function under test ─────────
// Each adapter returns the exact output string that must_contain / must_not_contain
// are evaluated against. Inputs mirror each case's `query` verbatim.

type Adapter = () => string | Promise<string>;

/** Build a minimal, structurally valid PDF whose single page has no text layer,
 *  so detectDocumentType exercises its real pdf-parse path and returns 'pdf-scanned'. */
function buildEmptyTextPdf(): Buffer {
  const header = '%PDF-1.4\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>',
  ];
  let body = header;
  const offsets: number[] = [];
  objects.forEach((content, i) => {
    offsets.push(Buffer.byteLength(body, 'latin1'));
    body += `${i + 1} 0 obj\n${content}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(body, 'latin1');
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, 'latin1');
}

const ADAPTERS: Record<string, Adapter> = {
  // detectDocumentType — extension-only branch and empty-text-layer branch
  'gs-016': async () =>
    JSON.stringify(await detectDocumentType(Buffer.from('arbitrary bytes'), 'medical_records.docx')),
  'gs-017': async () =>
    JSON.stringify(await detectDocumentType(buildEmptyTextPdf(), 'police_report.pdf')),

  // redactText — token replacement, catch-all fallback, empty-entities no-op
  'gs-028': () =>
    redactText('Patient John Doe was admitted on 01/15/2024.', [
      { type: 'PATIENT', startOffset: 8, endOffset: 16 },
    ]),
  'gs-029': () =>
    redactText('Call us at 555-867-5309 for follow-up.', [
      { type: 'UNKNOWN_ENTITY_TYPE', startOffset: 10, endOffset: 21 },
    ]),
  'gs-033': () => redactText('No PHI present in this block.', []),

  // mergeEntities — overlap dedup keeps higher confidence; non-overlap keeps both
  'gs-030': () =>
    JSON.stringify(
      mergeEntities(
        [{ type: 'PATIENT', startOffset: 0, endOffset: 8, confidence: 0.95 }],
        [{ type: 'PERSON', startOffset: 1, endOffset: 8, confidence: 0.72 }],
      ),
      null,
      2,
    ),
  'gs-034': () =>
    JSON.stringify(
      mergeEntities(
        [{ type: 'PATIENT', startOffset: 0, endOffset: 8, confidence: 0.95 }],
        [{ type: 'SSN', startOffset: 20, endOffset: 31, confidence: 0.99 }],
      ),
      null,
      2,
    ),

  // estimateCostUsd — unknown model degrades to 0; known models price correctly
  'gs-035': () => String(estimateCostUsd('openai.gpt-4-unknown', 1_000_000, 500_000)),
  'gs-036': () => String(estimateCostUsd('us.anthropic.claude-haiku-4-5-20251001-v1:0', 1_000_000, 1_000_000)),
  'gs-037': () => String(estimateCostUsd('anthropic.claude-opus-4-8', 1_000_000, 1_000_000)),
};

// ── Live model (Bedrock) tier ─────────────────────────────────────────────────
// Zone-classification cases that call REAL Bedrock via classifyZones(). Gated
// behind EVAL_LIVE_MODEL because they cost money, need AWS credentials, and require
// network access. classifyZones imports @demand-letter/db (Prisma is constructed
// but never queried here), so it is loaded lazily only when the gate is on — the
// default `pnpm evals` run never touches Prisma or AWS.

const LIVE_MODEL = /^(1|true|yes|on)$/i.test(process.env.EVAL_LIVE_MODEL ?? '');

type Zone = { zoneIndex: number; textContent: string };
let classifyZonesFn: ((zones: Zone[], userId: string) => Promise<unknown>) | null = null;

async function classify(zones: Zone[]): Promise<string> {
  if (!classifyZonesFn) {
    const mod = await import('../app/server/src/lib/zone-classifier');
    classifyZonesFn = mod.classifyZones as unknown as typeof classifyZonesFn;
  }
  return JSON.stringify(await classifyZonesFn!(zones, 'eval-user'), null, 2);
}

const MODEL_ADAPTERS: Record<string, () => Promise<string>> = {
  'gs-001': () => classify([{ zoneIndex: 0, textContent: 'Pursuant to California Code of Civil Procedure Section 999, this letter constitutes a written offer to settle the above-referenced personal injury claim.' }]),
  'gs-002': () => classify([{ zoneIndex: 3, textContent: '[CLIENT FULL NAME]' }]),
  'gs-003': () => classify([
    { zoneIndex: 0, textContent: 'Re: Claim No. [CLAIM NUMBER]' },
    { zoneIndex: 1, textContent: 'Dear [ADJUSTER NAME],' },
    { zoneIndex: 2, textContent: 'This firm represents the claimant in the above-referenced matter.' },
  ]),
  'gs-004': () => classify([{ zoneIndex: 7, textContent: '[DATE OF INCIDENT]' }]),
  'gs-005': () => classify([{ zoneIndex: 12, textContent: 'The total medical specials incurred to date amount to $47,832.00.' }]),
  'gs-006': () => classify([{ zoneIndex: 18, textContent: '[$DEMAND_AMOUNT]' }]),
  'gs-007': () => classify([{ zoneIndex: 21, textContent: 'We hereby demand the policy limits of [POLICY LIMITS AMOUNT].' }]),
  'gs-008': () => classify([{ zoneIndex: 1, textContent: 'Re: Claim No. [CLAIM NUMBER] / [INSURED NAME]' }]),
  'gs-009': () => classify([{ zoneIndex: 44, textContent: '[ATTORNEY NAME], Esq.' }]),
  'gs-010': () => classify([{ zoneIndex: 5, textContent: 'Dear [ADJUSTER NAME]:' }]),
};

// ── Live DB / handler (Postgres) tier ─────────────────────────────────────────
// Cases that seed the dedicated `demand_letter_test` database, invoke the REAL
// Prisma-backed function or Lambda handler, assert on the response and/or the
// resulting rows, then clean up (job delete cascades). Gated behind EVAL_LIVE_DB.
//
// SAFETY: when enabled, DATABASE_URL is forced onto the *_test database (name
// swapped, or DATABASE_URL_TEST if set) BEFORE Prisma loads, and the runner
// refuses to start if the resolved database name does not contain "test". The
// default run never imports Prisma or touches any database.

const LIVE_DB = /^(1|true|yes|on)$/i.test(process.env.EVAL_LIVE_DB ?? '');

function resolveTestDbUrl(): string {
  const explicit = process.env.DATABASE_URL_TEST;
  if (explicit) return explicit;
  const dev = process.env.DATABASE_URL;
  if (!dev) throw new Error('DATABASE_URL is not set — cannot derive the test database URL');
  return dev.replace(/\/([^/?#]+)(\?.*)?$/, '/demand_letter_test$2');
}

// Force Prisma onto the test DB whenever ANY live tier runs. The DB tier needs it
// for its own queries; the MODEL tier needs it too because invokeModel() writes a
// fire-and-forget LlmAuditLog row per call — without this it would pollute whatever
// DATABASE_URL points at (e.g. the dev DB). Redirecting to *_test keeps every
// incidental write off dev/prod. (LlmAuditLog writes are best-effort and .catch()ed,
// so the model tier still works if the test DB is absent.)
if (LIVE_DB || (LIVE_MODEL && process.env.DATABASE_URL)) {
  const testUrl = resolveTestDbUrl();
  const dbName = new URL(testUrl).pathname;
  if (!/test/i.test(dbName)) {
    throw new Error(
      `Refusing to run live evals against a non-test database (${dbName}). ` +
      `Point DATABASE_URL_TEST at a *_test database.`,
    );
  }
  process.env.DATABASE_URL = testUrl; // force every Prisma query in this process onto the test DB
}

// Lazily-loaded Prisma singleton (constructed only when the DB tier actually runs).
// Imported by its resolved path — `@demand-letter/db` is a pnpm workspace package
// only symlinked into app/server/node_modules, so a bare specifier does not resolve
// from evals/. This path realpaths to the same module the handlers import, so the
// Prisma client is a single shared instance.
let prismaClient: Awaited<ReturnType<typeof loadPrisma>> | null = null;
async function loadPrisma() {
  const mod = await import('../app/db/dist/index.js');
  return mod.prisma;
}
async function db() {
  if (!prismaClient) prismaClient = await loadPrisma();
  return prismaClient;
}

const lambdaCtx = {} as never;
const noop = () => {};
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
type LambdaEvent = {
  pathParameters?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
  queryStringParameters?: Record<string, string>;
  requestContext?: { requestId?: string };
};
type LambdaResult = { statusCode?: number; headers?: unknown; body?: string };

const DB_ADAPTERS: Record<string, () => Promise<string>> = {
  // computeGapReport — direct Prisma-backed function
  'gs-018': async () => {
    const p = await db();
    const { computeGapReport } = await import('../app/server/src/lib/sufficiency-gate');
    const job = await p.job.create({ data: {} });
    try {
      const tpl = await p.template.create({ data: { jobId: job.id, s3KeyOriginal: 'seed' } });
      for (const name of ['claimant_name', 'demand_amount', 'letter_date']) {
        await p.templateSlot.create({ data: { templateId: tpl.id, slotName: name } });
        await p.extractedField.create({ data: { jobId: job.id, fieldName: name, value: 'seed', confidence: 0.95, isNull: false } });
      }
      return JSON.stringify(await computeGapReport(job.id), null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },
  'gs-019': async () => {
    const p = await db();
    const { computeGapReport } = await import('../app/server/src/lib/sufficiency-gate');
    const job = await p.job.create({ data: {} });
    try {
      const tpl = await p.template.create({ data: { jobId: job.id, s3KeyOriginal: 'seed' } });
      await p.templateSlot.create({ data: { templateId: tpl.id, slotName: 'claimant_name' } });
      await p.templateSlot.create({ data: { templateId: tpl.id, slotName: 'incident_date' } });
      await p.extractedField.create({ data: { jobId: job.id, fieldName: 'claimant_name', value: 'Jane Smith', confidence: 0.95, isNull: false } });
      // incident_date present but below the 0.80 sufficiency threshold → surfaces as a gap
      await p.extractedField.create({ data: { jobId: job.id, fieldName: 'incident_date', value: null, confidence: 0.5, isNull: false } });
      return JSON.stringify(await computeGapReport(job.id), null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },
  'gs-020': async () => {
    const p = await db();
    const { computeGapReport } = await import('../app/server/src/lib/sufficiency-gate');
    const job = await p.job.create({ data: {} });
    try {
      const tpl = await p.template.create({ data: { jobId: job.id, s3KeyOriginal: 'seed' } });
      await p.templateSlot.create({ data: { templateId: tpl.id, slotName: 'return_to_work_date' } });
      // isNull but acceptMissing=true → excluded from gaps
      await p.extractedField.create({ data: { jobId: job.id, fieldName: 'return_to_work_date', value: null, isNull: true, acceptMissing: true, nullReason: 'not applicable' } });
      return JSON.stringify(await computeGapReport(job.id), null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },

  // buildDataObject — direct Prisma-backed function
  'gs-023': async () => {
    const p = await db();
    const { buildDataObject } = await import('../app/server/src/lib/generation-data-builder');
    const job = await p.job.create({ data: {} });
    try {
      await p.extractedField.create({ data: { jobId: job.id, fieldName: 'claimant_name', value: 'Jane Smith', confidence: 0.95, isNull: false } });
      return JSON.stringify(await buildDataObject(job.id), null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },
  'gs-025': async () => {
    const p = await db();
    const { buildDataObject } = await import('../app/server/src/lib/generation-data-builder');
    const job = await p.job.create({ data: {} });
    try {
      await p.extractedField.create({ data: { jobId: job.id, fieldName: 'per_provider_line_items', value: '[{"provider":"City Hospital","amount":"$12,000.00"}]', confidence: 0.9, isNull: false } });
      return JSON.stringify(await buildDataObject(job.id), null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },

  // Lambda handlers — invoke the real handler, then read back the affected rows
  // (assertions check row state such as confidence/source, which is not in the response body)
  'gs-051': async () => {
    const p = await db();
    const { handler } = await import('../app/server/src/handlers/post-jobs-save-values');
    const job = await p.job.create({ data: {} });
    try {
      const res = (await handler({ pathParameters: { id: job.id }, headers: {}, body: JSON.stringify({ fields: [{ fieldName: 'claimant_name', value: 'Jane Smith' }] }) } as LambdaEvent, lambdaCtx, noop)) as LambdaResult;
      const field = await p.extractedField.findUnique({ where: { jobId_fieldName: { jobId: job.id, fieldName: 'claimant_name' } } });
      return JSON.stringify({ statusCode: res.statusCode, response: JSON.parse(res.body ?? '{}'), field }, null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },
  'gs-052': async () => {
    const p = await db();
    const { handler } = await import('../app/server/src/handlers/post-jobs-save-values');
    const job = await p.job.create({ data: {} });
    try {
      const res = (await handler({ pathParameters: { id: job.id }, headers: {}, body: JSON.stringify({ acceptMissing: ['attorney_name'] }) } as LambdaEvent, lambdaCtx, noop)) as LambdaResult;
      const field = await p.extractedField.findUnique({ where: { jobId_fieldName: { jobId: job.id, fieldName: 'attorney_name' } } });
      return JSON.stringify({ statusCode: res.statusCode, response: JSON.parse(res.body ?? '{}'), field }, null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },
  'gs-053': async () => {
    const p = await db();
    const { handler } = await import('../app/server/src/handlers/get-jobs-gap-report');
    // Job exists but has no Template → handler returns 404 template_not_ready
    const job = await p.job.create({ data: {} });
    try {
      const res = (await handler({ pathParameters: { id: job.id }, headers: {} } as LambdaEvent, lambdaCtx, noop)) as LambdaResult;
      return JSON.stringify({ statusCode: res.statusCode, body: JSON.parse(res.body ?? '{}') }, null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },

  // post-jobs-refine — 400 missing_instruction (validation before job lookup / model)
  'gs-038': async () => {
    const p = await db();
    const { handler } = await import('../app/server/src/handlers/post-jobs-refine');
    const job = await p.job.create({ data: {} });
    try {
      const res = (await handler({ pathParameters: { id: job.id }, headers: {}, requestContext: { requestId: 'eval' }, body: JSON.stringify({}) } as LambdaEvent, lambdaCtx, noop)) as LambdaResult;
      return JSON.stringify({ statusCode: res.statusCode, body: JSON.parse(res.body ?? '{}') }, null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },

  // patch-jobs-refine-reject — marks accepted=false, does NOT touch job.output
  'gs-040': async () => {
    const p = await db();
    const { handler } = await import('../app/server/src/handlers/patch-jobs-refine-reject');
    const job = await p.job.create({ data: { output: 'original letter text' } });
    try {
      const ref = await p.refinement.create({ data: { jobId: job.id, instruction: 'tighten', scope: 'all', beforeText: 'original letter text', afterText: 'revised letter text', accepted: false } });
      const res = (await handler({ pathParameters: { id: job.id, refinement_id: ref.id }, headers: {} } as LambdaEvent, lambdaCtx, noop)) as LambdaResult;
      const updated = await p.job.findUnique({ where: { id: job.id }, select: { output: true } });
      const updatedRef = await p.refinement.findUnique({ where: { id: ref.id }, select: { accepted: true } });
      return JSON.stringify({ statusCode: res.statusCode, response: JSON.parse(res.body ?? '{}'), job: { output: updated?.output }, refinementAccepted: updatedRef?.accepted }, null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },

  // get-jobs-export-docx — 422 output_not_ready when job has no output
  'gs-043': async () => {
    const p = await db();
    const { handler } = await import('../app/server/src/handlers/get-jobs-export-docx');
    const job = await p.job.create({ data: {} }); // output is null
    try {
      const res = (await handler({ pathParameters: { id: job.id }, headers: {} } as LambdaEvent, lambdaCtx, noop)) as LambdaResult;
      return JSON.stringify({ statusCode: res.statusCode, body: JSON.parse(res.body ?? '{}') }, null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },

  // post-jobs-generate — 400 sufficiency_precheck_failed (fires before S3/model)
  'gs-044': async () => {
    const p = await db();
    const { handler } = await import('../app/server/src/handlers/post-jobs-generate');
    const job = await p.job.create({ data: {} });
    try {
      await p.file.create({ data: { jobId: job.id, s3Key: 'seed', mimeType: DOCX_MIME, role: 'template', fileName: 'template.docx' } });
      const tpl = await p.template.create({ data: { jobId: job.id, s3KeyOriginal: 'seed' } });
      await p.templateSlot.create({ data: { templateId: tpl.id, slotName: 'date_of_loss' } }); // no covering field → gap
      const res = (await handler({ pathParameters: { id: job.id }, headers: {}, requestContext: { requestId: 'eval' } } as LambdaEvent, lambdaCtx, noop)) as LambdaResult;
      const after = await p.job.findUnique({ where: { id: job.id }, select: { status: true } });
      return JSON.stringify({ statusCode: res.statusCode, body: JSON.parse(res.body ?? '{}'), jobStatus: after?.status }, null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },

  // get-admin-llm-costs — aggregates + recentRows (LlmAuditLog is not job-linked)
  'gs-045': async () => {
    const p = await db();
    const { handler } = await import('../app/server/src/handlers/get-admin-llm-costs');
    const created: string[] = [];
    try {
      const row = await p.llmAuditLog.create({ data: { userId: 'eval', feature: 'zone_classification', model: 'claude-haiku-4-5', provider: 'bedrock', status: 'success', inputTokens: 100, outputTokens: 50, estimatedCostUsd: 0.001, durationMs: 200 } });
      created.push(row.id);
      const res = (await handler({ headers: {}, queryStringParameters: { days: '30' } } as LambdaEvent, lambdaCtx, noop)) as LambdaResult;
      return JSON.stringify({ statusCode: res.statusCode, body: JSON.parse(res.body ?? '{}') }, null, 2);
    } finally {
      for (const id of created) await p.llmAuditLog.delete({ where: { id } }).catch(() => {});
    }
  },

  // get-jobs-refinements — history list WITHOUT beforeText/afterText
  'gs-046': async () => {
    const p = await db();
    const { handler } = await import('../app/server/src/handlers/get-jobs-refinements');
    const job = await p.job.create({ data: {} });
    try {
      await p.refinement.create({ data: { jobId: job.id, instruction: 'tighten the intro', scope: 'all', beforeText: 'before', afterText: 'after', accepted: false } });
      const res = (await handler({ pathParameters: { id: job.id }, headers: {} } as LambdaEvent, lambdaCtx, noop)) as LambdaResult;
      return JSON.stringify({ statusCode: res.statusCode, body: JSON.parse(res.body ?? '{}') }, null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },

  // delete-jobs-changes — 403 change_job_mismatch for a cross-job delete
  'gs-047': async () => {
    const p = await db();
    const { handler } = await import('../app/server/src/handlers/delete-jobs-changes');
    const jobA = await p.job.create({ data: {} });
    const jobB = await p.job.create({ data: {} });
    try {
      const change = await p.collaborativeChange.create({ data: { jobId: jobA.id, userId: 'u1', userName: 'Alice', operationType: 'insert', contentDelta: { ops: [] } } });
      const res = (await handler({ pathParameters: { id: jobB.id, changeId: change.id }, headers: {} } as LambdaEvent, lambdaCtx, noop)) as LambdaResult;
      return JSON.stringify({ statusCode: res.statusCode, body: JSON.parse(res.body ?? '{}') }, null, 2);
    } finally {
      await p.job.delete({ where: { id: jobA.id } }).catch(() => {});
      await p.job.delete({ where: { id: jobB.id } }).catch(() => {});
    }
  },

  // get-jobs-changes — change log with operationType / contentDelta / userName
  'gs-049': async () => {
    const p = await db();
    const { handler } = await import('../app/server/src/handlers/get-jobs-changes');
    const job = await p.job.create({ data: {} });
    try {
      await p.collaborativeChange.create({ data: { jobId: job.id, userId: 'u1', userName: 'Alice', operationType: 'insert', contentDelta: { ops: [{ insert: 'x' }] } } });
      const res = (await handler({ pathParameters: { id: job.id }, headers: {} } as LambdaEvent, lambdaCtx, noop)) as LambdaResult;
      return JSON.stringify({ statusCode: res.statusCode, body: JSON.parse(res.body ?? '{}') }, null, 2);
    } finally {
      await p.job.delete({ where: { id: job.id } }).catch(() => {});
    }
  },
};

// ── Schema validation ─────────────────────────────────────────────────────────

function validateSchema(raw: Record<string, unknown>, filename: string): string[] {
  const expectedId = basename(filename, '.yaml');
  const failures: string[] = [];

  const missing = REQUIRED_FIELDS.filter(f => !(f in raw));
  if (missing.length > 0) {
    failures.push(`Missing required fields: ${missing.join(', ')}`);
    return failures; // no point checking further
  }

  if (raw.id !== expectedId) {
    failures.push(`id "${String(raw.id)}" does not match filename "${expectedId}"`);
  }
  for (const field of ['tested_files', 'expected_tools', 'must_contain', 'must_not_contain'] as const) {
    if (!Array.isArray(raw[field]) || (raw[field] as unknown[]).length === 0) {
      failures.push(`${field} must be a non-empty array`);
    }
  }
  if (typeof raw.description !== 'string' || !raw.description.trim()) {
    failures.push('description must be a non-empty string');
  }
  if (typeof raw.query !== 'string' || !raw.query.trim()) {
    failures.push('query must be a non-empty string');
  }
  return failures;
}

// ── Behavioral assertion ──────────────────────────────────────────────────────

function truncate(s: string, n = 200): string {
  const oneLine = s.replace(/\s+/g, ' ').trim();
  return oneLine.length > n ? `${oneLine.slice(0, n)}…` : oneLine;
}

async function runCase(raw: Record<string, unknown>, filename: string): Promise<CaseResult> {
  const expectedId = basename(filename, '.yaml');
  const caseId = (raw.id as string) ?? expectedId;

  const schemaFailures = validateSchema(raw, filename);
  if (schemaFailures.length > 0) {
    return {
      case_id: caseId,
      stage: 'golden',
      status: 'FAIL',
      mode: 'schema-only',
      checks: { schema_valid: 'fail', must_contain: 'n/a', must_not_contain: 'n/a' },
      failure_detail: schemaFailures.join('; '),
    };
  }

  // Resolve how this case runs: pure adapter, live-model adapter, or schema-only.
  let runner: (() => string | Promise<string>) | undefined;
  let mode: 'live' | 'live-model' | 'live-db';

  if (ADAPTERS[caseId]) {
    runner = ADAPTERS[caseId];
    mode = 'live';
  } else if (MODEL_ADAPTERS[caseId]) {
    if (!LIVE_MODEL) {
      // Live-model case, but real Bedrock is gated off — do not execute or bill.
      return {
        case_id: caseId,
        stage: 'golden',
        status: 'SKIP',
        mode: 'live-model',
        checks: { schema_valid: 'pass', must_contain: 'n/a', must_not_contain: 'n/a' },
        failure_detail: 'gated: set EVAL_LIVE_MODEL=1 (with AWS creds) to run real Bedrock',
      };
    }
    runner = MODEL_ADAPTERS[caseId];
    mode = 'live-model';
  } else if (DB_ADAPTERS[caseId]) {
    if (!LIVE_DB) {
      // Live DB/handler case, but Postgres is gated off — do not touch any database.
      return {
        case_id: caseId,
        stage: 'golden',
        status: 'SKIP',
        mode: 'live-db',
        checks: { schema_valid: 'pass', must_contain: 'n/a', must_not_contain: 'n/a' },
        failure_detail: 'gated: set EVAL_LIVE_DB=1 (with local Postgres) to run against demand_letter_test',
      };
    }
    runner = DB_ADAPTERS[caseId];
    mode = 'live-db';
  } else {
    // No real integration wired for this case — schema-only, not behaviorally verified.
    return {
      case_id: caseId,
      stage: 'golden',
      status: 'PASS',
      mode: 'schema-only',
      checks: { schema_valid: 'pass', must_contain: 'n/a', must_not_contain: 'n/a' },
    };
  }

  const c = raw as unknown as EvalCase;
  let output: string;
  try {
    output = await runner();
  } catch (err) {
    return {
      case_id: caseId,
      stage: 'golden',
      status: 'ERROR',
      mode,
      checks: { schema_valid: 'pass', must_contain: 'fail', must_not_contain: 'fail' },
      failure_detail: `Adapter threw: ${(err as Error).message}`,
    };
  }

  const missing = c.must_contain.filter(s => !output.includes(s));
  const present = c.must_not_contain.filter(s => output.includes(s));

  const details: string[] = [];
  if (missing.length) details.push(`must_contain not found: ${missing.map(s => JSON.stringify(s)).join(', ')}`);
  if (present.length) details.push(`must_not_contain present: ${present.map(s => JSON.stringify(s)).join(', ')}`);
  if (details.length) details.push(`output=${JSON.stringify(truncate(output))}`);

  const pass = missing.length === 0 && present.length === 0;
  return {
    case_id: caseId,
    stage: 'golden',
    status: pass ? 'PASS' : 'FAIL',
    mode,
    checks: {
      schema_valid: 'pass',
      must_contain: missing.length ? 'fail' : 'pass',
      must_not_contain: present.length ? 'fail' : 'pass',
    },
    ...(pass ? {} : { failure_detail: details.join('; ') }),
  };
}

// ── Inventory + run ───────────────────────────────────────────────────────────

const goldenDir = join(__dirname, 'golden');
const goldenFiles = readdirSync(goldenDir).filter(f => f.endsWith('.yaml')).sort();

const results: CaseResult[] = [];

for (const file of goldenFiles) {
  const filepath = join(goldenDir, file);
  try {
    const content = readFileSync(filepath, 'utf-8');
    const parsed = parse(content) as unknown;
    const cases: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const c of cases) {
      results.push(await runCase(c as Record<string, unknown>, file));
    }
  } catch (err: unknown) {
    results.push({
      case_id: basename(file, '.yaml'),
      stage: 'golden',
      status: 'ERROR',
      mode: 'schema-only',
      checks: { schema_valid: 'fail', must_contain: 'n/a', must_not_contain: 'n/a' },
      failure_detail: `Parse error: ${(err as Error).message}`,
    });
  }
}

// ── Report ───────────────────────────────────────────────────────────────────

const passed  = results.filter(r => r.status === 'PASS').length;
const failed  = results.filter(r => r.status === 'FAIL').length;
const errors  = results.filter(r => r.status === 'ERROR').length;
const skipped = results.filter(r => r.status === 'SKIP').length;
const total   = results.length;
const pct     = Math.round((passed / total) * 100);

const pureLive   = results.filter(r => r.mode === 'live');
const modelLive  = results.filter(r => r.mode === 'live-model' && r.status !== 'SKIP');
const modelSkip  = results.filter(r => r.mode === 'live-model' && r.status === 'SKIP');
const dbLive     = results.filter(r => r.mode === 'live-db' && r.status !== 'SKIP');
const dbSkip     = results.filter(r => r.mode === 'live-db' && r.status === 'SKIP');
const schemaOnly = results.filter(r => r.mode === 'schema-only');
const executed   = [...pureLive, ...modelLive, ...dbLive];
const executedPassed = executed.filter(r => r.status === 'PASS').length;

console.log('\n=== EVAL RESULTS ===\n');
console.log('Stage 1 — Golden Sets');
console.log(`Total: ${total}  Passed: ${passed}  Failed: ${failed}  Errors: ${errors}  Skipped: ${skipped}`);
console.log(`Pass rate: ${pct}%\n`);

console.log('Behavioral verification (real functions executed, no mocks):');
console.log(`  Live pure-fn:  ${pureLive.length} case(s) — ${pureLive.filter(r => r.status === 'PASS').length} passed`);
if (LIVE_MODEL) {
  console.log(`  Live model:    ${modelLive.length} case(s) — ${modelLive.filter(r => r.status === 'PASS').length} passed (real Bedrock)`);
} else {
  console.log(`  Live model:    ${modelSkip.length} case(s) SKIPPED — gated (set EVAL_LIVE_MODEL=1 + AWS creds to run)`);
}
if (LIVE_DB) {
  console.log(`  Live DB/handler: ${dbLive.length} case(s) — ${dbLive.filter(r => r.status === 'PASS').length} passed (demand_letter_test)`);
} else {
  console.log(`  Live DB/handler: ${dbSkip.length} case(s) SKIPPED — gated (set EVAL_LIVE_DB=1 + local Postgres to run)`);
}
console.log(`  Schema-only:   ${schemaOnly.length} case(s) — structure validated, behavior NOT executed\n`);

const nonPassing = results.filter(r => r.status === 'FAIL' || r.status === 'ERROR');
if (nonPassing.length > 0) {
  console.log('--- Failures / Errors ---');
  for (const r of nonPassing) {
    console.log(`  [${r.status}] ${r.case_id} (${r.mode}): ${r.failure_detail ?? ''}`);
  }
  console.log('');
}

// ── Diff vs baseline ─────────────────────────────────────────────────────────

const resultsDir = join(__dirname, 'results');
mkdirSync(resultsDir, { recursive: true });

const latestPath   = join(resultsDir, 'latest.json');
const baselinePath = join(resultsDir, 'baseline.json');

const regressions: CaseResult[] = [];
const fixes: CaseResult[] = [];

if (existsSync(baselinePath)) {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf-8')) as { cases: CaseResult[] };
  const baselineById = new Map(baseline.cases.map(c => [c.case_id, c]));

  for (const r of results) {
    const b = baselineById.get(r.case_id);
    // A gated SKIP is intentional, not a regression.
    if (b && b.status === 'PASS' && r.status !== 'PASS' && r.status !== 'SKIP') regressions.push(r);
    if (b && b.status !== 'PASS' && r.status === 'PASS') fixes.push(r);
  }

  if (regressions.length > 0) {
    console.log('⚠️  REGRESSIONS vs baseline:');
    for (const r of regressions) {
      console.log(`  [REGRESSION] ${r.case_id}: ${r.failure_detail ?? ''}`);
    }
    console.log('');
  }
  if (fixes.length > 0) {
    console.log('✅ Fixed vs baseline:');
    for (const r of fixes) console.log(`  [FIXED] ${r.case_id}`);
    console.log('');
  }
}

// Archive previous latest → baseline before overwriting
if (existsSync(latestPath)) {
  copyFileSync(latestPath, baselinePath);
}

const payload = {
  summary: {
    total, passed, failed, errors, skipped,
    live_verified: executed.length,
    live_passed: executedPassed,
    live_model: modelLive.length,
    model_skipped: modelSkip.length,
    live_db: dbLive.length,
    db_skipped: dbSkip.length,
    schema_only: schemaOnly.length,
    regressions: regressions.length,
    fixes: fixes.length,
  },
  cases: results,
};
writeFileSync(latestPath, JSON.stringify(payload, null, 2));
console.log('Results written to evals/results/latest.json');

// ── Gate ─────────────────────────────────────────────────────────────────────

let gate: 'GREEN' | 'YELLOW' | 'RED';
if (failed > 0 || errors > 0 || regressions.length > 0) {
  gate = 'RED';
} else if (schemaOnly.length > 0 || modelSkip.length > 0 || dbSkip.length > 0) {
  // Nothing failing, but behavioral coverage is incomplete.
  gate = 'YELLOW';
} else {
  gate = 'GREEN';
}

const gateLabel = { GREEN: '🟢 GREEN', YELLOW: '🟡 YELLOW', RED: '🔴 RED' }[gate];
console.log(`\nGate: ${gateLabel}`);

if (gate === 'GREEN') {
  console.log('All golden cases behaviorally verified and passing — safe to ship.');
} else if (gate === 'YELLOW') {
  if (modelSkip.length > 0) {
    console.log(`No failures, but ${modelSkip.length} live-model case(s) were SKIPPED (Bedrock gated off).`);
    console.log('Run `EVAL_LIVE_MODEL=1 pnpm evals` with AWS creds to execute them against real Bedrock.');
  }
  if (dbSkip.length > 0) {
    console.log(`${dbSkip.length} live-DB/handler case(s) were SKIPPED (Postgres gated off).`);
    console.log('Run `EVAL_LIVE_DB=1 pnpm evals` with local Postgres to execute them against demand_letter_test.');
  }
  if (schemaOnly.length > 0) {
    console.log(`${schemaOnly.length} case(s) are schema-only (behavior not executed) — these need the DB / handler tiers.`);
  }
} else {
  console.log('One or more golden cases failed or regressed — do not ship.');
  console.log('\nNext steps:');
  console.log('  • Investigate the failures above.');
  console.log('  • Use /eval-gap to check whether coverage or the system regressed.');
}

// Exit non-zero only on real failures/regressions (schema-only YELLOW is not a hard fail).
process.exit(gate === 'RED' ? 1 : 0);
