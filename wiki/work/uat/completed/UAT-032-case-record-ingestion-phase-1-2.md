---
id: UAT-032
title: "UAT: ROADMAP-003 Phase 1–2: Case-Record Document Type Branching, Textract Async, Provenance Store Schema, and Block Enumeration API"
status: pending
task: TASK-032
created: 2026-06-24
updated: 2026-06-24
---

# UAT-032 — UAT: ROADMAP-003 Phase 1–2: Case-Record Document Type Branching, Textract Async, Provenance Store Schema, and Block Enumeration API

implements::[[TASK-032]]

> **Source task**: [[TASK-032]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] `sam local start-api --env-vars env.json` is running and listening on `http://localhost:3000`
- [ ] `DATABASE_URL` is set and `prisma migrate deploy` has been applied — `SourceFile` and `Block` tables exist
- [ ] `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` are set (or `env.json` supplies them)
- [ ] `S3_BUCKET` environment variable (or `env.json` `BUCKET` value) points to a reachable bucket
- [ ] A Job record exists in the DB; export its id: `export UAT_JOB_ID=<cuid>`
- [ ] A native-text PDF (contains selectable text) has been uploaded to `$UAT_JOB_ID/native.pdf` in the S3 bucket
- [ ] A DOCX file has been uploaded to `$UAT_JOB_ID/sample.docx` in the S3 bucket
- [ ] A scanned PDF (image-only, no text layer) has been uploaded to `$UAT_JOB_ID/scanned.pdf` in the S3 bucket — for full async Textract verification an AWS account with Textract access is required; the endpoint test verifies the 200+pending response shape without waiting for Textract completion
- [ ] `export UAT_BASE_URL=http://localhost:3000` (or the API Gateway invoke URL for remote testing)
- [ ] TypeScript build artifacts are present: `pnpm --filter @demand-letter/api build` succeeded with zero errors

---

## Test Cases

---

### UAT-STATIC-001: TypeScript compiles with zero errors

- **Description**: Verifies that `pnpm typecheck` exits 0 across all workspaces — critical gate since all TASK-032 code is new.
- **Steps**:
  1. From the monorepo root, run the command below.
  2. Inspect exit code and output.
- **Command**:
  ```bash
  pnpm typecheck 2>&1 | tail -20
  ```
- **Expected Result**: Command exits 0. Output contains no `error TS` lines.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-002: Prisma schema contains SourceFile and Block models

- **Description**: Verifies that `packages/db/prisma/schema.prisma` defines both `SourceFile` and `Block` with the required fields and indexes.
- **Steps**:
  1. Run the command below against the schema file.
- **Command**:
  ```bash
  grep -E 'model SourceFile|model Block|textractJobId|phiOffsets|@@index' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output includes `model SourceFile`, `model Block`, `textractJobId`, `phiOffsets`, and at least two `@@index` entries.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-003: SourceFile and Block are exported from the db package

- **Description**: Verifies `packages/db/src/index.ts` re-exports `SourceFile` and `Block` types from `@prisma/client`.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  grep 'SourceFile\|Block' packages/db/src/index.ts
  ```
- **Expected Result**: The export line includes both `SourceFile` and `Block`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-API-001: POST /jobs/{id}/documents/ingest — missing job id returns 400

- **Description**: Confirms the guard clause for a missing path parameter.
- **Steps**:
  1. Call the ingest endpoint without an id segment.
- **Command**:
  ```bash
  curl -sS -X POST '$UAT_BASE_URL/jobs//documents/ingest' -H 'Content-Type: application/json' | jq .
  ```
- **Expected Result**: HTTP 400 (or SAM routes it as 404 for an empty segment — either is acceptable); body contains `error` key.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-002: POST /jobs/{id}/documents/ingest — unknown job returns 404

- **Description**: Validates that the handler rejects a job id that does not exist in the DB.
- **Steps**:
  1. Use a fabricated job id that is not in the database.
- **Command**:
  ```bash
  curl -sS -X POST "$UAT_BASE_URL/jobs/nonexistent-job-id-00000/documents/ingest" -H 'Content-Type: application/json' | jq .
  ```
- **Expected Result**: HTTP 404. Body: `{"error":"Job not found"}`.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-003: POST /jobs/{id}/documents/ingest — native PDF and DOCX processed synchronously

- **Description**: Triggers ingestion for a job that has a native PDF and a DOCX in S3. Both are parsed synchronously; the response must indicate `processed >= 2`, `pending = 0`, and `blocks > 0`.
- **Steps**:
  1. Confirm `$UAT_JOB_ID` bucket prefix contains `native.pdf` and `sample.docx` (uploaded in prerequisites).
  2. Run the command below.
  3. Check the response body values.
  4. Also verify DB: `prisma studio` or a psql query confirming two `SourceFile` rows with `status = 'complete'` and at least one `Block` row.
- **Command**:
  ```bash
  curl -sS -X POST "$UAT_BASE_URL/jobs/$UAT_JOB_ID/documents/ingest" -H 'Content-Type: application/json' | jq .
  ```
- **Expected Result**: HTTP 200. Body shape: `{"processed": <N≥2>, "pending": 0, "blocks": <N≥1>}`. `processed` counts native PDF + DOCX; `pending` is 0; `blocks` reflects all inserted Block rows.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-004: POST /jobs/{id}/documents/ingest — scanned PDF triggers async Textract and returns pending count

- **Description**: Verifies that a scanned (image-only) PDF creates a `SourceFile` with `status = 'processing'` and increments `pending` in the response instead of `processed`.

  > **Note**: The task acceptance criterion specifies HTTP 202 for scanned PDFs, but the implementation returns HTTP 200 with `pending > 0`. This test validates the implemented behavior. The discrepancy between the spec (202) and the implementation (200 + `pending` field) is a known gap — see Gaps section below.

- **Steps**:
  1. Ensure the job's S3 prefix contains only `scanned.pdf` (remove or use a fresh job id that has only the scanned file uploaded).
  2. Run the command below.
  3. Verify the DB has a `SourceFile` row with `type = 'pdf-scanned'`, `status = 'processing'`, and a non-null `textractJobId`.
- **Command**:
  ```bash
  curl -sS -X POST "$UAT_BASE_URL/jobs/$UAT_JOB_ID/documents/ingest" -H 'Content-Type: application/json' | jq .
  ```
- **Expected Result**: HTTP 200. Body: `{"processed": 0, "pending": 1, "blocks": 0}`. A `SourceFile` DB row is created with `type = 'pdf-scanned'`, `status = 'processing'`, and `textractJobId` set to a non-empty string.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-005: GET /jobs/{id}/blocks — missing job id returns 400

- **Description**: Guard clause for missing path parameter on the blocks endpoint.
- **Command**:
  ```bash
  curl -sS "$UAT_BASE_URL/jobs//blocks" | jq .
  ```
- **Expected Result**: HTTP 400 (or 404 for empty segment); body contains `error` key.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-006: GET /jobs/{id}/blocks — unknown job returns 404

- **Description**: Validates that the handler rejects a job id not present in the DB.
- **Command**:
  ```bash
  curl -sS "$UAT_BASE_URL/jobs/nonexistent-job-id-00000/blocks" | jq .
  ```
- **Expected Result**: HTTP 404. Body: `{"error":"Job not found"}`.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-007: GET /jobs/{id}/blocks — default pagination returns correct envelope

- **Description**: After UAT-API-003 has run and inserted blocks, verifies the response envelope shape with default pagination (`page=1`, `limit=100`).
- **Steps**:
  1. Run UAT-API-003 first so blocks exist.
  2. Run the command below.
  3. Inspect shape and values.
- **Command**:
  ```bash
  curl -sS "$UAT_BASE_URL/jobs/$UAT_JOB_ID/blocks" | jq '{totalCount: .totalCount, page: .page, limit: .limit, hasMore: .hasMore, blockCount: (.blocks | length)}'
  ```
- **Expected Result**: HTTP 200. Body is `{"blocks":[...], "page":1, "limit":100, "totalCount":<N>, "hasMore":<bool>}`. `totalCount` equals the number of `Block` rows for this job. `hasMore` is `false` when `totalCount ≤ 100`.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-008: GET /jobs/{id}/blocks — block record has correct fields

- **Description**: Verifies that each block object in the response contains the required fields with correct types.
- **Steps**:
  1. Run after UAT-API-003.
  2. Extract the first block and check fields.
- **Command**:
  ```bash
  curl -sS "$UAT_BASE_URL/jobs/$UAT_JOB_ID/blocks" | jq '.blocks[0] | {id, sourceFileId, type, text, page, bbox, confidence, createdAt}'
  ```
- **Expected Result**: The first block has all eight fields: `id` (string cuid), `sourceFileId` (string), `type` (string, e.g. `"LINE"` or `"PARAGRAPH"`), `text` (non-empty string), `page` (integer ≥ 1), `bbox` (object with keys `left`, `top`, `width`, `height`), `confidence` (number or null), `createdAt` (ISO datetime string).
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-009: GET /jobs/{id}/blocks — DOCX blocks have type PARAGRAPH

- **Description**: Verifies that blocks produced by the DOCX parser carry `type = "PARAGRAPH"`.
- **Steps**:
  1. Run after UAT-API-003.
  2. Filter blocks by type.
- **Command**:
  ```bash
  curl -sS "$UAT_BASE_URL/jobs/$UAT_JOB_ID/blocks" | jq '[.blocks[] | select(.type == "PARAGRAPH")] | length'
  ```
- **Expected Result**: Output is a positive integer (≥ 1), confirming PARAGRAPH-typed blocks exist.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-010: GET /jobs/{id}/blocks — native PDF blocks have type LINE

- **Description**: Verifies that blocks produced by the native PDF parser carry `type = "LINE"`.
- **Steps**:
  1. Run after UAT-API-003.
- **Command**:
  ```bash
  curl -sS "$UAT_BASE_URL/jobs/$UAT_JOB_ID/blocks" | jq '[.blocks[] | select(.type == "LINE")] | length'
  ```
- **Expected Result**: Output is a positive integer (≥ 1), confirming LINE-typed blocks exist.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-011: GET /jobs/{id}/blocks — type filter returns only matching blocks

- **Description**: Verifies the `type` query parameter filters blocks correctly.
- **Steps**:
  1. Run after UAT-API-003.
  2. Request only PARAGRAPH blocks via query param.
- **Command**:
  ```bash
  curl -sS "$UAT_BASE_URL/jobs/$UAT_JOB_ID/blocks?type=PARAGRAPH" | jq '{totalCount: .totalCount, nonParagraph: [.blocks[] | select(.type != "PARAGRAPH")] | length}'
  ```
- **Expected Result**: HTTP 200. `nonParagraph` count is 0. `totalCount` matches the number of PARAGRAPH blocks seen in UAT-API-009.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-012: GET /jobs/{id}/blocks — page_num filter returns only blocks from that page

- **Description**: Verifies the `page_num` query parameter filters blocks by their `page` integer field.
- **Steps**:
  1. Run after UAT-API-003 (native PDF must have ≥ 1 page).
- **Command**:
  ```bash
  curl -sS "$UAT_BASE_URL/jobs/$UAT_JOB_ID/blocks?page_num=1" | jq '[.blocks[] | select(.page != 1)] | length'
  ```
- **Expected Result**: Output is `0` — all returned blocks have `page == 1`.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-013: GET /jobs/{id}/blocks — limit and hasMore pagination

- **Description**: Verifies that `limit` is honoured and `hasMore` is set correctly when fewer blocks than `totalCount` are returned.
- **Steps**:
  1. Ensure more than 1 block exists (satisfied after UAT-API-003).
- **Command**:
  ```bash
  curl -sS "$UAT_BASE_URL/jobs/$UAT_JOB_ID/blocks?limit=1" | jq '{limit: .limit, blockCount: (.blocks | length), hasMore: .hasMore, totalCount: .totalCount}'
  ```
- **Expected Result**: `limit` is `1`, `blockCount` is `1`, `hasMore` is `true` (assuming `totalCount > 1`), `totalCount` matches the full block count from UAT-API-007.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-014: GET /jobs/{id}/blocks — limit capped at 500

- **Description**: Verifies that a client cannot exceed the 500-record hard cap per the handler implementation.
- **Steps**:
  1. Request an absurdly large limit.
- **Command**:
  ```bash
  curl -sS "$UAT_BASE_URL/jobs/$UAT_JOB_ID/blocks?limit=9999" | jq '.limit'
  ```
- **Expected Result**: Returned `limit` value is ≤ 500 (the handler clamps at 500).
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-INTEGRATION-001: Document type detection — native PDF routed to pdf-native path

- **Description**: End-to-end verification that a native PDF (with a selectable text layer) is classified as `pdf-native` and a `SourceFile` DB row with `type = 'pdf-native'` and `status = 'complete'` is created after ingest.
- **Steps**:
  1. Use a fresh job id with only `native.pdf` in its S3 prefix.
  2. Call `POST /jobs/{id}/documents/ingest`.
  3. Query the DB for `SourceFile` rows with `jobId = $UAT_JOB_ID`.
  4. Confirm the row has `type = 'pdf-native'` and `status = 'complete'`.
- **Command**:
  ```bash
  curl -sS -X POST "$UAT_BASE_URL/jobs/$UAT_JOB_ID/documents/ingest" | jq '{processed: .processed, pending: .pending}'
  ```
- **Expected Result**: `processed` is 1, `pending` is 0. DB row: `type = 'pdf-native'`, `status = 'complete'`.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-INTEGRATION-002: Document type detection — DOCX routed to docx path

- **Description**: End-to-end verification that a DOCX file is classified as `docx` and a `SourceFile` DB row with `type = 'docx'` and `status = 'complete'` is created after ingest.
- **Steps**:
  1. Use a fresh job id with only `sample.docx` in its S3 prefix.
  2. Call `POST /jobs/{id}/documents/ingest`.
  3. Query the DB for `SourceFile` rows; confirm `type = 'docx'` and `status = 'complete'`.
- **Command**:
  ```bash
  curl -sS -X POST "$UAT_BASE_URL/jobs/$UAT_JOB_ID/documents/ingest" | jq '{processed: .processed, pending: .pending}'
  ```
- **Expected Result**: `processed` is 1, `pending` is 0. DB row: `type = 'docx'`, `status = 'complete'`. At least one `Block` row with `type = 'PARAGRAPH'` and `page = 1` is inserted.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-INTEGRATION-003: Document type detection — scanned PDF routed to pdf-scanned async path

- **Description**: End-to-end verification that an image-only PDF (no text layer) is classified as `pdf-scanned`, triggers Textract via `StartDocumentAnalysis`, and creates a `SourceFile` with `type = 'pdf-scanned'`, `status = 'processing'`, and a non-null `textractJobId`.
- **Steps**:
  1. Use a fresh job id with only `scanned.pdf` in its S3 prefix.
  2. Call `POST /jobs/{id}/documents/ingest`.
  3. Query the DB for the `SourceFile` row; verify fields.
- **Command**:
  ```bash
  curl -sS -X POST "$UAT_BASE_URL/jobs/$UAT_JOB_ID/documents/ingest" | jq '{processed: .processed, pending: .pending, blocks: .blocks}'
  ```
- **Expected Result**: HTTP 200. `processed = 0`, `pending = 1`, `blocks = 0`. DB row: `type = 'pdf-scanned'`, `status = 'processing'`, `textractJobId` is a non-empty string. No `Block` rows exist yet for this file.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-INTEGRATION-004: Native PDF blocks are inserted to DB and visible via GET /blocks

- **Description**: Full end-to-end flow for native PDF — ingest runs the structured parser and blocks are immediately queryable via `GET /jobs/{id}/blocks`.
- **Steps**:
  1. Use the job from UAT-INTEGRATION-001 (native PDF only).
  2. Call `GET /jobs/{id}/blocks` and confirm blocks exist.
- **Command**:
  ```bash
  curl -sS "$UAT_BASE_URL/jobs/$UAT_JOB_ID/blocks" | jq '{totalCount: .totalCount, firstBlockType: .blocks[0].type, firstBlockPage: .blocks[0].page}'
  ```
- **Expected Result**: `totalCount ≥ 1`. `firstBlockType` is `"LINE"`. `firstBlockPage` is `1`.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-INTEGRATION-005: DOCX blocks are inserted to DB and visible via GET /blocks

- **Description**: Full end-to-end flow for DOCX — ingest runs mammoth and blocks are immediately queryable.
- **Steps**:
  1. Use the job from UAT-INTEGRATION-002 (DOCX only).
  2. Call `GET /jobs/{id}/blocks`.
- **Command**:
  ```bash
  curl -sS "$UAT_BASE_URL/jobs/$UAT_JOB_ID/blocks" | jq '{totalCount: .totalCount, firstBlockType: .blocks[0].type, firstBlockPage: .blocks[0].page}'
  ```
- **Expected Result**: `totalCount ≥ 1`. `firstBlockType` is `"PARAGRAPH"`. `firstBlockPage` is `1`.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api not running on localhost:3000] <!-- 2026-06-24 -->

---

## Gaps / Known Deviations

1. **HTTP 202 vs 200 for scanned PDFs** — TASK-032 acceptance criterion states scanned PDFs should return HTTP 202. The implementation (`post-jobs-documents-ingest.ts`) always returns HTTP 200, using the `pending` counter to signal async work. UAT-API-004 and UAT-INTEGRATION-003 test the actual 200 behavior. This discrepancy should be raised as a follow-up fix or the spec updated.

2. **SNS Textract completion Lambda (UAT not included)** — Full end-to-end Textract completion (SNS → `sns-textract-completion.ts` → Block insertion → `SourceFile` status `complete`) requires a live AWS account with Textract and SNS configured. Tests for this path are not included in the automated test suite; they should be verified in staging after deploying with `sam deploy`.

3. **Block `bbox` values for native PDF / DOCX** — The structured parsers set `bbox: { left: 0, top: 0, width: 0, height: 0 }` as a placeholder (real bbox extraction is post-ROADMAP-003). Tests assert bbox is an object with the four keys but do not verify non-zero coordinates.
