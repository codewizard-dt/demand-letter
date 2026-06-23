---
id: hipaa-soc2-compliance-aws
title: HIPAA and SOC 2 Compliance on AWS
aliases: [HIPAA compliance, SOC2 compliance, PHI compliance, compliance framework]
updated: 2026-06-22
sources:
  - ../../raw/research/textract-soc2-hipaa-aws-compliance/index.md
tags: [compliance, hipaa, soc2, phi, pii, encryption, aws]
---

# HIPAA and SOC 2 Compliance on AWS

derived_from::[[../../raw/research/textract-soc2-hipaa-aws-compliance/index.md]] | relates_to::[[../entities/tools/aws-textract.md]] | relates_to::[[../entities/tools/aws-kms.md]] | relates_to::[[../entities/tools/aws-comprehend-medical.md]] | relates_to::[[../entities/tools/anthropic-claude.md]]

## The Two Standards

**HIPAA** (Health Insurance Portability and Accountability Act) is a U.S. federal law governing **Protected Health Information (PHI)** — the 18 HIPAA identifiers (patient names, dates, MRNs, diagnoses, providers, ages, geographic data, etc.). It applies to covered entities (healthcare providers, insurers) and their **business associates** (any vendor that processes PHI on their behalf, including software platforms). Operating as a business associate requires signing a **Business Associate Agreement (BAA)**. On AWS, the BAA is signed via AWS Artifact before any PHI enters the account; only HIPAA-eligible services may touch PHI.

**SOC 2** (Service Organization Control 2) is an AICPA audit framework assessing controls across five **Trust Services Criteria** (Security, Availability, Processing Integrity, Confidentiality, Privacy). Security (CC1–CC9) is mandatory in every audit. Unlike HIPAA, SOC 2 covers **all confidential information and personal information** — not just health data. PII (email, phone, SSN, addresses, names unconnected to health records) falls under SOC 2's Confidentiality and Privacy criteria. SOC 2 does not prescribe specific technologies; it requires controls that achieve the security objective.

## Encryption vs Redaction: The Core Distinction

**Neither HIPAA nor SOC 2 requires redacting PHI/PII out of the primary data store.** The correct compliance mechanism for stored data is **encryption**:

- HIPAA § 164.312(a)(2)(iv) — encryption at rest is "addressable," but the AWS BAA contractually requires it regardless. The December 2024 NPRM proposes to remove the addressable/required distinction entirely (pending regulatory freeze; compliance deadlines expected ~180 days after the final 2026/2027 rule).
- SOC 2 CC6.1 (Logical Access Controls) and CC6.7 (Transmission, Movement, and Removal) make encryption at rest a de facto requirement.

**Redaction is required in specific, narrower contexts:**

| Context | Standard requiring it | Scope |
|---------|----------------------|-------|
| CloudWatch / application logs | HIPAA (PHI) + SOC 2 (PII + PHI) | All personal/health data must be scrubbed before logging |
| LLM prompt/completion logs | SOC 2 CC6.8 / AI auditor expectations | PII and PHI redacted before log write |
| Test/dev environments | Best practice (both) | Use de-identified data |
| Data shared outside HIPAA boundary | HIPAA (de-identification required) | Safe Harbor or Expert Determination |

**Logs are the critical gap:** HIPAA covers PHI in logs; SOC 2 covers both PHI and general PII. For this project both categories appear — PHI from medical records, PII from attorney/client contact data — so logs must be scrubbed of both.

## AWS Compliance Stack (Three Tiers)

**Tier 1 — Day zero (mandatory before first PHI enters):**
- Sign the **AWS BAA** via AWS Artifact.
- Enable **KMS CMK encryption** on RDS at creation time (cannot be retrofitted without snapshot-restore).
- Enable **S3 SSE-KMS** on all PHI-bearing buckets; block all public access.
- Enforce **TLS 1.2+** on all connections (ALB/API Gateway, Lambda→RDS, external APIs).
- Enable **CloudTrail** in all regions; logs to a dedicated encrypted S3 bucket with MFA delete.
- Enable **AWS Config + HIPAA Conformance Pack** for automated drift detection.

**Tier 2 — Before storing Textract output in PostgreSQL:**
- Run **Comprehend Medical** (PHI) + **Amazon Comprehend** (general PII) on block text after Textract — detect and tag PHI/PII offsets before Postgres INSERT; never log raw block text.
- Neither Comprehend service redacts — both detect only. A custom inline redaction step is required.

**Tier 3 — Post-MVP / compliance review gate:**
- **AWS Security Hub** with HIPAA + SOC 2 conformance packs for centralised findings.
- **Amazon Macie** on PHI-bearing S3 buckets for automatic sensitive-data scanning.
- **Full de-identification** if the compliance review requires PHI removed from PostgreSQL: either inline Comprehend Medical + redaction (Node, no sidecar) or **Presidio** (Python, broader PII surface, requires ECS Fargate sidecar). Key caution: redacting too aggressively from the provenance store breaks the attorney citation flow — keep the full encrypted text in the DB; redact only developer-facing views.

## Presidio vs AWS-Native for Log/Store Scrubbing

The AWS-native path (Comprehend Medical + Comprehend) requires **two separate SDK calls** plus a **custom redaction step**, because neither service redacts. **Presidio** (Microsoft OSS) is a single library that handles the full PII surface (all categories — names, email, phone, SSN, credit cards, passports, NPI numbers, etc.) plus clinical PHI via an optional HuggingFace transformer, and it performs actual anonymization (redact/replace/mask/hash) natively. This makes Presidio a stronger long-term de-identification solution. Its drawback for this stack is that it is **Python-only** and requires a sidecar microservice (ECS Fargate), which adds deployment complexity and scope. For the one-week MVP, Comprehend Medical + Comprehend inline in the Node Lambda is the pragmatic choice; Presidio on Fargate is the upgrade path. See relates_to::[[../../raw/research/presidio-phi-detection/index.md]].
