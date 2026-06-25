---
id: ROADMAP-002
title: Template Ingestion & Zone Detection
status: done
created: 2026-06-22
updated: 2026-06-24
owner: David Taylor
linked_decisions: [DEC-0001, DEC-0002]
tags: [template, zone-detection, annotation, docxtemplater]
---

# ROADMAP-002: Template Ingestion & Zone Detection

Replace the naive "send the template as context" approach with proper template parsing, LLM zone labeling, and an attorney annotation UI that persists confirmed zone maps as docxtemplater delimiter tags. After this roadmap, every template has a slot list the sufficiency gate can consume and a tagged DOCX the generation engine can fill.

---

### Phase 1 — Docx Structural Parse

- [x] [[TASK-025: Template Ingestion Service — Parse DOCX to OOXML Zone Spans]](../tasks/archive/TASK-025-docx-zone-parser.md)
- [x] [[TASK-026: Zone Extraction Run-Path Field and DOCX Round-Trip Verification]](../tasks/archive/TASK-026-zone-extraction-run-path-verification.md)
- [x] [[TASK-027: Prisma Schema — zones and templates DB Tables]](../tasks/archive/TASK-027-zones-db-table.md)
- [x] [[TASK-027: Prisma Schema — zones and templates DB Tables]](../tasks/archive/TASK-027-zones-db-table.md)

---

### Phase 2 — LLM Zone Classification

- [x] [[TASK-028: LLM Zone Classification — Claude on Bedrock Classifies Zones as Boilerplate or Variable]](../tasks/archive/TASK-028-llm-zone-classification.md)
- [x] [[TASK-028: LLM Zone Classification — Claude on Bedrock Classifies Zones as Boilerplate or Variable]](../tasks/archive/TASK-028-llm-zone-classification.md)
- [x] [[TASK-028: LLM Zone Classification — Claude on Bedrock Classifies Zones as Boilerplate or Variable]](../tasks/archive/TASK-028-llm-zone-classification.md)

---

### Phase 3 — Attorney Annotation UI

- [x] [[TASK-029: Attorney Annotation UI — Zone Review and Confirmation Page]](../tasks/archive/TASK-029-attorney-annotation-ui.md)
- [x] [[TASK-029: Attorney Annotation UI — Zone Review and Confirmation Page]](../tasks/archive/TASK-029-attorney-annotation-ui.md)
- [x] [[TASK-029: Attorney Annotation UI — Zone Review and Confirmation Page]](../tasks/archive/TASK-029-attorney-annotation-ui.md)
- [x] [[TASK-029: Attorney Annotation UI — Zone Review and Confirmation Page]](../tasks/archive/TASK-029-attorney-annotation-ui.md)

---

### Phase 4 — Delimiter Tag Injection

- [x] [[TASK-030: Delimiter Tag Injection — Inject {field_name} Tags, Save to S3, and Enumerate Slots via InspectModule]](../tasks/archive/TASK-030-delimiter-tag-injection.md)
- [x] [[TASK-030: Delimiter Tag Injection — Inject {field_name} Tags, Save to S3, and Enumerate Slots via InspectModule]](../tasks/archive/TASK-030-delimiter-tag-injection.md)
- [x] [[TASK-030: Delimiter Tag Injection — Inject {field_name} Tags, Save to S3, and Enumerate Slots via InspectModule]](../tasks/archive/TASK-030-delimiter-tag-injection.md)
- [x] [[TASK-030: Delimiter Tag Injection — Inject {field_name} Tags, Save to S3, and Enumerate Slots via InspectModule]](../tasks/archive/TASK-030-delimiter-tag-injection.md)

---

### Phase 5 — Verification

- [x] [[TASK-031: ROADMAP-002 End-to-End Verification — Zone Detection Pipeline Smoke Test]](../tasks/archive/TASK-031-roadmap-002-verification.md)
- [x] [[TASK-031: ROADMAP-002 End-to-End Verification — Zone Detection Pipeline Smoke Test]](../tasks/archive/TASK-031-roadmap-002-verification.md)
- [x] [[TASK-031: ROADMAP-002 End-to-End Verification — Zone Detection Pipeline Smoke Test]](../tasks/archive/TASK-031-roadmap-002-verification.md)
