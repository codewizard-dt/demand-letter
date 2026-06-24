---
id: template-zone-detection
title: Research — Template Zone-Detection Strategy
aliases: [Zone-Detection Research, Boilerplate vs Variable Detection]
updated: 2026-06-22
sources:
  - ../../../raw/research/template-zone-detection/index.md
tags: [research, zone-detection, docx, template-ingestion, architecture]
---

# Research — Template Zone-Detection Strategy

derived_from::[[../../../raw/research/template-zone-detection/index.md]] | relates_to::[[../concepts/docx-zone-detection-pipeline.md]] | relates_to::[[../concepts/template-driven-generation.md]] | relates_to::[[../concepts/demand-letter-input-contract.md]] | uses::[[../entities/tools/docxtemplater.md]] | informs::[[../../work/decisions/archive/DEC-0001-template-zone-detection.md]]

## What This Source Is

A focused research report (2026-06-22) answering the question that backs **DEC-0001**: before the generator can fill a firm's `.docx` template, **how does it decide which spans are boilerplate-verbatim (copied unchanged) versus variable-populated (filled from the case record)?** It compares five techniques across accuracy, generalization across firms, setup cost, and docx formatting fidelity, and recommends a hybrid.

## Core Claim — Five Techniques, Two Families

The techniques split cleanly into **auto-detection** of an unmarked letter and **explicit markup** that makes the boundary deterministic:

| Family              | Techniques                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Auto-detect**     | (A) LLM zone classification; (B) multi-letter diff / template induction                                                       |
| **Explicit markup** | (C) delimiter tags (`{{field}}`); (D) Word content controls / SDTs; (E) hybrid (LLM-seed → human-confirm → persist as markup) |

**Delimiter markup is the legal-tech standard** — docxtemplater (JS) and docxtpl/Jinja2 (Python, used by Docassemble / Suffolk LIT Lab) fill directly inside the OOXML zip, so **formatting is lossless by construction** and the boilerplate/variable boundary is explicit (anything outside a tag is copied verbatim). **Word content controls (SDTs)** are the native machine-readable equivalent — `<w:sdt>` nodes carrying an alias/tag, bindable to a custom XML data part. uses::[[../entities/tools/docxtemplater.md]]

## The Decisive Constraint — Auto-Detection Cannot Be Trusted Unsupervised

The accuracy mandate makes one failure mode unacceptable: **a boilerplate clause misclassified as variable gets paraphrased by the LLM and silently alters legal meaning** (release scope, §999 acceptance mechanics, payee restrictions) — malpractice-grade. Peer-reviewed work confirms general LLMs are a good fit for _classification_ but underperform bespoke models on _rigid extraction_, and production IDP guidance positions LLMs as "strategic accelerators," not the trusted final authority. So **pure LLM detection (A) is too risky without a human gate**, and **multi-letter diff (B)** — though high-precision when letters align — has a cold-start problem (needs ≥2–3 samples per firm) and breaks on reordered/optional sections.

A separate structural point: **formatting fidelity is a property of where the fill happens, not of detection.** Explicit-markup methods fill inside the OOXML (lossless); auto-detection that flattens the docx to text must map labels back onto OOXML spans. This argues for **decoupling detection from fill** — detect once, then persist the result as in-OOXML markup.

## Recommendation (filed as DEC-0001#D1, accepted)

The report recommends — and DEC-0001 accepted — the **hybrid (Option E)**: on ingest, parse the docx structurally (no flatten); the LLM pre-labels each zone; an attorney confirms/corrects the boundary once in an annotation UI; the confirmed map is persisted as in-OOXML markup (content controls or delimiter tags). Generation then becomes a **deterministic substitution** that never re-classifies — boilerplate byte-exact, variables filled from the joined case record. The persistence-substrate choice (content controls vs delimiter tags) and the docx parsing library are deferred to a follow-on decision. relates_to::[[../concepts/docx-zone-detection-pipeline.md]]
