---
id: textract-soc2-hipaa-aws-compliance
title: Research — Textract, SOC2, HIPAA, and AWS Compliance Solutions
updated: 2026-06-22
sources:
  - ../../raw/research/textract-soc2-hipaa-aws-compliance/index.md
tags: [compliance, hipaa, soc2, textract, aws, phi, pii, encryption]
---

# Research — Textract, SOC2, HIPAA, and AWS Compliance Solutions

derived_from::[[../../raw/research/textract-soc2-hipaa-aws-compliance/index.md]] | relates_to::[[../entities/tools/aws-textract.md]] | relates_to::[[../entities/tools/aws-comprehend-medical.md]] | relates_to::[[../entities/tools/aws-kms.md]] | relates_to::[[../entities/tools/anthropic-claude.md]] | relates_to::[[../concepts/hipaa-soc2-compliance-aws.md]] | relates_to::[[../../raw/research/presidio-phi-detection/index.md]]

## What This Source Is

A focused compliance research report (2026-06-22) answering three questions the DEC-0003 decisions left open: (1) Is Textract itself HIPAA/SOC 2 compliant? (2) Is encryption or redaction at rest the hard requirement? (3) What AWS services are needed to satisfy both standards on the TS/Node/Lambda/PostgreSQL stack?

## Textract's Compliance Status and Exact Role

**AWS Textract is both HIPAA-eligible and SOC 2–compliant.** It is covered under the AWS Business Associate Addendum (BAA) and achieved SOC 1, SOC 2, and ISO compliance in 2020. The DEC-0003 hybrid pipeline (Textract → Claude on Bedrock) stays entirely within an AWS HIPAA-eligible boundary.

Textract's role is the **OCR/layout extraction layer only** — it processes scanned PDFs/images and returns `Block` objects (text, bounding box, page number, confidence score). It does zero semantic reasoning. Claude on Bedrock reads those blocks and emits the canonical field schema. The blocks are persisted to PostgreSQL as the citation backing store.

## Encryption vs Redaction: What Each Standard Actually Requires

**Neither HIPAA nor SOC 2 requires redacting PHI/PII out of the primary data store.** The correct mechanism for stored data is **encryption** (KMS-backed RDS + S3 SSE-KMS). Redaction is required in a narrower set of contexts:

- **CloudWatch / application logs** — HIPAA requires PHI scrubbed before logging; SOC 2 requires *both* PII and PHI scrubbed (SOC 2 covers all confidential/personal information, not just health data).
- **LLM prompt/completion logs** — SOC 2 auditors explicitly test for PII/PHI redaction before log writes (CC6.8 / AI company guidance).
- **Test/dev environments** — best practice to use de-identified data.
- **Data shared outside the HIPAA boundary** — de-identification required (Safe Harbor or Expert Determination).

**HIPAA encryption at rest** is technically "addressable" under § 164.312(a)(2)(iv) but: (a) the AWS BAA contractually requires it regardless; (b) the December 2024 NPRM proposes to eliminate the addressable/required distinction entirely, making encryption mandatory — under regulatory freeze as of mid-2026 but directionally unambiguous. Treat it as a hard requirement.

**SOC 2 CC6.1 and CC6.7** make encryption at rest a de facto requirement, mapped directly to KMS + RDS + S3 SSE-KMS.

## PHI vs PII in Logs: Both Must Be Scrubbed

HIPAA only covers PHI (the 18 HIPAA identifiers). SOC 2 covers all personal information — including general PII (email, phone, SSN, addresses, names not connected to a health record). For this project both categories appear in logs: PHI from medical records, and PII from attorney/client contact data. Both must be scrubbed.

The AWS-native path uses two separate services: **Comprehend Medical** for PHI detection + **Amazon Comprehend** for general PII detection — then a custom redaction step, since neither service redacts (they detect only). **Presidio** is a single Python library that handles the full PII surface (all categories) plus clinical PHI via the optional transformer recognizer, making it a stronger long-term solution despite the sidecar deployment cost. See relates_to::[[../../raw/research/presidio-phi-detection/index.md]].

## AWS Compliance Stack (Three Tiers)

**Tier 1 — Day zero (mandatory before first PHI enters the account):** Sign the AWS BAA (AWS Artifact); enable KMS CMK encryption on RDS (must be set at creation — cannot add later without snapshot-restore); enable S3 SSE-KMS; enforce TLS everywhere; enable CloudTrail in all regions.

**Tier 2 — Before storing Textract output in PostgreSQL:** Scrub PHI and PII from Lambda logs (never log raw block text); run Comprehend Medical detection after Textract to tag PHI offsets in block text before Postgres INSERT.

**Tier 3 — Post-MVP:** AWS Security Hub (HIPAA + SOC 2 conformance packs); Amazon Macie on PHI-bearing S3 buckets; full de-identification (Comprehend Medical + inline redaction, or Presidio sidecar on ECS Fargate) if the compliance review requires raw PHI removed from PostgreSQL. Key caution: redacting too aggressively from the provenance store breaks the attorney citation flow — keep the full encrypted text in the DB; redact only developer-facing views.
