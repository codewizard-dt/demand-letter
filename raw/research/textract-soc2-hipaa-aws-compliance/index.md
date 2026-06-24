---
topic: 'Textract, SOC2, HIPAA, and solutions for compliance for both of those within the AWS ecosystem'
slug: textract-soc2-hipaa-aws-compliance
researched: 2026-06-22
sources: [./sources.md]
---

# Research: Textract, SOC2, HIPAA, and AWS Compliance Solutions

> **Executive summary:** AWS Textract is formally HIPAA-eligible (covered under the AWS BAA) and SOC 2–compliant, so it is safe to process PHI through it. Neither HIPAA nor SOC 2 requires _redaction_ of the primary data store — they require **encryption at rest** (KMS + RDS/S3 encryption) plus access controls and audit logging. Redaction is required in a narrower set of contexts: CloudWatch/application logs must never contain plaintext PHI, and test environments should use de-identified data. The practical build checklist for this stack is: sign the AWS BAA, enable KMS-backed encryption on every storage tier (RDS, S3, EBS), enforce TLS everywhere, scrub PHI from Lambda logs before CloudWatch, enable CloudTrail, and — as a defence-in-depth step post-MVP — add an AWS Comprehend Medical + inline-redaction pass after Textract and before writing block text to PostgreSQL.

---

## Research Questions

1. What is Textract's exact role in the pipeline, and is it HIPAA/SOC 2 compliant?
2. Does HIPAA require encryption at rest, or is it truly optional ("addressable")? What changed in late 2024?
3. Does SOC 2 require encryption at rest? Under which criteria?
4. Is "redaction at rest" (removing PHI/PII from the primary data store) a hard requirement under either standard?
5. What AWS services address HIPAA and SOC 2 compliance for this stack (Textract → Claude-on-Bedrock → PostgreSQL → Lambda)?

---

## Current State (Codebase)

No application code exists yet. Architectural context established by prior decisions:

- **DEC-0003#D1 (proposed):** Hybrid Textract→Claude ingestion pipeline — Textract produces bbox+page+confidence Block objects, Claude extracts the canonical field schema grounded in those blocks (`raw/research/source-document-ingestion-provenance/index.md`).
- **DEC-0003#D2 (proposed):** Claude inference on Amazon Bedrock — PHI stays inside the AWS account under HIPAA-eligible controls; no external vendor BAA required beyond AWS's.
- **`raw/research/presidio-phi-detection/index.md`:** Assessed Presidio as a PII/PHI detection+anonymization sidecar; recommended deferring to post-MVP in favour of AWS Comprehend Medical for the detection step inline in Node Lambda.
- **Stack:** TypeScript/React/Node.js/AWS Lambda/PostgreSQL. Textract output stored in PostgreSQL as the provenance backing store.

---

## Key Findings

### 1. Textract is HIPAA-eligible and SOC 2-compliant [S1][S2][S3]

AWS Textract is formally listed in the AWS HIPAA Eligible Services Reference and is covered under the AWS Business Associate Addendum (BAA). It achieved SOC 1, SOC 2, and ISO compliance in 2020 [S2]. The AWS HIPAA Compliance Whitepaper explicitly lists Textract as a service customers can use with PHI once the BAA is signed [S3]. This means the DEC-0003 hybrid pipeline — Textract for OCR/layout followed by Claude on Bedrock for extraction — stays entirely within an AWS HIPAA-eligible boundary.

**Textract's exact role** (from DEC-0003#D1): Textract is the **OCR/layout extraction layer only** — not a semantic extractor. It receives scanned PDFs/images, returns `Block` objects (type, text, bounding box, page number, confidence score), and hands that structured output to Claude. Claude reads the Textract output and emits the canonical ~40-field schema, with each field tagged to the Textract block IDs it was drawn from. The Textract blocks are then persisted to PostgreSQL as the citation backing store. Textract does zero reasoning or field classification — that is entirely Claude's job.

### 2. HIPAA encryption at rest: technically "addressable," practically and contractually mandatory [S4][S5][S6][S7]

The HIPAA Security Rule classifies encryption of ePHI at rest under § 164.312(a)(2)(iv) as an **"addressable" implementation specification**, not a "required" one [S4]. In HIPAA's framework, "addressable" means: implement it, OR document why an equivalent alternative is reasonable and appropriate, OR document why neither is necessary. It does **not** mean optional. [S7]

Two additional factors make it effectively mandatory in practice:

- **AWS's BAA contractually requires it:** The AWS HIPAA Compliance Whitepaper states explicitly that "although this is an addressable implementation specification in HIPAA, **AWS requires customers to encrypt PHI stored in or transmitted using HIPAA-eligible services**" [S3]. Signing the AWS BAA binds the customer to this requirement.
- **The 2026 HIPAA Security Rule update removes the distinction entirely:** A Notice of Proposed Rulemaking (NPRM) published 27 December 2024 proposes to eliminate the "required" vs "addressable" distinction and make all implementation specifications — including encryption of ePHI at rest and in transit — **mandatory** with limited exceptions [S5][S6]. The rule is under a regulatory freeze as of mid-2026 and not yet in force, but the direction is unambiguous. Compliance deadlines are expected 180 days after the final rule is published (late 2026 / early 2027).

**Bottom line:** Treat encryption of ePHI at rest as a hard requirement now. Do not rely on the "addressable" label.

### 3. SOC 2 encryption at rest: required under CC6.1 and CC6.7 [S8][S9][S10]

SOC 2 is a framework-based audit standard, not a law — it does not prescribe specific technologies. However, the AICPA Trust Services Criteria make encryption of data at rest a de facto requirement under:

- **CC6.1 (Logical Access Controls):** "Encryption of data at rest is a primary control here" to protect against unauthorized use of information assets [S9].
- **CC6.7 (Transmission, Movement, and Removal):** Requires encryption technologies or secured communication channels; also explicitly covers removable media and mobile devices [S8][S10].

The Confidentiality criteria (C1.1, C1.2) additionally require controls over access to and disposal of confidential information (which includes PII/PHI). From the July 2025 AWS SOC 2 Compliance Guide: encryption of sensitive data in transit and at rest (S3 bucket policies, RDS, EBS, DynamoDB via KMS) maps directly to CC6.6 [S10].

### 4. Redaction at rest: NOT a hard requirement; encryption is the mechanism [S3][S11][S12]

Neither HIPAA nor SOC 2 requires **redacting PHI/PII out of the primary data store**. The standard mechanism for protecting PHI/PII in storage is **encryption**, not removal. Redaction has a distinct, narrower set of required contexts:

| Context                                        | Redaction required?                              | Reason                                                                              |
| ---------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Primary database (PostgreSQL provenance store) | ❌ — encryption (KMS) suffices                   | HIPAA § 164.312(a)(2)(iv); SOC 2 CC6.1                                              |
| S3 bucket storing raw case documents           | ❌ — SSE-KMS suffices                            | Same                                                                                |
| CloudWatch / application logs                  | ✅ **Yes — PHI must be scrubbed before logging** | PHI must not appear in plaintext in any logging system; [S11] explicitly notes this |
| Test / development environments                | ✅ Best practice (de-identified data)            | Avoids PHI exposure to developers who don't need it                                 |
| Data shared outside the HIPAA boundary         | ✅ Required for de-identification                | Safe Harbor or Expert Determination methods                                         |
| LLM prompt/completion logs                     | ✅ For SOC 2 (CC6.8 / AI auditor expectations)   | "Apply PII/PHI redaction before the log is written" [S12]                           |

**The Textract provenance store in PostgreSQL (block text, page, bbox, confidence)** must be stored in an **encrypted RDS instance** (KMS). It does not need to have PHI redacted out of it — the encrypted store is the compliant mechanism. De-identification of that store is a defence-in-depth option (and valuable for developer access ergonomics), but is not mandated.

### 5. AWS services for HIPAA + SOC 2 compliance on this stack [S3][S10][S13][S14]

#### Tier 1: Mandatory baseline (encrypt everything, enable audit logging)

| AWS Service                             | Purpose                                                          | Notes                                                                             |
| --------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **AWS KMS**                             | Encryption key management for all storage tiers                  | Customer-managed keys (CMK) give key rotation + access audit                      |
| **RDS Encryption at Rest**              | Encrypt PostgreSQL provenance store                              | Enable at DB creation; uses KMS CMK                                               |
| **S3 SSE-KMS**                          | Encrypt raw case-document buckets                                | `aws:kms` SSEAlgorithm; block all public access                                   |
| **TLS 1.2+ everywhere**                 | Encrypt all data in transit                                      | Enforced at ALB/API Gateway; Lambda→RDS via SSL                                   |
| **AWS CloudTrail**                      | Audit log for all API calls (Textract, Bedrock, RDS, S3, Lambda) | Enable in all regions; store logs in separate encrypted S3 bucket with MFA delete |
| **AWS Config + HIPAA Conformance Pack** | Automated compliance rule checks                                 | Flags unencrypted resources, public S3, open security groups                      |
| **AWS Artifact (BAA)**                  | Sign the AWS Business Associate Addendum                         | Must be done before any PHI enters the account                                    |

#### Tier 2: PHI/PII detection and log scrubbing

| AWS Service                     | Purpose                                                                                               | Notes                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Amazon Comprehend Medical**   | Detect HIPAA PHI entities (patient names, dates, MRNs, diagnoses, providers) with offset + confidence | Native `@aws-sdk/client-comprehendmedical`; HIPAA-eligible; $0.01 / 100 chars                                                |
| **Amazon Comprehend** (general) | Detect general PII (names, email, phone, SSN, addresses)                                              | Native TS/Node SDK; use `ContainsPiiEntities` / `DetectPiiEntities`                                                          |
| **Log scrubbing in Lambda**     | Strip PHI before writing to CloudWatch                                                                | Run Comprehend detection on Textract block text; replace detected entities before logging; never log raw medical record text |

> **Note on Presidio:** Presidio (Microsoft OSS) is a _general-purpose PII detection and anonymization_ library — it covers all PII categories (names, email, phone, SSN, credit cards, addresses, NPI numbers, passports, etc.) as well as clinical PHI via an optional HuggingFace transformer recognizer. It is broader than Comprehend Medical. However, it is Python-only and requires a sidecar deployment (see `raw/research/presidio-phi-detection/index.md`). For this stack's near-term needs (PHI scrubbing from block text before Postgres, log redaction), Comprehend Medical + Comprehend covers the same ground natively in Node without a sidecar.

#### Tier 3: Defence-in-depth (post-MVP)

| Control                               | Purpose                                                                        | AWS Service                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| De-identification of provenance store | Allow developer DB access without PHI exposure                                 | Comprehend Medical detection + inline Node redaction step after Textract, before Postgres INSERT |
| CloudWatch log insights filtering     | Ensure no PHI leaks in Lambda logs                                             | Lambda log filter patterns; structured JSON logging                                              |
| AWS Macie                             | Detect PII/PHI accidentally left in S3 buckets                                 | Automated scan; alerts on unexpected sensitive data                                              |
| AWS Security Hub                      | Aggregate findings from Config, GuardDuty, Macie into one compliance dashboard | Enable HIPAA and SOC 2 conformance packs                                                         |
| VPC private subnets                   | Isolate RDS / Lambda from public internet                                      | PHI-bearing services in private subnets; no public IPs                                           |

---

## Constraints

- No Python runtime in the current stack — any Python tool (Presidio) requires a sidecar microservice.
- PHI is already bounded by DEC-0003#D2 (Bedrock) — it does not leave the AWS account.
- One-week build timeline (PRD) — base encryption controls (KMS, RDS at-rest, S3 SSE) are one-day setup; full Comprehend Medical + de-identification pipeline is post-MVP scope.
- AWS BAA must be signed (via AWS Artifact) before any PHI enters the account — this is a day-zero administrative prerequisite.

---

## Solution Comparison: PHI/PII scrubbing approaches

| Criteria          | A. Comprehend Medical + Comprehend (inline Node) | B. Presidio (Python sidecar)                     | C. Bedrock-only (no scrubbing) |
| ----------------- | ------------------------------------------------ | ------------------------------------------------ | ------------------------------ |
| **Covers**        | PHI (HIPAA 18 identifiers) + general PII         | All PII + clinical PHI (with transformers model) | n/a                            |
| **Stack fit**     | ✅ native `@aws-sdk` TS/Node                     | ❌ Python REST sidecar                           | ✅ no new code                 |
| **AWS residency** | ✅ managed AWS service                           | ✅ self-hosted in AWS                            | ✅ (Bedrock already)           |
| **Anonymization** | ❌ detect only; pair with custom redact step     | ✅ detect + redact/replace/mask/hash             | n/a                            |
| **Lambda deploy** | ✅ API call, no infra                            | ❌ container image; cold-start risk              | ✅ no change                   |
| **Build cost**    | Low — add SDK call + redact utility              | High — new sidecar + Docker + REST client        | Minimal                        |
| **Residual risk** | Developers with DB access can see PHI block text | Minimised — PHI stripped before Postgres         | Developers see PHI in DB       |

---

## Recommendation

**Build order: encryption first, scrubbing second, de-identification third.**

### Phase 1 — Day zero (before first PHI enters the system)

1. **Sign the AWS BAA** via AWS Artifact.
2. **Enable KMS CMK encryption** on the RDS PostgreSQL instance (Textract provenance store) — set at database creation time; cannot be added to an existing unencrypted instance without a snapshot-restore.
3. **Enable SSE-KMS on all S3 buckets** that store raw case documents; block all public access.
4. **Enforce TLS** on every connection: ALB → Lambda, Lambda → RDS, all external API calls.
5. **Enable CloudTrail** across all regions; store logs in a dedicated encrypted S3 bucket with MFA delete.

### Phase 2 — Before storing Textract output in PostgreSQL

6. **Scrub PHI from Lambda logs** — never log raw Textract block text; use structured logging with entity-type labels rather than text content.
7. **Add an Comprehend Medical detection pass** after Textract, before writing block text to PostgreSQL. Detected PHI offsets can be stored as metadata so the attorney UI can mask them by default in developer-facing views. This is the minimum viable scrubbing step and stays entirely in Node.

### Phase 3 — Post-MVP (compliance review gate)

8. **Add AWS Security Hub** with HIPAA and SOC 2 conformance packs to get automated drift detection.
9. **Add Amazon Macie** on PHI-bearing S3 buckets for automatic sensitive-data scanning.
10. **If full anonymization is required** (e.g., for test data generation, or a compliance review flags the raw PHI in Postgres): build an **inline redaction step** that replaces Comprehend Medical–detected entities with `[PATIENT_NAME]`-style tokens before the Postgres INSERT. This is the same approach as the AWS official sample `aws-samples/aws-ai-phi-deidentification` but inline in Node rather than a sidecar [S13].

**Risks & mitigations:**

- _Redacting too aggressively before Postgres_ → the provenance store is the citation backing store; if block text is stripped, the attorney cannot click to verify the source. **Redact only the developer/ops view; keep the full text encrypted in the DB** (or store both a redacted and an encrypted-original version).
- _2026 HIPAA rule change lands before the system is in production_ → encryption baseline already satisfies the proposed rule; encryption-at-rest on every tier is sufficient.
- _Comprehend Medical misses entities_ → use confidence thresholds and treat detection as best-effort scrubbing for logs; the primary protection is encryption, not detection.
- _Textract sees PHI before Comprehend runs_ → Textract itself is HIPAA-eligible; the PHI is safe in transit and at Textract's processing layer.

---

## Next Steps

- **Immediate:** `/task-add: Sign AWS BAA and enable KMS encryption on RDS + S3 before first PHI ingestion` — prerequisite for any case-record work.
- **Near-term:** `/task-add: Add Comprehend Medical PHI detection pass after Textract; strip PHI from Lambda logs before CloudWatch` — references DEC-0003#D1.
- **Decision:** DEC-0003#D2 is already accepted (Bedrock). No new architectural decision needed from this research; findings update the compliance context only.
- **Wiki:** `/wiki-ingest raw/research/textract-soc2-hipaa-aws-compliance/index.md` to synthesize into the knowledge base.
