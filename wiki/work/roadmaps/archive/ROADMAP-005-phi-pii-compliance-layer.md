---
id: ROADMAP-005
title: PHI/PII Compliance Layer
status: done
created: 2026-06-22
updated: 2026-06-25
owner: David Taylor
linked_decisions: [DEC-0003, DEC-0004]
tags: [compliance, hipaa, soc2, phi, pii, comprehend, redaction]
---

# ROADMAP-005: PHI/PII Compliance Layer

Add the DEC-0004 compliance controls inline in the Node Lambda: AWS Comprehend Medical detects HIPAA PHI, Amazon Comprehend detects general PII, and a custom redaction step replaces detected offsets with typed tokens before any block text reaches CloudWatch logs or developer-facing DB views. Full encrypted text is retained in the provenance store for the attorney citation flow — over-redaction would break citations.

---

### Phase 1 — PHI/PII Detection

- [x] [[TASK-051: Detect PHI entities per block via ComprehendMedical DetectPHI]]
- [x] [[TASK-052: Detect PII per block, merge with PHI entities, store to blocks.phi_offsets]]
- [x] [[TASK-052: Detect PII per block, merge with PHI entities, store to blocks.phi_offsets]]
- [x] [[TASK-052: Detect PII per block, merge with PHI entities, store to blocks.phi_offsets]]

---

### Phase 2 — Custom Redaction Step

- [x] [[TASK-053: redactText utility: replace PHI/PII entity spans with typed tokens]]
- [x] [[TASK-054: Fail-closed detection policy and log scrubbing in SNS Textract handler]]
- [x] [[TASK-055: Role-based block text redaction in GET /jobs/:id/blocks API]]

---

### Phase 3 — Log-Scrubbing Middleware

- [x] [[TASK-054: Fail-closed detection policy and log scrubbing in SNS Textract handler]]
- [x] [[TASK-056: ESLint rule to flag direct console.log with block text in Lambda handlers]]
- [x] [[TASK-057: Integration test: assert no raw PHI in SNS handler logs or developer-facing block API]]

---

### Phase 4 — Storage Security Confirmation

- [x] [[TASK-058: Phase 4: Storage security confirmation — RDS KMS, S3 SSE-KMS, CloudTrail, AWS Config]]
- [x] [[TASK-058: Phase 4: Storage security confirmation — RDS KMS, S3 SSE-KMS, CloudTrail, AWS Config]]
- [x] [[TASK-058: Phase 4: Storage security confirmation — RDS KMS, S3 SSE-KMS, CloudTrail, AWS Config]]
- [x] [[TASK-058: Phase 4: Storage security confirmation — RDS KMS, S3 SSE-KMS, CloudTrail, AWS Config]]

---

### Phase 5 — Verification

- [x] [[TASK-059: Phase 5: End-to-end compliance verification — PHI redaction, detection failure, attorney vs developer roles]]
- [x] [[TASK-059: Phase 5: End-to-end compliance verification — PHI redaction, detection failure, attorney vs developer roles]]
- [x] [[TASK-059: Phase 5: End-to-end compliance verification — PHI redaction, detection failure, attorney vs developer roles]]
- [x] [[TASK-059: Phase 5: End-to-end compliance verification — PHI redaction, detection failure, attorney vs developer roles]]
- [x] [[TASK-059: Phase 5: End-to-end compliance verification — PHI redaction, detection failure, attorney vs developer roles]]
- [x] [[TASK-059: Phase 5: End-to-end compliance verification — PHI redaction, detection failure, attorney vs developer roles]]
