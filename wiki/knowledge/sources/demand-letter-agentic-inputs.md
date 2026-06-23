---
id: demand-letter-agentic-inputs
title: Research — Required Inputs to Generate the Sample Demand Letter
aliases: [Demand Letter Agentic Inputs, Input Contract Research]
updated: 2026-06-22
sources:
  - ../../../raw/research/demand-letter-agentic-inputs/index.md
tags: [research, inputs, architecture, slot-filling, provenance]
---

# Research — Required Inputs to Generate the Sample Demand Letter in an Agentic Workflow

derived_from::[[../../../raw/research/demand-letter-agentic-inputs/index.md]] | relates_to::[[aaa-insurance-demand-letter-pat-donahue.md]] | relates_to::[[prd-demand-letter-generator.md]] | relates_to::[[../concepts/demand-letter-input-contract.md]] | relates_to::[[../concepts/ai-document-generation.md]] | relates_to::[[../concepts/template-driven-generation.md]]

## What This Source Is

A focused research report (2026-06-22) answering one question: to generate the Donahue demand letter to the PRD's standard ("matches the template exactly in structure, formatting, and layout, populated with information relevant to the case; accuracy is paramount"), **what are the necessary-and-sufficient inputs to an agentic workflow?** It builds on the prior legal-context research and the Donahue sample analysis, decomposing the letter field-by-field rather than restating legal background.

## Core Claim — Exactly Two Input Classes

The report's central finding is that generation requires **exactly two classes of input**, both necessary, neither sufficient alone:

- **(A) Structural input — the firm template.** A prior firm letter (the Donahue `.docx` is the exemplar) alone fixes structure, formatting, layout, section order, **verbatim boilerplate**, and legal register. It supplies **zero case facts**.
- **(B) Content input — the case record.** The set of source documents (intake sheet, police/incident report, medical records + bills, insurance declarations, lien correspondence) supplies **every case-specific value** but **no form**.

**Sufficiency is the join:** the case record is sufficient only if it covers every variable slot the template exposes. A missing slot (e.g. no declarations page → no policy-limit confirmation) is an insufficiency the workflow must **detect and surface, not fill by invention**. This reframes the whole problem as **slot-filling**, not free generation. relates_to::[[../concepts/demand-letter-input-contract.md]]

## The Accuracy Mandate Adds a Third Requirement — Provenance

"Accuracy is paramount" converts two items from nice-to-have into part of the input/output contract:

- **Provenance (citation layer):** every populated value (diagnosis, dollar figure, date, party, provider) must carry a locator back to the source document and position, so the attorney verifies rather than re-reads. Source documents must therefore be ingested preserving page/paragraph locators — including OCR'd scans.
- **Grounding-only generation:** the model populates fields **only** from (A) and (B) — never from its training knowledge. General legal/medical knowledge is **explicitly not a permitted generation input**; it is the primary inaccuracy vector (invented case law, plausible-but-wrong diagnoses). The two-class model is thus also a **guardrail**: a value not in (A) or (B) is flagged missing, not generated.

## Field-Level Decomposition

The report enumerates the ~40 variable slots across the Donahue letter's 7 sections, each mapped to its source document — the concrete "necessary content" set. It distinguishes three field origins: **extracted** (from case documents, with provenance), **boilerplate-verbatim** (from the template — a large fraction of §7 plus the §6 statutory citation), and **attorney-judgment** (demand amount, general-damages valuation, future-medical reserve — decisions, not facts in any document). This full schema is captured as the canonical input contract. relates_to::[[../concepts/demand-letter-input-contract.md]]

## Recommendation (as filed)

Model the workflow as **two ingestion channels feeding a slot-filling join, gated by a sufficiency check**: (1) template ingestion → typed zones classified boilerplate-verbatim vs. variable-populated, preserved losslessly as `.docx`; (2) case-record ingestion → normalised field schema with a source locator on every field, plus explicit collection of attorney-judgment slots; (3) join + sufficiency gate → uncovered slots produce a **gap report**, never generation; (4) per-zone grounded-only generation, boilerplate copied verbatim; (5) attorney refinement loop as a scoped second-pass input. The report flags two downstream decisions (template zone-detection strategy; provenance-preserving source ingestion) and one task (define the canonical field schema + sufficiency gate).
