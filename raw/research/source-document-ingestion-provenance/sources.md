---
topic: "source-document ingestion and provenance strategy for the demand-letter generator's case record (Textract vs OSS OCR vs Claude-native multimodal vs hybrid); locator fidelity, grounding-only per-field citations, PHI/data residency on a TS/React/Node/AWS stack"
slug: source-document-ingestion-provenance
researched: 2026-06-22
---

# Primary Sources — Source-Document Ingestion & Provenance

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | web | https://docs.aws.amazon.com/textract/latest/dg/how-it-works-document-layout.html | 2026-06-22 | Textract returns Block objects (PAGE/LINE/WORD…) each with a `Geometry` (BoundingBox + Polygon), page metadata, and confidence |
| S2 | web | https://docs.aws.amazon.com/textract/latest/dg/how-it-works-analyzing.html | 2026-06-22 | Layout detection returns paragraphs, lists, headers, footers, page numbers, figures, tables, titles, section headers with bounding boxes; Queries return an answer + location for a posed question |
| S3 | web | https://aws.amazon.com/textract/features/ | 2026-06-22 | All extracted data returned with bounding-box coordinates (polygon frames) around each word/line/table/cell; preserves table composition (relevant to medical records) |
| S4 | web | https://aws.amazon.com/textract/faqs/ | 2026-06-22 | Confidence score 0–100 per element; custom rules can flag extractions below e.g. 95%; bounding boxes locate where each datum appears |
| S5 | web | https://www.signisys.com/blog/amazon-textract-the-complete-guide-to-aws-document-processing/ | 2026-06-22 | Textract handles single/multi-page, printed + handwritten text, returns confidence + bbox for every element; used on medical records/loan packages |
| S6 | web | https://www.llamaindex.ai/glossary/what-is-amazon-textract | 2026-06-22 | Textract performance degrades on very low-resolution scans / heavy cursive; common architecture uses OCR as an initial extraction layer followed by validation/normalization |
| S7 | skill | claude-api skill — "Document & File Input (Quick Reference)" | 2026-06-22 | Native PDF: `{type: document, source:{type: base64, media_type: application/pdf}}`, no beta; limits 32MB request, 600 pages (100 for 200k-context models); Files API via `file_id` is a separate beta |
| S8 | skill | claude-api skill — "Citations (no beta)" + Common Pitfalls | 2026-06-22 | `citations:{enabled:true}` per document; response splits into text blocks, cited ones carry a `citations` array (`cited_text`, `document_index`, `document_title`, location: `page_location` start/end 1-indexed for PDF, `char_location` for text); **incompatible with `output_config.format`** |
| S9 | skill | claude-api skill — Models table + structured-outputs support | 2026-06-22 | Current models (Opus 4.8/4.7/4.6, Sonnet 4.6, Haiku 4.5) support vision/PDF; structured outputs supported on Fable 5 / Opus 4.8 / Sonnet 4.6 / Haiku 4.5 — but not jointly with citations |
| S10 | skill | claude-api skill — `shared/platform-availability.md` | 2026-06-22 | Bedrock: PDF input ✅, Citations ✅, but Files API ❌ and `inference_geo` (data residency) ❌; automatic prompt caching ❌. First-party + Claude-Platform-on-AWS have the full surface |
| S11 | skill | claude-api skill — Provider Clients (Amazon Bedrock) + `shared/claude-platform-on-aws.md` | 2026-06-22 | Bedrock via `AnthropicBedrockMantle` client, `anthropic.`-prefixed model IDs, region required; Bedrock is partner-operated (AWS data controls) vs Claude-Platform-on-AWS (Anthropic-operated, same-day parity) |
| S12 | web | https://towardsdatascience.com/llm-powered-parsing-and-analysis-of-semi-structured-structured-documents-f03ac92f063e/ | 2026-06-22 | LLM extraction must instruct field meanings, output 'N/A' when absent, never invent — supports grounding-only + gap handling |
| S13 | web | https://www.hyperscience.ai/blog/llm-first-document-workflows-whats-real-vs-hype/ | 2026-06-22 | LLMs are "strategic accelerators within a broader IDP pipeline," not the trusted final authority for precision field capture — argues for OCR layer + LLM downstream (the hybrid) |

## Excerpts

### S1 — Textract response Block objects + Geometry
https://docs.aws.amazon.com/textract/latest/dg/how-it-works-document-layout.html
> "Amazon Textract returns a representation of a document as a list of different types of Block objects ... The following is the JSON for a typical Block object of type PAGE. { "Blocks": [ { "Geometry": { "BoundingBox": {...}, "Polygon": [...] }, ... "BlockType": "PAGE" } ], "DocumentMetadata": { "Pages": 1 } }"
> "Amazon Textract operations ... return location information about the location of detected items on a document page. To get the location, use the Geometry field of the Block object."

### S2 — Layout + Queries
https://docs.aws.amazon.com/textract/latest/dg/how-it-works-analyzing.html
> "These elements are paragraphs, lists, headers, footers, page numbers, figures, tables, titles, and section headers. When analyzing the layout of a document, Amazon Textract returns a bounding box location of the layout elements as well as the text in those elements."
> "you may add queries to your analysis ... passing a question ... Amazon Textract will then find the information in the document for that question and return it in a response structure separate from the rest of the document's information."

### S3 — Bounding boxes on every element
https://aws.amazon.com/textract/features/
> "All extracted data is returned with bounding box coordinates—polygon frames that encompass each piece of identified data, such as a word, a line, a table, or individual cells within a table."

### S4 — Confidence scores + thresholds
https://aws.amazon.com/textract/faqs/
> "if you are extracting information from tax documents you can set custom rules to flag any extracted information with a confidence score lower than 95%. Also, all extracted data are returned with bounding box coordinates ... so that you can quickly identify where a word or number appears on a document."

### S6 — OCR-as-layer pattern + scan-quality caveat
https://www.llamaindex.ai/glossary/what-is-amazon-textract
> "performance can vary with very low-resolution scans, highly unstructured layouts, or heavily cursive handwriting. In many production architectures, traditional OCR services like Textract serve as an initial extraction layer, followed by additional validation logic, schema enforcement, and normalization steps."

### S7 — Claude native PDF
claude-api skill, Document & File Input (Quick Reference)
> "PDF (base64, no beta): {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": <b64 string>}} ... Limits: 32 MB request, 600 pages (100 for 200k-context models)."

### S8 — Claude Citations + incompatibility
claude-api skill, Citations (no beta)
> "set citations: {enabled: true} on each document content block ... cited blocks carry a citations array. Each citation has cited_text, document_index, document_title, and a location by type: char_location (start_char_index/end_char_index) for plain text, page_location (start_page_number/end_page_number, 1-indexed) for PDF, content_block_location for custom content. Incompatible with output_config.format."

### S10 — Bedrock feature availability
claude-api skill, shared/platform-availability.md
> Rows: "PDF input ✅ (Bedrock)", "Citations ✅ (Bedrock)", "Files API β/❌ — Bedrock ❌", "`inference_geo` (data residency) ✅ 1P/P-AWS, ❌ Bedrock", "Automatic prompt caching ❌ Bedrock".

### S13 — LLMs as accelerators, not authority
https://www.hyperscience.ai/blog/llm-first-document-workflows-whats-real-vs-hype/
> "Rather than being the center of gravity, LLMs should be thought of as strategic accelerators within a broader IDP pipeline."
