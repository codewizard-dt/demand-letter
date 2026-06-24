# PHI/PII Scrubbing Engine (DEC-0004#D1 — accepted 2026-06-22)

## Decision

Scrub PHI + PII from logs and Textract block text with the **AWS-native pair, inline in the Node Lambda**:

- **Comprehend Medical** (`DetectPHI`, `@aws-sdk/client-comprehendmedical`) → HIPAA 18 PHI identifiers
- **Amazon Comprehend** (`DetectPiiEntities`) → general PII (names, email, phone, SSN, addresses)
- **+ a custom redaction step we write** — replace returned offsets with `[PATIENT_NAME]`-style tokens

Chosen over Microsoft Presidio and over no-scrubbing.

## Critical gotchas / constraints

- **Both Comprehend services DETECT ONLY — neither redacts.** You must build and test the redaction function yourself (watch offset overlap / off-by-one). Fail closed on detection error (drop or hard-mask the write).
- **Both PHI _and_ PII must be scrubbed from logs**: HIPAA covers PHI; SOC 2 covers all PII. Two SDK calls per document.
- **Presidio is Python-only** — no npm/Node SDK. It would need a REST sidecar (ECS Fargate / container-image Lambda); spaCy `en_core_web_lg` (~560MB) + transformer model bust Lambda's 250MB limit. Held as the **upgrade path** only if full native anonymization or external de-identified sharing is later required.
- **Encryption ≠ redaction.** Neither HIPAA nor SOC 2 requires redacting the _primary store_ — that's KMS-backed RDS + S3 SSE-KMS. Redaction is for **logs** and **developer-facing views**. Keep the full encrypted block text in Postgres for the attorney citation flow; mask dev views by default using tagged offsets. Over-redacting the provenance store breaks citations.
- Cost: Comprehend Medical $0.01/100 chars (~$5 per ~50K-char medical record).

## Relationship to DEC-0003 (both now accepted 2026-06-22)

- **Complements** DEC-0003#D2 (Claude-on-Bedrock keeps PHI in-account during _inference_) — but Bedrock does NOT cover PHI sitting in CloudWatch logs or readable Postgres rows. This decision closes that gap. Not a supersession.
- **Depends on** DEC-0003#D1 (hybrid Textract→Claude pipeline produces the block text being scrubbed).

## Research backing

`raw/research/presidio-phi-detection/index.md`; synthesized in `wiki/knowledge/concepts/hipaa-soc2-compliance-aws.md` and `wiki/knowledge/entities/tools/aws-comprehend-medical.md`.
