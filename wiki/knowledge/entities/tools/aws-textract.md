---
id: aws-textract
title: AWS Textract
aliases: [Amazon Textract, Textract]
updated: 2026-06-22
sources:
  - ../../../raw/research/textract-soc2-hipaa-aws-compliance/index.md
  - ../../../raw/research/source-document-ingestion-provenance/index.md
tags: [aws, ocr, hipaa-eligible, soc2, ingestion]
---

# AWS Textract

relates_to::[[../../sources/textract-soc2-hipaa-aws-compliance.md]] | relates_to::[[../../sources/demand-letter-agentic-inputs.md]] | uses::[[aws-kms.md]] | relates_to::[[anthropic-claude.md]]

AWS Textract is a managed ML service that extracts text and structured data from documents (PDFs and images). It returns **Block objects** — each with a type (PAGE, LINE, WORD, TABLE, CELL, FORM key-value, QUERY result), extracted text, a **bounding box + polygon**, a **page number**, and a **confidence score**. Layout analysis adds semantic region types (paragraphs, headers, titles, tables, lists). Queries let callers ask targeted questions ("What is the date of loss?") and receive the answer with its locator.

**Role in this project (DEC-0003#D1):** Textract is the **OCR/layout extraction layer only** in the hybrid Textract→Claude ingestion pipeline. It processes scanned PDFs and images; native PDFs and `.docx` bypass it. Its output (Block objects) is persisted to PostgreSQL as the citation backing store. Textract performs no semantic reasoning — Claude on Bedrock reads the blocks and extracts the canonical ~40-field schema, with each field tagged to the block ID(s) it came from. The bounding-box locators are what make per-field citation-to-rectangle possible for the attorney UI.

**Compliance:** HIPAA-eligible (AWS BAA covers it; achieved SOC 1, SOC 2, and ISO compliance in 2020). Safe to process PHI through once the BAA is signed. Data is encrypted in transit (TLS) within the AWS service boundary. The PostgreSQL store receiving the block text must be independently encrypted (KMS-backed RDS).

**Testing:** `textract-client.ts` exports a module-level `TextractClient` singleton. Unit tests use `mockClient(TextractClient)` from `aws-sdk-client-mock` to intercept `StartDocumentAnalysis` and `GetDocumentAnalysis` commands without network access. See uses::[[aws-sdk-client-mock.md]].
