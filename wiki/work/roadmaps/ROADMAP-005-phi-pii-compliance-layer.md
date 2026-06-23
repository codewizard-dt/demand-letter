---
id: ROADMAP-005
title: PHI/PII Compliance Layer
status: active
created: 2026-06-22
updated: 2026-06-22
owner: David Taylor
linked_decisions: [DEC-0003, DEC-0004]
tags: [compliance, hipaa, soc2, phi, pii, comprehend, redaction]
---

# ROADMAP-005: PHI/PII Compliance Layer

Add the DEC-0004 compliance controls inline in the Node Lambda: AWS Comprehend Medical detects HIPAA PHI, Amazon Comprehend detects general PII, and a custom redaction step replaces detected offsets with typed tokens before any block text reaches CloudWatch logs or developer-facing DB views. Full encrypted text is retained in the provenance store for the attorney citation flow — over-redaction would break citations.

---

### Phase 1 — PHI/PII Detection

- [ ] After Textract completion (or structured parse), run `DetectPHI` (Comprehend Medical, `@aws-sdk/client-comprehendmedical`) on each block's text
- [ ] Run `DetectPiiEntities` (Amazon Comprehend, `@aws-sdk/client-comprehend`) on the same block text
- [ ] Merge detected entity arrays: deduplicate overlapping offsets; for each entity record `{ type, startOffset, endOffset, confidence }`
- [ ] Store PHI/PII offset metadata in `blocks.phi_offsets` (JSONB) alongside the full block text — do not redact the stored text; encryption (KMS) is the primary store control

---

### Phase 2 — Custom Redaction Step

- [ ] `redactText(text, entities)` function: sort entities by start offset descending; replace each `[start, end)` span with the appropriate typed token (`[PATIENT_NAME]`, `[DATE_OF_BIRTH]`, `[SSN]`, `[PHONE]`, `[ADDRESS]`, `[PROVIDER]`, etc.)
- [ ] Fail closed: if `DetectPHI` or `DetectPiiEntities` returns an error, **do not proceed** to log or DB write — surface the error to the caller; never silently skip detection
- [ ] Redacted text is used for: (a) all CloudWatch/Lambda log writes, (b) developer-facing `GET /jobs/:id/blocks` API response (unless caller has `role: attorney`); full text is served only to authenticated attorneys via the citation panel

---

### Phase 3 — Log-Scrubbing Middleware

- [ ] Lambda log wrapper: any structured log write that includes block text or extracted field values must pass through `redactText()` first; never log raw block text
- [ ] Add ESLint rule (or comment convention) to flag direct `console.log` / `logger.info` calls inside the ingestion Lambda handlers
- [ ] Integration test: trigger a full ingestion run → inspect CloudWatch log group → assert no string matching known PHI entities from Pat Donahue test data appears in any log line

---

### Phase 4 — Storage Security Confirmation

- [ ] Confirm RDS instance has KMS CMK encryption (check `aws rds describe-db-instances --query '[].StorageEncrypted'` → must be `true`; cannot change without snapshot-restore)
- [ ] Confirm S3 SSE-KMS on all PHI-bearing buckets (source documents, output DOCX)
- [ ] CloudTrail enabled in all regions; trail logs to a dedicated encrypted S3 bucket with MFA delete
- [ ] AWS Config with HIPAA conformance pack (Tier 2 — flags drift automatically)

---

### Phase 5 — Verification

- [ ] Process Pat Donahue medical records through the full pipeline
- [ ] CloudWatch logs: search for "Donahue", "Patrick", known SSN/DOB patterns → zero matches (all replaced with typed tokens)
- [ ] `GET /jobs/:id/blocks` (developer role): block text field returns redacted version with `[PATIENT_NAME]` tokens
- [ ] `GET /jobs/:id/blocks` (attorney role): full text returned (encrypted in transit via TLS)
- [ ] `blocks.phi_offsets` in DB contains the detection output for at least 5 PHI entities from the Pat Donahue records
- [ ] Simulated detection failure: mock `DetectPHI` throwing → assert the block is not inserted and the error is surfaced (no silent skip)
