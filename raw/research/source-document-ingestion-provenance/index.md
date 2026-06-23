---
topic: "source-document ingestion and provenance strategy for the demand-letter generator's case record: parse heterogeneous source documents (intake, police/incident reports, medical records, bills, insurance declarations) arriving as native PDFs, scanned/OCR PDFs, and .docx, extracting text while preserving page + paragraph/bounding-box locators so every extracted field carries a citation back to its source location. TS/React/Node/AWS/PostgreSQL stack. Compare AWS Textract vs OSS OCR vs LLM-native multimodal (Claude) vs hybrid. Weigh accuracy on messy scans, locator fidelity, native-vs-scanned handling, cost/latency, PHI/data residency, build cost, grounding-only extraction with per-field citations."
slug: source-document-ingestion-provenance
researched: 2026-06-22
sources: [./sources.md]
---

# Research: Source-Document Ingestion & Provenance Strategy

> **The question (the last open decision from the input contract):** the case record arrives as a heterogeneous pile of native PDFs, scanned/OCR'd medical records, and `.docx`. The input contract demands that **every extracted field carry a citation back to its source location** (the provenance/citation layer), that extraction be **grounding-only** (no hallucinated fields), and that a **sufficiency gate** can see per-field provenance. Four approaches compete: (1) **AWS Textract** (Layout + Queries), (2) **OSS OCR/parsing** (pdfplumber/unstructured + Tesseract), (3) **LLM-native multimodal** (Claude reads PDFs/images directly with its Citations feature), (4) a **hybrid** — Textract/OCR for layout + locators, then Claude for grounded field extraction. The recommendation is the **hybrid (Option 4)**: Textract produces per-element **bounding-box + page + confidence** locators and normalized text; Claude then extracts the canonical field schema, **grounded in the Textract output**, returning each field with the Textract block ID(s) it came from. This yields **bbox-level provenance** (finer than any single tool's free-text citation), schema-validated fields, and a confidence signal — at the cost of two pipeline stages. Claude's native PDF+Citations (Option 3) is a strong, cheaper fallback but gives **page-level** provenance only and **cannot be combined with structured-output schemas**; Textract alone (Option 1) gives locators but no semantic extraction; OSS (Option 2) is cheapest but weakest on messy scanned medical records and carries the most build/operational burden.

## Research Questions

1. Which approach extracts text from messy scanned medical records most accurately, and how does each handle native PDF vs scanned PDF vs `.docx`?
2. What locator fidelity does each provide for the citation layer — page, paragraph, or bounding box?
3. How does each feed **grounding-only** extraction with **per-field** source citations, and which can also emit the canonical field schema?
4. What are the cost/latency, build-cost, and **PHI/data-residency** implications on a TS/React/Node/AWS stack?

## Current State (Codebase)

No application code exists yet. Relevant context:

- **DEC-0001 / DEC-0002 (accepted)** decided the *template* side: hybrid zone-detection and delimiter-tag persistence. This decision is the **case-record** side — flagged as open in `demand-letter-input-contract.md` ("source-document ingestion + provenance strategy (PDF/.docx/OCR parsing preserving page/paragraph locators)").
- **`demand-letter-input-contract.md`** specifies the ~40-field schema, the three field origins (extracted / boilerplate / attorney-judgment), the **provenance requirement** (every extracted value traceable to source + locator), **grounding-only generation**, and the **sufficiency gate** (gap report on uncovered slots).
- The PRD fixes the stack as **TypeScript/React/Node.js/AWS Lambda/PostgreSQL** with **Claude** preferred for AI (Anthropic API or AWS Bedrock). The AWS footprint makes **Textract** and **Bedrock** first-class options.

## Key Findings

### 1. Textract returns per-element bounding boxes, page index, and confidence — the richest locator substrate [S1][S2][S3]

Every Textract operation returns results as **Block objects** (`PAGE` → `LINE` → `WORD`, plus `TABLE`/`CELL`, key-value `FORM`, `QUERY`/`QUERY_RESULT`) each carrying a **`Geometry`** field with a `BoundingBox` and `Polygon`, a **page number**, and a **confidence score** [S1][S3]. **Layout** analysis adds semantic regions — paragraphs, headers, footers, titles, section headers, tables, lists — with their own bounding boxes [S2]. **Queries** let you ask "What is the date of loss?" and get the answer plus its location [S2]. This is **finer than page-level**: a citation can point at the exact rectangle on the exact page. Confidence scores let the sufficiency gate flag low-confidence extractions (e.g. < 95%) for attorney review [S4]. Textract handles printed + handwritten text and is built for scanned forms/tables including medical records [S4][S5], though accuracy degrades on very low-resolution scans and heavy cursive [S6].

### 2. Claude has native PDF support and a Citations feature that returns page-level locators — but it's page-granular and can't combine with schema output [S7][S8][S9]

Claude accepts PDFs natively as a `document` content block (base64 or via the Files API), **no beta header**; limits are **32 MB / 600 pages** (100 pages on 200K-context models) [S7]. The **Citations feature** (`citations: {enabled: true}` per document, no beta) splits the response into multiple text blocks where cited blocks carry a `citations` array; each citation has `cited_text`, `document_index`, `document_title`, and a **location typed by source**: `page_location` (`start_page_number`/`end_page_number`, 1-indexed) for PDF, `char_location` for plain text [S8]. This gives **grounded, verifiable extraction with page-level provenance out of the box** — but two limits matter here:

- **Provenance is page-level, not bbox-level.** A citation says "page 7," not "the figure at coordinates (x,y) on page 7." For a specials table or a single diagnosis line, that is coarser than Textract.
- **Citations are incompatible with structured outputs** (`output_config.format`) — the API returns a 400 if both are set [S8]. So you can have *either* cited free-text *or* schema-validated JSON from one call, not both. Populating the canonical field schema **and** carrying citations therefore needs either two passes or a tool-call schema that encodes citations as fields.

### 3. The Files API — and thus the cleanest PDF-upload path — is unavailable on Amazon Bedrock; PHI/residency pushes toward Bedrock [S10][S11]

For PHI, the AWS-native answer is **Claude on Amazon Bedrock**: data stays within the customer's AWS account/region under AWS's HIPAA-eligible controls and BAA. The platform-availability matrix shows **PDF input ✅ and Citations ✅ on Bedrock** — so the grounding mechanism survives — **but the Files API is ❌ on Bedrock** (PDFs must be sent **inline as base64**, not by `file_id`), and Anthropic's **`inference_geo` data-residency parameter is ❌ on Bedrock** (it's a first-party / Claude-Platform-on-AWS feature) [S10][S11]. Net: Bedrock satisfies PHI residency via AWS's own controls, keeps PDF+Citations, but forfeits the Files API and `inference_geo`. The first-party Anthropic API offers the Files API and `inference_geo` but requires a BAA with Anthropic for PHI. **This is a real architectural fork the decision must resolve.**

### 4. The dominant production pattern is "OCR/IDP extraction layer → LLM downstream," which is exactly the hybrid [S6][S12][S13]

Industry IDP guidance positions OCR services like Textract as the **initial extraction layer**, followed by validation, schema enforcement, and normalization — with LLMs as downstream reasoners, not the trusted final authority for precise field capture [S6][S13]. LLM-extraction practice independently converges on "first classify/segment, then extract into a schema, output N/A for missing fields, never invent" [S12]. Composing the two gives the demand-letter pipeline its provenance: Textract supplies the bbox/page/confidence locators and normalized text; Claude reads that structured output and emits the field schema with each field tagged by the Textract block ID(s) it drew from — so the citation layer is **bbox-precise** and the extraction is **schema-shaped and grounding-only** in one pass, sidestepping the citations-vs-schema incompatibility because the grounding is to Textract IDs, not Claude's own page citations.

### 5. `.docx` and native PDFs don't need OCR — but the pipeline must branch by document type [S7][S12]

Native `.docx` and text-bearing PDFs already contain extractable text with positional structure; sending them through OCR wastes money and can *lose* fidelity. The ingestion pipeline should **branch**: `.docx` → structured parse (python-docx / docx libraries) preserving paragraph indices; native PDF → text-layer extraction with page/char offsets; **scanned PDF / image → Textract OCR** for the bbox+page locators. Detection (does this PDF have a text layer?) is a cheap up-front gate. Claude can also read native PDFs and `.docx`-converted text directly, but only Textract gives the bbox locators that scanned medical records need.

## Solution Comparison

| Criteria | 1. AWS Textract | 2. OSS OCR (pdfplumber/unstructured + Tesseract) | 3. LLM-native (Claude PDF + Citations) | 4. Hybrid (Textract → Claude) |
|----------|-----------------|--------------------------------------------------|----------------------------------------|-------------------------------|
| **Locator fidelity** | bbox + page + confidence | bbox + page (Tesseract `hOCR`) | **page only** (`page_location`) | **bbox + page + confidence** |
| **Semantic field extraction** | ❌ (raw blocks / Queries only) | ❌ | ✅ (grounded) | ✅ (grounded, schema-shaped) |
| **Emits canonical schema** | ❌ | ❌ | ⚠️ not with citations on | ✅ (grounds to Textract IDs) |
| **Messy scanned medical records** | ✅ strong | ⚠️ Tesseract weaker | ✅ vision is strong | ✅ strongest (OCR + reasoning) |
| **Native PDF / .docx** | overkill | works | ✅ direct | branch: skip Textract |
| **Grounding-only / no hallucination** | n/a (no generation) | n/a | ✅ citations enforce it | ✅ grounded to OCR output |
| **PHI / residency (AWS)** | ✅ in-account | ✅ self-hosted | Bedrock ✅ (no Files API / `inference_geo`) | ✅ both in AWS |
| **Cost / latency** | Low-Med per page | Low (self-run) | Med (token cost on images) | **Highest (two stages)** |
| **Build / ops cost** | Low (managed) | **High (run/scale OCR)** | Low | Med-High |

## Recommendation

**Adopt the hybrid (Option 4): Textract for layout + provenance locators, then Claude (on Bedrock for PHI) for grounded field extraction.**

It is the only approach that delivers **bbox-precise per-field provenance** *and* a **schema-shaped, grounding-only extraction** — the two things the input contract makes non-negotiable — while keeping all PHI inside AWS. The page-level limit and citations-vs-schema incompatibility of pure Claude (Option 3) are exactly what the Textract grounding layer removes.

**Implementation outline:**
1. **Type-branch on ingest.** Detect text-layer PDFs and `.docx` (skip OCR — parse structurally with page/paragraph offsets); route scanned PDFs/images to **Textract** (`AnalyzeDocument` with `LAYOUT` + `TABLES` + `FORMS`, or targeted `Queries`). Run Textract async for multi-page documents via the S3 + SNS job pattern.
2. **Persist a provenance store.** Write every Textract block (id, type, text, page, bbox, confidence) to PostgreSQL keyed by document + block id — this is the citation backing store and the OCR cache.
3. **Grounded extraction.** Feed the normalized Textract text (block ids inline) to Claude with the **canonical field schema**; require each field to return its value **plus the block id(s)** it came from, or `null` + reason if absent (grounding-only; no invented values).
4. **Sufficiency gate.** Map extracted fields to the input-contract slots; any slot with no value, or a value whose confidence is below threshold, → **gap report**, not generation. Surface the bbox so the attorney can click straight to the source rectangle.
5. **PHI posture.** Run Claude via **Bedrock** (data stays in-account; PDF+Citations available; send inline base64 since the Files API is absent on Bedrock); or first-party Anthropic under a BAA if the Files API / `inference_geo` are needed.

**Risks & mitigations:**
- *Two-stage cost/latency* → cache Textract output (it's deterministic per document); only re-run extraction on prompt changes. Use Textract Queries to pull just the needed fields when full Layout isn't required.
- *Textract misreads on poor scans* → surface confidence scores into the sufficiency gate; low-confidence fields route to attorney review rather than silent acceptance [S4][S6].
- *Bedrock lacks the Files API* → send PDFs/images inline as base64 (within the 32MB/page limits); chunk very large records.
- *Citations-vs-schema trap if you skip Textract* → don't ground to Claude's own page citations; ground to Textract block ids, which carry no such restriction.

**Alternative if constraints change:** if bbox precision proves unnecessary (e.g. page-level "see p.7" is enough for the attorney) and cost/latency dominate, **Claude native PDF + Citations (Option 3)** is the simpler one-stage path — accept page-level provenance and run extraction as cited free-text or via a tool-call schema that embeds the page citation as a field.

## Next Steps

- This report backs **`/decision-create — source-document ingestion + provenance`** (DEC-0003). Draft Options 1–4 with the hybrid as the recommended outcome and the Bedrock-vs-first-party PHI fork as an explicit sub-decision.
- Follow-on `/task-add`: the type-branching ingestion router; the Textract provenance store (PostgreSQL schema); the grounded-extraction prompt + field schema; the sufficiency-gate/gap-report component (shared with the input contract).
- `/wiki-ingest raw/research/source-document-ingestion-provenance/index.md` after the decision is drafted.
