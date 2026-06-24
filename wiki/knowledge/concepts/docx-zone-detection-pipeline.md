---
id: docx-zone-detection-pipeline
title: Docx Zone-Detection Pipeline
aliases: [Zone Detection, Boilerplate/Variable Classification, Hybrid Zone-Detection Pipeline]
updated: 2026-06-22
sources:
  - ../../raw/research/template-zone-detection/index.md
tags: [zone-detection, docx, template-ingestion, architecture, ooxml]
---

# Docx Zone-Detection Pipeline

derived_from::[[../sources/template-zone-detection.md]] | implements::[[../../work/decisions/archive/DEC-0001-template-zone-detection.md]] | relates_to::[[template-driven-generation.md]] | relates_to::[[demand-letter-input-contract.md]] | relates_to::[[ai-document-generation.md]] | uses::[[../entities/tools/docxtemplater.md]]

## Definition

The **zone-detection pipeline** is the ingestion-time step that classifies every span of a firm-supplied `.docx` template as **boilerplate-verbatim** (copied byte-for-byte) or **variable-populated** (filled from the case record). It is the prerequisite for the slot-filling join in [[demand-letter-input-contract.md|the input contract]]: without a zone map, the generator cannot know what to copy versus what to fill.

## The Five Techniques

| Technique                                     | Family                  | How the boundary is set                                             | Auto from unmarked letter?       | Formatting fidelity           |
| --------------------------------------------- | ----------------------- | ------------------------------------------------------------------- | -------------------------------- | ----------------------------- |
| **A. LLM zone classification**                | Auto-detect             | Model semantics label each span                                     | Yes                              | Low (must map back to OOXML)  |
| **B. Multi-letter diff (template induction)** | Auto-detect             | Constant spans across N letters = boilerplate; divergent = variable | Yes (needs ≥2–3 letters)         | Low (must map back)           |
| **C. Delimiter markup**                       | Explicit markup         | Author types `{{field}}` tags; non-tag text is boilerplate          | No                               | Lossless (in-OOXML)           |
| **D. Content controls / SDTs**                | Explicit markup         | Variable spans wrapped in native Word `<w:sdt>` with alias/tag      | No                               | Lossless (in-OOXML)           |
| **E. Hybrid (chosen)**                        | Explicit (LLM-assisted) | LLM pre-labels → attorney confirms → persist as markup              | Partial (LLM draft, human final) | Lossless (persists as markup) |

## The Decisive Failure Mode

The accuracy mandate makes one error **unacceptable and asymmetric**: if a **boilerplate clause is misclassified as variable**, the generation step paraphrases it and can silently alter legal meaning (release scope, CCP §999 acceptance mechanics, payee restrictions, the Cal. Civ. Code §1431.2 citation). This is malpractice-grade. The reverse error (variable mislabeled boilerplate) merely fails to fill a slot — caught by the [[demand-letter-input-contract.md|sufficiency gate]]. Because the costly error lands exactly where an unsupervised classifier is least reliable, **pure LLM detection cannot be trusted without a human gate**, and **boilerplate must never route through the LLM as content to generate**.

## Two Structural Principles

1. **Decouple detection from fill.** Detect zones once (by any means), then persist the result as **in-OOXML markup** so every subsequent fill is a deterministic substitution. Generation never re-classifies — the boundary becomes fixed data, not a per-letter LLM decision.
2. **Never flatten the template.** Formatting fidelity is a property of _where the fill happens_. Explicit-markup methods fill inside the OOXML and are lossless by construction; auto-detection that flattens the docx to plain text loses structure and must map labels back onto OOXML spans. Parse structurally, keeping paragraph/run/style references intact. relates_to::[[template-driven-generation.md]]

## The Chosen Pipeline (DEC-0001#D1)

```mermaid
flowchart TD
    A[Firm uploads .docx template] --> B[Structural docx parse<br/>keep OOXML spans, no flatten]
    B --> C[LLM pre-labels each zone<br/>boilerplate-verbatim | variable-populated<br/>+ suggested field name]
    C --> D[Attorney annotation UI<br/>confirm / correct boundary - once per template]
    D --> E{All zones labeled?}
    E -- no --> D
    E -- yes --> F[Persist zone map as in-OOXML markup<br/>content controls or delimiter tags]
    F --> G[Generation: deterministic substitution<br/>boilerplate byte-exact, variables from case record]
```

The hybrid is the only technique that satisfies _boilerplate-never-paraphrased_ **and** _automation leverage_ **and** _first-template support_ at once: the LLM handles the tedious first pass, an attorney owns the legal boundary (one-time per template), and the persisted markup makes the fill deterministic and lossless.

## Persistence Substrate (resolved: DEC-0002#D1)

The persistence substrate the hybrid persists _into_ — deferred by DEC-0001 — was resolved by implements::[[../../work/decisions/archive/DEC-0002-docx-persistence-substrate.md|DEC-0002#D1]]: **delimiter tags filled by docxtemplater (OSS core)**, chosen over Word content controls/SDTs. The annotation UI inserts clean single-run `{tag}` placeholders onto confirmed variable zones (boilerplate untouched); docxtemplater's **`InspectModule`** enumerates the slots straight into the [[demand-letter-input-contract.md|sufficiency gate]]; `render(data)` fills deterministically with **`nullGetter`** failing closed; boilerplate stays byte-exact because it lives outside every tag. SDTs lost on the _programmatic_ fill story — in Node they require a commercial library (Aspose) or hand-rolled OOXML, and their native-Word-authoring advantage is moot when the annotation UI writes the markup. derived_from::[[../sources/docx-persistence-substrate.md]]

## Tooling Landscape

- **docxtemplater** (JS) and **docxtpl/Jinja2** (Python) — fill delimiter-tagged templates inside the OOXML zip; the legal-tech standard (Docassemble / Suffolk LIT Lab). uses::[[../entities/tools/docxtemplater.md]]
- **Word content controls (SDTs)** — native OOXML `<w:sdt>` nodes; machine-readable boundaries, alias/tag metadata, XML data binding.
- **Template induction / wrapper induction** (e.g. TWIX) — infers a template from repeated documents via phrase-location patterns.

## Related Concepts

relates_to::[[demand-letter-input-contract.md]] — the slot-filling contract this pipeline feeds
relates_to::[[template-driven-generation.md]] — the exact-match constraint that makes lossless markup necessary
relates_to::[[ai-document-generation.md]] — the broader generation pattern
