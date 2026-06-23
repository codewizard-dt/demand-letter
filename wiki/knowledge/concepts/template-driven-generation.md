---
id: template-driven-generation
title: Template-Driven Generation
updated: 2026-06-22
sources:
  - ../../raw/prd-demand-letter-generator.md
tags: [ai, template, generation, architecture]
---

# Template-Driven Generation

relates_to::[[../sources/prd-demand-letter-generator.md]] | relates_to::[[ai-document-generation.md]] | relates_to::[[demand-letter.md]]

## Definition

Template-driven generation is a document generation pattern where the AI model's output must **exactly match** a provided exemplar (the "template") in structure, formatting, and layout — substituting only the case-specific content. The template is not an abstract schema but a real prior document; it fully specifies the target form.

## Why It Matters Here

In legal document generation, law firms develop house styles and structural preferences over time. The demand letter generator must honour a firm's template precisely — not produce a structurally correct demand letter in some generic sense, but one that is indistinguishable in form from prior letters the firm has sent. This requires the model to:

- Replicate section headings, ordering, and nesting verbatim
- Match paragraph structure and legal phrasing patterns from the template
- Carry over boilerplate clauses (e.g. CCP §999 settlement conditions) unchanged
- Substitute only the case-specific fields (parties, dates, diagnoses, dollar amounts)

## Implementation Approach

The model is given both the template letter and the source case materials. A prompting strategy that distinguishes "structure to preserve" from "content to replace" is critical for accuracy. relates_to::[[ai-document-generation.md]]

The mechanism for drawing the "preserve vs replace" boundary on an arbitrary firm template is itself a design problem — see relates_to::[[docx-zone-detection-pipeline.md]], which compares five detection techniques and records the chosen hybrid (LLM-seed → human-confirm → persist as in-OOXML markup).

## Firm-Level Templates

The PRD specifies that firms can create and manage their own templates — meaning the template is a variable input, not hardcoded. The generator must generalise across template variations.

## Zone Classification — Boilerplate-Verbatim vs. Variable-Populated

Input-contract research adds a requirement to template ingestion: each zone of an ingested template must be classified as either **boilerplate-verbatim** (copied unchanged, with variable substitution only) or **variable-populated** (filled from the case record). This distinction is not cosmetic — a large fraction of the Donahue letter's §7 settlement conditions (release scope, payee instructions, insured declarations, §999 acceptance mechanics) and the §6 statutory citation are boilerplate. Routing these through the LLM as "content to generate" risks **inadvertently altering legal meaning**, so they must be marked non-LLM and reproduced verbatim. The template must therefore be ingested losslessly as structured `.docx` — flattening to plain text forfeits both formatting fidelity and the ability to preserve boilerplate exactly. relates_to::[[demand-letter-input-contract.md]] | derived_from::[[../sources/demand-letter-agentic-inputs.md]]
