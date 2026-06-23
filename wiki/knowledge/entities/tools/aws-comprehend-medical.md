---
id: aws-comprehend-medical
title: AWS Comprehend Medical
aliases: [Amazon Comprehend Medical, Comprehend Medical]
updated: 2026-06-22
sources:
  - ../../../raw/research/textract-soc2-hipaa-aws-compliance/index.md
  - ../../../raw/research/presidio-phi-detection/index.md
tags: [aws, phi-detection, hipaa-eligible, pii, nlp]
---

# AWS Comprehend Medical

relates_to::[[../../sources/textract-soc2-hipaa-aws-compliance.md]] | relates_to::[[aws-textract.md]] | relates_to::[[anthropic-claude.md]] | chosen_by::[[../../../work/decisions/DEC-0004-phi-pii-scrubbing-engine.md|DEC-0004#D1: PHI/PII Scrubbing Engine]]

AWS Comprehend Medical is a managed NLP service that detects **Protected Health Information (PHI)** entities in clinical text. It returns detected entities with their type, text, offset (start/end character position), and confidence score. The `DetectPHI` operation specifically targets the HIPAA 18 PHI identifiers (patient names, dates, MRNs, ages, providers, diagnoses, medications, etc.). It is **HIPAA-eligible** and callable via the native `@aws-sdk/client-comprehendmedical` Node/TypeScript SDK — no sidecar required. Pricing: $0.01 per 100 characters.

**Scope limitation:** Comprehend Medical covers PHI only — not general PII (email, phone, SSN, credit cards, addresses unrelated to a health record). For full PII coverage, pair with **Amazon Comprehend** (general), which provides `DetectPiiEntities` / `ContainsPiiEntities` for the broader PII surface. Both services detect only — neither redacts. A custom redaction step is required to replace detected offsets with `[PATIENT_NAME]`-style tokens or equivalent.

**Role in this project:** Tier-2 compliance control. After Textract produces block text, run Comprehend Medical + Comprehend (general) on that text before: (a) writing it to PostgreSQL (tag PHI offsets as metadata so developer-facing views can mask by default), and (b) writing any log output to CloudWatch (HIPAA requires PHI scrubbed from logs; SOC 2 requires both PHI and PII scrubbed). The AWS official sample `aws-samples/aws-ai-phi-deidentification` demonstrates the Textract + Comprehend Medical + redaction pattern as a CDK-deployed pipeline.

**vs Presidio:** Presidio (Microsoft OSS) is a single library covering the full PII surface (all categories) plus clinical PHI — a stronger long-term de-identification solution — but it is Python-only and requires a sidecar service. For a TS/Node/Lambda stack, Comprehend Medical + Comprehend is the path of least resistance for MVP; Presidio on ECS Fargate is the upgrade path if full anonymization is required. See relates_to::[[../../sources/textract-soc2-hipaa-aws-compliance.md]].
