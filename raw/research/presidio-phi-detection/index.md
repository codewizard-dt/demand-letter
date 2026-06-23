---
topic: "Microsoft Presidio (https://microsoft.github.io/presidio/) — assess fit for our infrastructure and setup: TypeScript/React/Node.js/AWS Lambda/PostgreSQL, with the DEC-0003 hybrid Textract→Claude-on-Bedrock pipeline for medical-record ingestion and PHI already kept inside AWS. Determine what role (if any) Presidio would play, what it costs to integrate, and whether it is the right tool."
slug: presidio-phi-detection
researched: 2026-06-22
sources: [./sources.md]
---

# Research: Microsoft Presidio — Fit Assessment

> **The short answer:** Presidio is a strong, open-source PII/PHI detection and anonymization library, but it is a **poor direct fit for our stack** because it is **Python-only** with no native TS/Node bindings, requires loading multi-hundred-MB NLP models that are hostile to AWS Lambda's cold-start and size limits, and addresses a problem our architecture already handles differently — PHI never leaves the AWS account (DEC-0003#D2 chose Bedrock), so *anonymization-before-transmission* is not mandatory. Presidio would need to run as a **sidecar microservice** (Dockerized REST API), which adds operational complexity and a new deployment unit. The medical NER recognizer (HuggingFace `StanfordAIMI/stanford-deidentifier-base`) that would give useful PHI coverage requires the `transformers` extra and a model download at container-build time. **The strongest use case** for Presidio here would be a **de-identification pre-processing step** before storing raw Textract output in PostgreSQL, to strip patient names/dates/SSNs from the provenance store so developers can query it without PHI exposure — a valuable but not architecturally mandatory addition. If that use case is confirmed, deploy it as a separate Python microservice (ECS Fargate or a container-image Lambda), not in the Node Lambda.

## Research Questions

1. What does Presidio actually do, and what is its primary language/runtime?
2. Does it cover HIPAA PHI entity types relevant to medical records (diagnoses, medications, providers, dates, patient IDs)?
3. How would it integrate with a TS/Node/Lambda stack — is there a native client, REST API, or do we need a sidecar?
4. What are the deployment and cold-start implications on AWS Lambda?
5. Given DEC-0003 (Textract→Bedrock pipeline, PHI stays in AWS), what role — if any — should Presidio play?

## Current State (Codebase)

No application code yet. Architectural context:

- **DEC-0003#D1 (proposed):** Hybrid Textract→Claude ingestion pipeline — Textract produces bbox+page+confidence blocks, Claude extracts the canonical field schema grounded in those blocks.
- **DEC-0003#D2 (proposed):** Claude inference on Amazon Bedrock — PHI stays inside the AWS account under HIPAA-eligible controls.
- **`demand-letter-input-contract.md`:** Requires per-field provenance and grounding-only extraction; Textract blocks are stored in PostgreSQL as the provenance backing store.
- Stack: **TypeScript/React/Node.js/AWS Lambda/PostgreSQL**. No existing Python runtime.

## Key Findings

### 1. Presidio is Python-only; Node.js integration requires the REST API [S1][S4]

Presidio ships four Python packages (`presidio-analyzer`, `presidio-anonymizer`, `presidio-image-redactor`, `presidio-structured`) and exposes a **REST API** for both the Analyzer and Anonymizer. There is no npm package and no official Node.js SDK. The only Node integration paths are: (a) call the REST API via `fetch`/`axios`, or (b) spawn a Python child process. The production pattern for our stack is the REST API — which means Presidio must run as a **separate sidecar service**, not inline in the Node Lambda. [S1][S4]

### 2. Medical/PHI entity coverage requires a HuggingFace transformer model and is not included in the base install [S3][S6]

The base Presidio install (spaCy `en_core_web_lg`) covers general PII: names, email, phone, SSN, credit cards, addresses, IDs. **Medical NER** (diagnoses, medications, procedures, clinical events, anatomical structures, patient/staff names in clinical context) is a separate recognizer class `MedicalNERRecognizer` that requires `pip install "presidio_analyzer[transformers]"` and downloads a model such as `StanfordAIMI/stanford-deidentifier-base` from HuggingFace. This is HIPAA-relevant (patient names, dates, provider names in clinical text) but **comprehensive HIPAA PHI coverage requires integrating Azure Health Data Services**, which is an Azure-only paid service. [S3][S6]

### 3. Deployment on AWS Lambda is possible but non-trivial — spaCy/transformers bust the 250 MB package limit [S5][S7]

- The base spaCy `en_core_web_lg` model alone is ~560 MB; the `en_core_web_sm` is ~12 MB but has lower NER accuracy.
- The transformers model (`stanford-deidentifier-base`) adds ~400+ MB.
- Lambda's deployment package limit is 250 MB (unzipped), which spaCy + transformers will exceed.
- **Workaround:** use a **Docker container image Lambda** (up to 10 GB) — confirmed feasible in a Medium article specifically about Presidio on Lambda [S5]. The Dockerfile installs pip packages and NLP models at build time.
- **Cold start concern:** loading spaCy + a HuggingFace model at Lambda init time is heavy. Mitigation requires **Provisioned Concurrency** or moving Presidio off Lambda entirely (ECS Fargate, a long-running sidecar). [S7][S8]

### 4. The architecture question: do we need Presidio given Bedrock + Textract? [S2]

DEC-0003 chose Bedrock specifically so **PHI never leaves the AWS account** — there is no "sending PHI to a third-party API" problem that requires anonymization-before-transmission. The real PHI exposure risks in our pipeline are:

| Exposure surface | Does Presidio help? |
|------------------|---------------------|
| PHI sent to Claude inference | ❌ — already mitigated by Bedrock (in-account) |
| Raw Textract blocks stored in PostgreSQL | ✅ — strip/pseudonymize before persisting, so dev access to the DB doesn't expose patient names |
| Logs (CloudWatch, Lambda traces) | ✅ — scrub PHI before logging |
| Prompt text logged or cached | ✅ — scrub extraction prompts |

Presidio's most natural insertion point is **pre-storage** — after Textract but before writing block text into PostgreSQL, scan for and redact/pseudonymize free-text PHI so the provenance store is not itself a PHI store. This is architecturally optional (Bedrock addresses the transmission risk) but valuable for defence-in-depth and developer ergonomics.

### 5. Alternatives to Presidio for the targeted use case [S1][S3]

| Alternative | Trade-offs |
|-------------|------------|
| **AWS Comprehend Medical** | Managed, HIPAA-eligible, TS/Node SDK available (`@aws-sdk/client-comprehendmedical`), entity detection with offsets; costs per character; no anonymization (detect only) |
| **Amazon Macie** | S3-level PHI detection; coarser (file-level), not per-field; not in-line |
| **DIY regex/NLP** | Custom regex patterns for MRN, DOB, SSN; lower accuracy; no maintenance from MS |
| **Azure Health Data Services** | Full HIPAA de-id; Azure-only; not aligned with AWS infrastructure |

**AWS Comprehend Medical** is the strongest alternative: same AWS residency guarantee as Textract, native TS/Node SDK, returns entity type + offset + confidence (same locator model as Textract blocks), no separate service to deploy. It covers HIPAA PHI categories (patient names, dates, ages, providers, MRNs, etc.) natively. It does not *anonymize* (redact/replace) — only detects — but combined with a simple redaction step that's sufficient for the "scrub before Postgres" use case.

## Constraints

- **No Python runtime in the current stack** — any Python tool requires either a separate microservice or a container-image Lambda.
- **PHI already bounded by Bedrock** — anonymization-before-Claude is not required by DEC-0003.
- **Lambda cold-start sensitivity** — the ingestion pipeline is already multi-stage (Textract async + Claude); adding a third slow-starting service deserves scrutiny.
- **One-week build timeline** (PRD) — a new sidecar service + container image + REST client adds scope.

## Solution Comparison

| Criteria | A. Presidio (sidecar) | B. AWS Comprehend Medical | C. No PHI scrubbing (Bedrock-only) |
|----------|-----------------------|---------------------------|-------------------------------------|
| **What it does** | Detect + anonymize/redact text PHI | Detect PHI (offset + confidence); no anonymize | Accept that PHI stays in-account |
| **Stack fit** | Poor — Python REST sidecar | ✅ native `@aws-sdk` TS/Node | ✅ no integration needed |
| **AWS residency** | ✅ self-hosted in AWS | ✅ managed AWS service | ✅ (Bedrock already) |
| **Medical NER coverage** | Good with transformers model | ✅ HIPAA PHI native | n/a |
| **Anonymization** | ✅ redact/replace/mask/hash | ❌ detect only | n/a |
| **Lambda deploy** | ❌ container image; cold-start risk | ✅ API call, no infra | ✅ no change |
| **Build cost** | High — new sidecar, Docker, REST client | Low — add SDK call + redact step | Minimal |
| **Ongoing ops** | High — model version, container updates | Low — AWS managed | None |
| **HIPAA coverage** | Partial (base PII) / Good (+ transformers) | ✅ full HIPAA PHI | n/a |

## Recommendation

**Do not use Presidio in the current phase.** Instead:

1. **Short-term (one-week build):** Lean on DEC-0003's Bedrock decision to keep PHI in-account. Log and store Textract blocks with appropriate IAM controls; skip a scrubbing step for the MVP. Document the residual risk (developers with Postgres access can see PHI block text) for the BAA review.

2. **Near-term (post-MVP, if DB-level PHI scrubbing is required by the compliance review):** Use **AWS Comprehend Medical** as a detection step after Textract; build a redaction function inline in the Node Lambda that replaces detected PHI offsets in block text before Postgres insert. This is native TS/Node, stays in AWS, and avoids a sidecar.

3. **If full anonymization (not just detection) is required** — e.g., to share the provenance store externally or to de-identify for test data generation — *then* consider Presidio as a sidecar on **ECS Fargate** (long-lived, no cold-start), with the `[transformers]` extra and the Stanford de-identifier model, callable from the Lambda via internal HTTP. This is real scope and should be its own task.

**Risks & mitigations:**
- *Compliance review flags raw PHI in Postgres* → add Comprehend Medical detection + redaction inline (low build cost); or escalate to Presidio sidecar if full anonymization is needed.
- *Presidio model drift / maintenance* → if Presidio is adopted, pin the Docker image and model version; add CI to rebuild on security updates.
- *Comprehend Medical costs* → \$0.01 per 100 characters for medical entity detection; a 20-page medical record at ~50K chars ≈ $5 per document; model for MVP volume.

## Next Steps

- No `/decision-create` immediately — this finding updates the DEC-0003 context (no new decision needed; the PHI-posture decision is already DEC-0003#D2).
- `/wiki-ingest raw/research/presidio-phi-detection/index.md` to synthesize into the knowledge base.
- If the compliance review recommends DB-level PHI scrubbing: `/task-add: add Comprehend Medical detection + redaction step after Textract, before Postgres insert` — references DEC-0003#D1.
- If full anonymization/de-identification is required: `/task-add: design and deploy Presidio sidecar on ECS Fargate for de-identification pre-processing`.
