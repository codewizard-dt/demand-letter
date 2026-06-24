---
id: ai-document-generation
title: AI Document Generation
updated: 2026-06-22
sources:
  - ../../raw/prd-demand-letter-generator.md
  - ../../raw/research/demand-letter-legal-context/index.md
tags: [ai, generation, legaltech, architecture]
---

# AI Document Generation

relates_to::[[../sources/prd-demand-letter-generator.md]] | relates_to::[[../sources/demand-letter-legal-context.md]] | relates_to::[[template-driven-generation.md]] | relates_to::[[demand-letter.md]]

## Definition

AI document generation is the use of a language model to produce a structured, domain-specific document by synthesising information from provided source materials. Unlike free-form generation, this pattern constrains the model's output to match a specific template's structure, formatting, and layout.

## Application in This Project

The demand letter generator implements this pattern as follows:

1. **Inputs:** (a) firm-level demand letter template (a real prior letter); (b) case source documents (medical records, police reports, correspondence, etc.)
2. **Model task:** Extract relevant facts from source documents and populate the template structure exactly — matching section order, heading labels, legal language register, and formatting
3. **Accuracy requirement:** Paramount — hallucinated facts, wrong diagnoses, or incorrect figures in a legal document are unacceptable
4. **Iterative refinement:** Attorney issues follow-up instructions to the model to revise specific sections of the draft uses::[[../entities/tools/anthropic-claude.md]]

## Architecture Considerations

- AI calls should use SSE streaming so attorneys see output progressively rather than waiting
- Batch or multi-step agent workflows (e.g. document parsing + generation + review stages) should run asynchronously via a queue
- Any intermediate code generation must be sandboxed with no access to sensitive data or system resources
- Cost and latency are secondary concerns for the AI calls themselves; HTTP and DB layers have the binding performance targets

## Generator Design Principles (from legal domain research)

Research into demand letter legal conventions surfaced five design principles for the generator:

1. **Zone-based generation** — treat the demand letter as a structured document with typed zones (header, liability, medical narrative, specials, boilerplate conditions), each with distinct sourcing logic. Generate zone by zone rather than in a single pass.
2. **Boilerplate verbatim from template** — the settlement conditions section contains precise legal language (release scope, payee restrictions, insured declarations); any AI paraphrase risks inadvertent legal meaning changes. This section should be reproduced verbatim from the template with only necessary variable substitution.
3. **AI effort concentrated on medical narrative** — the damages/medical narrative section (synthesising physician records, diagnoses, and treatment timelines into coherent prose) is the most time-consuming section for attorneys; this is where AI provides the most leverage.
4. **Jurisdiction awareness** — even within the same document type, California CCP §999 demands require additional elements (expiry notice, statutory citation, acceptance conditions) not present in generic PI demands; the generator must detect and handle this.
5. **Citation layer** — for every factual claim in the generated letter (diagnosis, dollar figure, date, physician name), the generator should be able to surface the source document and location from which it was drawn, enabling efficient attorney verification.

## Generation Is Slot-Filling, Not Free Generation (input-contract refinement)

Later input-focused research sharpens the framing above: the workflow is fundamentally a **slot-filling join**, not free generation. The template (class A) defines the slots and supplies all form and verbatim boilerplate; the case record (class B) fills the variable slots and supplies all facts. Both classes are necessary; neither is sufficient alone, and sufficiency is the join — the case record must cover every variable slot the template exposes. This adds three operational requirements to the principles above:

- **Provenance, not just citation** — source documents must be ingested preserving page/paragraph locators (including OCR'd scans), so every extracted value carries a verifiable source position. The citation layer is part of the _input/output contract_, not an optional feature.
- **Grounding-only generation** — the model populates fields **only** from (A) and (B). General legal/medical training knowledge is an _inaccuracy vector_, not a permitted generation input; a value absent from (A) or (B) is flagged missing, not generated.
- **Sufficiency gate + gap report** — before generation, a coverage check verifies every variable slot has an extracted value (with citation) or an explicit attorney value. Uncovered slots produce a **gap report**, never a hallucinated fill.
- **Attorney-judgment slots** — demand amount, general-damages valuation, and future-medical reserve are decisions, not extractable facts; the system collects them explicitly via form input rather than guessing.

The full field schema and the three field origins (extracted / boilerplate-verbatim / attorney-judgment) are specified in relates_to::[[demand-letter-input-contract.md]]. derived_from::[[../sources/demand-letter-agentic-inputs.md]]

## Related Concepts

relates_to::[[template-driven-generation.md]] — the specific constraint pattern of exact structural matching
relates_to::[[demand-letter-input-contract.md]] — the canonical field schema and two-class input model
relates_to::[[docx-zone-detection-pipeline.md]] — how the boilerplate-verbatim vs variable-populated boundary is detected on an arbitrary template
