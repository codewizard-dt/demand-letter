---
id: TASK-049
title: "Citation Panel: Extraction Review Sidebar with Block Highlighting"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-033, TASK-034]
blocks: []
parallel_safe_with: [TASK-045, TASK-046, TASK-047, TASK-048]
uat: "[[UAT-049]]"
tags: [frontend, citation, extraction, gap-report, blocks, ui]
---

# TASK-049 — Citation Panel: Extraction Review Sidebar with Block Highlighting

## Objective

Add a read-only citation sidebar to `GapReportPage` (the extraction review page at `/jobs/:id/gap-report`) that shows, for each extracted field, the block IDs cited in its `blockIds` column. Clicking a block ID scrolls and highlights the corresponding text block in a read-only source document preview panel (fetched via the existing `GET /jobs/:id/blocks` endpoint). The feature is additive — it does not change the gap-report table, submit flow, or API surface.

## Approach

The page layout expands from single-column to two columns: left column retains the existing gap-report table + attorney-judgment form; right column contains the citation sidebar. A third panel (collapsible or inline) renders a paginated block list acting as the source document preview.

**New backend endpoint required**: `GET /jobs/:id/fields` — returns all `ExtractedField` rows for a job with `fieldName`, `value`, `blockIds`, `confidence`, `isNull`, and `source`. The existing `computeGapReport` already reads these from the DB; the new endpoint simply exposes them as JSON so the frontend can render the citation sidebar without a second round-trip to the gap-report logic.

**Existing infrastructure reused**:
- `GET /jobs/:id/blocks` (handler: `packages/api/src/handlers/get-jobs-blocks.ts`) — already paginates and returns `id`, `text`, `page`, `type`, `bbox`, `confidence`.
- `GET /jobs/:id/gap-report` — already fetched by `GapReportPage`; no change.
- Prisma `ExtractedField` model — `blockIds Json @default("[]")` stores the block ID array.

**UI design decisions**:
- Two-panel layout using CSS Grid (`grid-cols-[1fr_360px]`); right sidebar is fixed-height with `overflow-y-auto`.
- Citation sidebar lists every field from `GET /jobs/:id/fields`; fields with non-empty `blockIds` show inline pill buttons for each ID; fields with empty `blockIds` show "—".
- Clicking a block pill: (a) sets `activeBlockId` state, (b) scrolls to the `<div id={blockId}>` element in the source preview panel.
- Highlighted block: Tailwind `ring-2 ring-blue-500 bg-blue-50` applied via a `highlighted` class; removed when a different block is clicked or the user clicks elsewhere.
- Source preview panel: renders all blocks fetched from `GET /jobs/:id/blocks` (first page, limit=500); each block has `id={block.id}` for scroll targeting. Uses `block.text` with `block.type` as a label. No PDF rendering — text only (PDF viewer is out of scope).
- The sidebar and preview panel are read-only and do not affect the existing submit/generate flow.

**SAM template wiring**: The new `GET /jobs/:id/fields` Lambda shares the same pattern as `get-jobs-gap-report.ts` — same `DbLayer`, same API Gateway event proxy, same Prisma import.

## Steps

### 1. Add `GET /jobs/:id/fields` Lambda handler  <!-- agent: general-purpose -->

File: `packages/api/src/handlers/get-jobs-fields.ts` (new file)

- [x] Use `mcp__serena__get_symbols_overview` on `packages/api/src/handlers/get-jobs-gap-report.ts` to confirm the boilerplate pattern (imports, `prisma`, `APIGatewayProxyHandlerV2`). <!-- Completed: 2026-06-25 -->
- [x] Create `packages/api/src/handlers/get-jobs-fields.ts` with the `Write` tool (new file, no prior read needed). Content: <!-- Completed: 2026-06-25 -->
  ```ts
  import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
  import { prisma } from '../lib/prisma';

  export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const jobId = event.pathParameters?.id;
    if (!jobId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing job ID' }) };
    }
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };
    }
    const fields = await prisma.extractedField.findMany({
      where: { jobId },
      select: {
        fieldName: true,
        value: true,
        blockIds: true,
        confidence: true,
        isNull: true,
        source: true,
        nullReason: true,
        acceptMissing: true,
      },
      orderBy: { fieldName: 'asc' },
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    };
  };
  ```

### 2. Wire the new handler into `template.yaml`  <!-- agent: general-purpose -->

File: `template.yaml` (repo root)

- [x] Read `template.yaml` using `Read` to locate the `GetJobsGapReport` function block and its `Events:` section — it follows the pattern used by all other job-scoped GET handlers. <!-- Completed: 2026-06-25 -->
- [x] Use `Edit` to insert a new `GetJobsFields` function block immediately after the `GetJobsGapReport` block. Follow the identical structure (same `DbLayer`, same `VpcConfig`, same `Environment`), substituting: <!-- Completed: 2026-06-25 -->
  - Handler: `packages/api/src/handlers/get-jobs-fields.handler`
  - HTTP method: `get`
  - Path: `/jobs/{id}/fields`
  - Logical name: `GetJobsFieldsFunction`

### 3. Add `fetchExtractedFields` and `ExtractedFieldRow` to `packages/web/src/lib/api.ts`  <!-- agent: general-purpose -->

- [x] Use `mcp__serena__get_symbols_overview` on `packages/web/src/lib/api.ts` to confirm existing symbols. <!-- Completed: 2026-06-25 -->
- [x] Use `mcp__serena__insert_after_symbol` targeting the last interface in the file (currently `LlmCostAggregate`) to append: <!-- Completed: 2026-06-25 -->
  ```ts
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
  ```
  Note: `blockIds` is typed `string[]` — the Prisma `Json` column stores a JSON array of CUID strings; the fetch response will be a plain JS array after `JSON.parse`.

### 4. Add `fetchBlocks` and `BlockRow` to `packages/web/src/lib/api.ts`  <!-- agent: general-purpose -->

- [x] Use `mcp__serena__insert_after_symbol` targeting `fetchExtractedFields` (just added) to append: <!-- Completed: 2026-06-25 -->
  ```ts
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
  ```

### 5. Rewrite `GapReportPage.tsx` to add the citation sidebar and source preview panel  <!-- agent: general-purpose -->

File: `packages/web/src/pages/GapReportPage.tsx`

- [x] Use `mcp__serena__find_symbol` with `include_body=true` on `GapReportPage` to get the current full component body. <!-- Completed: 2026-06-25 -->
- [x] Add imports for the new API helpers. Use `mcp__serena__replace_content` (literal) to update the api import line: <!-- Completed: 2026-06-25 -->
  Find: `import { API_BASE } from '../lib/api';`
  Replace with:
  ```ts
  import { API_BASE, fetchExtractedFields, fetchBlocks, ExtractedFieldRow, BlockRow } from '../lib/api';
  ```
  (If `API_BASE` is imported directly rather than from `api.ts`, adjust accordingly — it may be a local constant. Check via `get_symbols_overview`.)
- [x] Add state variables for the citation panel data. Use `mcp__serena__replace_content` (literal) to insert after the `const [generating, setGenerating] = useState(false);` line: <!-- Completed: 2026-06-25 -->
  ```ts
  const [extractedFields, setExtractedFields] = useState<ExtractedFieldRow[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  ```
  Also add `useRef` to the React import.
- [x] Add a `useEffect` to load extracted fields and blocks on mount. Insert immediately after the existing `useEffect(() => { fetchReport(); }, [fetchReport]);` line using `mcp__serena__replace_content` (literal): <!-- Completed: 2026-06-25 -->
  ```ts
  useEffect(() => {
    if (!jobId) return;
    Promise.all([fetchExtractedFields(jobId), fetchBlocks(jobId)])
      .then(([fields, blks]) => {
        setExtractedFields(fields);
        setBlocks(blks);
      })
      .catch(() => {/* citation panel degrades gracefully — errors do not surface to the user */});
  }, [jobId]);
  ```
- [x] Add a `handleBlockClick` handler. Insert before the `return (` statement using `mcp__serena__replace_content` (literal): <!-- Completed: 2026-06-25 -->
  ```ts
  const handleBlockClick = (blockId: string) => {
    setActiveBlockId(blockId);
    const el = blockRefs.current[blockId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  ```
- [x] Wrap the existing JSX `return (...)` in a two-column grid layout. Use `mcp__serena__replace_symbol_body` on `GapReportPage` to rewrite the full component, preserving all existing logic and adding the two new panels. The new outer structure: <!-- Completed: 2026-06-25 -->
  ```tsx
  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>
        {/* Left column: existing gap-report table + submit form */}
        <div style={{ maxWidth: '900px' }}>
          {/* ... existing JSX content unchanged ... */}
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
  ```
  The key invariant: all existing state, handlers (`fetchReport`, `handleSubmit`, `handleGenerate`), and the gap-report table/form JSX are preserved verbatim inside the left column div.

### 6. Typecheck  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/web typecheck` from the repo root. <!-- Completed: 2026-06-25 — fixed missing closing brace in GapReportPage.tsx and exported API_BASE from api.ts -->
  - Expected: 0 type errors.
  - Common errors to fix:
    - `useRef` not imported → add `useRef` to the React import in `GapReportPage.tsx`.
    - `blockIds` typed as `unknown` or `Json` → the `ExtractedFieldRow` interface declares it `string[]`; TypeScript accepts this since the JSON response is cast at the fetch boundary.
    - `API_BASE` not in scope → if `GapReportPage` currently uses `API_BASE` directly (imported from `api.ts`) rather than via a helper, verify the import path.
- [x] Run `pnpm --filter @demand-letter/api typecheck` from the repo root. <!-- Completed: 2026-06-25 — fixed prisma import to use @demand-letter/db -->
  - Expected: 0 type errors in the new `get-jobs-fields.ts` handler.
