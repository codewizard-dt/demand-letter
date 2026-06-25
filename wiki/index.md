---
title: Wiki Index
updated: 2026-06-11
---

# Wiki Index — Home Map

The page catalog and home Map of Content for this wiki. **Read this first on every query**, then drill into the linked pages. Updated on every ingest and every filed answer.

Conventions that govern every page (atomic pages, stable IDs, typed links, frontmatter namespace): see [conventions](conventions.md). Operation history: see [log](log.md).

Entry format: `- [Title](path) — one-line summary`.

The wiki is split into two domains with opposite organizing laws:

- **Knowledge** — timeless, link-navigated synthesis (sources, concepts, entities). Pages are listed individually below.
- **Work** — stateful, status-navigated lifecycle artifacts (requirements, decisions, roadmaps, tasks, uat, bugs). Items are **not** listed here — each family keeps its own `index.md` of active items; this page links to those.

---

## Knowledge

### Sources

- [PRD — Demand Letter Generator (Steno)](knowledge/sources/prd-demand-letter-generator.md) — Steno's product spec: AI demand letter generation from templates + case docs, Claude, TypeScript/React/AWS/PostgreSQL, 1-week build
- [Sample Demand Letter — Pat Donahue v. AAA](knowledge/sources/aaa-insurance-demand-letter-pat-donahue.md) — Canonical template input: California CCP §999 policy-limits demand from Stalwart Law Group; illustrates full letter structure
- [Research — Demand Letters in Legal Context](knowledge/sources/demand-letter-legal-context.md) — Web research synthesis: types taxonomy, universal 10-element structure, FRE 408 admissibility rules, SOL non-tolling, PI settlement timeline
- [Research — Required Inputs to Generate the Sample Demand Letter](knowledge/sources/demand-letter-agentic-inputs.md) — Two-class input model (template + case record), ~40-field schema mapped to source docs, slot-filling join, provenance + sufficiency-gate requirements
- [Research — Template Zone-Detection Strategy](knowledge/sources/template-zone-detection.md) — Five techniques (LLM classify, multi-letter diff, delimiter markup, content controls, hybrid) for classifying boilerplate-verbatim vs variable-populated zones; backs DEC-0001
- [Research — Docx Persistence Substrate](knowledge/sources/docx-persistence-substrate.md) — Delimiter tags (docxtemplater) vs content controls/SDTs for persisting the zone map; OSS maturity + InspectModule→sufficiency-gate; backs DEC-0002
- [Research — Textract, SOC2, HIPAA, and AWS Compliance Solutions](knowledge/sources/textract-soc2-hipaa-aws-compliance.md) — Textract role + compliance status; encryption vs redaction at rest; PHI+PII log scrubbing; three-tier AWS compliance stack; Presidio vs Comprehend Medical

### Concepts

- [Demand Letter](knowledge/concepts/demand-letter.md) — Definition, 7-type taxonomy, universal 10-element structure, PI-specific 7-section format, legal implications (FRE 408, SOL, condition precedent)
- [Time-Limited Policy Limits Demand (CCP §999)](knowledge/concepts/time-limited-policy-limits-demand.md) — California statutory demand subtype with strict acceptance mechanics and bad-faith consequences
- [Pre-Litigation Settlement Process (PI/Insurance)](knowledge/concepts/pre-litigation-settlement-process.md) — 7-step timeline from incident through MMI, demand package, insurer review, negotiation, to litigation; role of the generator
- [AI Document Generation](knowledge/concepts/ai-document-generation.md) — LLM synthesis of structured legal documents; zone-based generation, boilerplate verbatim from template, citation layer, jurisdiction awareness
- [Template-Driven Generation](knowledge/concepts/template-driven-generation.md) — Constraint pattern requiring AI output to exactly match a provided exemplar's structure and formatting
- [Demand Letter Input Contract](knowledge/concepts/demand-letter-input-contract.md) — Two-class input model (template + case record), three field origins, canonical ~40-field schema, sufficiency gate + gap report
- [Docx Zone-Detection Pipeline](knowledge/concepts/docx-zone-detection-pipeline.md) — Classifying template spans as boilerplate-verbatim vs variable-populated; five techniques, the asymmetric failure mode, the chosen hybrid pipeline (DEC-0001)
- [HIPAA and SOC 2 Compliance on AWS](knowledge/concepts/hipaa-soc2-compliance-aws.md) — Encryption vs redaction distinction; what each standard requires; PHI vs PII in logs; three-tier AWS compliance stack; Presidio vs AWS-native scrubbing

### Entities

**People**

- [Faby Rivera, Esq.](knowledge/entities/people/faby-rivera.md) — Attorney at Stalwart Law Group; authored the sample demand letter
- [Patrick Donahue](knowledge/entities/people/pat-donahue.md) — Claimant in the sample case; RV technician with multilevel spinal injuries
- [Elaine Collins](knowledge/entities/people/elaine-collins.md) — AAA claims adjuster; named recipient of the sample letter
- [JP Dienst](knowledge/entities/people/jp-dienst.md) — Steno technical contact (jp.dienst@steno.com)
- [Rick Douglas](knowledge/entities/people/rick-douglas.md) — Steno technical contact (rick.douglas@steno.com)
- [Dr. Ankush Kumar Bansal, M.D.](knowledge/entities/people/dr-ankush-bansal.md) — Pain management physician at Coastal Pain and Spinal Diagnostics
- [Dr. Michael P. Kelly, D.C.](knowledge/entities/people/dr-michael-kelly.md) — Chiropractor at Santee Chiropractic Clinic

**Organisations**

- [Steno](knowledge/entities/organisations/steno.md) — Legaltech company; project client building the demand letter generator
- [Stalwart Law Group, APC](knowledge/entities/organisations/stalwart-law-group.md) — CA personal injury law firm; authors of the sample demand letter template
- [Interinsurance Exchange of the Automobile Club (AAA)](knowledge/entities/organisations/aaa-interinsurance-exchange.md) — Respondent insurer in the sample case
- [Coastal Pain and Spinal Diagnostics](knowledge/entities/organisations/coastal-pain-spinal-diagnostics.md) — Pain management practice; treating provider in sample case
- [Santee Chiropractic Clinic](knowledge/entities/organisations/santee-chiropractic-clinic.md) — Chiropractic clinic; initial post-accident treatment in sample case
- [MAX MRI Radiology](knowledge/entities/organisations/max-mri-radiology.md) — Radiology provider; lumbar and thoracic MRI imaging in sample case

**Tools**

- [Anthropic Claude](knowledge/entities/tools/anthropic-claude.md) — Preferred LLM for demand letter generation; runs on Amazon Bedrock for PHI residency (DEC-0003#D2)
- [docxtemplater](knowledge/entities/tools/docxtemplater.md) — JS library that fills delimiter-tagged `.docx` templates inside the OOXML (lossless); docxtpl/Jinja2 is the Python equivalent; candidate persistence substrate
- [AWS Textract](knowledge/entities/tools/aws-textract.md) — OCR/layout extraction layer in the hybrid ingestion pipeline; returns Block objects (bbox+page+confidence); HIPAA-eligible and SOC 2-compliant
- [AWS Comprehend Medical](knowledge/entities/tools/aws-comprehend-medical.md) — Managed PHI detection service (HIPAA 18 identifiers); native TS/Node SDK; detect-only (no redaction); pair with Amazon Comprehend for full PII coverage
- [AWS KMS](knowledge/entities/tools/aws-kms.md) — Encryption key management for all storage tiers (RDS, S3, EBS); satisfies HIPAA and SOC 2 encryption-at-rest requirements

**Components**

- [ROADMAP-001: End-to-End Skeleton — Implementation Guide](knowledge/entities/components/roadmap-001-end-to-end-skeleton.md) — Phase-by-phase walkthrough of the vertical slice: infra, LLM audit trail, backend job lifecycle, frontend upload→generate→download, and what each subsequent roadmap replaces

---

## Work

Each family's `index.md` lists its **active items only** (completed/terminal items drop off the list; files never move — status lives in frontmatter).

- **Requirements** — REQ-NNN. [Active index](work/requirements/index.md) · [lifecycle](work/requirements/lifecycle.md)
- **Decisions** — DEC-NNNN (per-decision `#DM`). [Active index](work/decisions/index.md) · [lifecycle](work/decisions/lifecycle.md)
- **Roadmaps** — ROADMAP-NNN. [Active index](work/roadmaps/index.md) · [lifecycle](work/roadmaps/lifecycle.md)
- **Tasks** — TASK-NNN. [Active index](work/tasks/index.md) · [lifecycle](work/tasks/lifecycle.md)
- **UAT** — UAT-NNN, one per task. [Active index](work/uat/index.md) · [lifecycle](work/uat/lifecycle.md)
- **Bugs** — BUG-NNNN. [Active index](work/bugs/index.md) · [lifecycle](work/bugs/lifecycle.md)
