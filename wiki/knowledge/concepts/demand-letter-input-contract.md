---
id: demand-letter-input-contract
title: Demand Letter Input Contract
aliases: [Input Contract, Field Schema, Slot-Filling Contract, Two-Class Input Model]
updated: 2026-06-22
sources:
  - ../../raw/research/demand-letter-agentic-inputs/index.md
  - ../../raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx
  - ../../raw/prd-demand-letter-generator.md
tags: [inputs, schema, slot-filling, provenance, architecture]
---

# Demand Letter Input Contract

derived_from::[[../sources/demand-letter-agentic-inputs.md]] | relates_to::[[ai-document-generation.md]] | relates_to::[[template-driven-generation.md]] | relates_to::[[demand-letter.md]] | relates_to::[[../sources/aaa-insurance-demand-letter-pat-donahue.md]]

## Definition

The **input contract** is the precise specification of what an agentic demand-letter workflow must be given to produce a letter to the PRD's standard. It frames generation as a **slot-filling join**: the template defines the slots; the case record fills them; a sufficiency gate verifies coverage before any text is generated. It is the testable bridge between document ingestion and template population — *does the case record cover every field the template exposes?*

## The Two Input Classes (both necessary, neither sufficient alone)

| Class | What it is | Determines | Cannot supply |
|-------|-----------|------------|---------------|
| **(A) Template** | A prior firm letter (Donahue `.docx`) | Structure, section order, headings, formatting, layout, legal register, **verbatim boilerplate** | Any case-specific fact |
| **(B) Case record** | Source documents for *this* claim | Every variable value: parties, dates, narrative facts, diagnoses, providers, amounts | Any structure or formatting |

**Sufficiency = the join.** The case record is sufficient only if it covers *every variable slot the template exposes*. An uncovered slot is an insufficiency to **surface, not invent**. relates_to::[[../sources/demand-letter-agentic-inputs.md]]

## Three Field Origins

Every slot in the letter resolves to one of three origins — and the routing matters because two of them must **never** pass through the LLM as free generation:

1. **Extracted** — pulled from a case document; must carry **provenance** (source + page/paragraph locator).
2. **Boilerplate-verbatim** — copied unchanged from the template (settlement conditions, release language, §999 mechanics, the Cal. Civ. Code §1431.2 citation). Variable substitution only; no paraphrase.
3. **Attorney-judgment** — a decision not present in any document (demand amount, general-damages valuation, future-medical reserve). Collected explicitly via form input, flagged attorney-sourced.

## Canonical Field Schema (Donahue 7-section letter)

The exhaustive variable set the case record must supply, by section. Rows marked **[boilerplate]** come verbatim from the template; **[judgment]** are attorney inputs; the rest are extracted with provenance.

**§1 — Header block**
| Field | Source |
|-------|--------|
| Letter date | system clock / attorney input |
| Delivery method | attorney input / firm default |
| Adjuster name + title | insurer correspondence |
| Insurer name + address | insurer correspondence / declarations |
| Claim number | insurer correspondence |
| Insured name | police report / declarations |
| Claimant name | intake sheet |
| Date of loss | police report / intake |
| Demand expiry date + time | computed from letter date + firm §999 policy |

**§2 — Salutation** — derived from adjuster name (no new field).

**§3 — Liability**
| Field | Source |
|-------|--------|
| Incident date/time/location | police/incident report |
| Traffic/road conditions | police report |
| Claimant conduct | police report / client statement |
| At-fault party + conduct | police report |
| Liability admission status | insurer correspondence |

**§4 — Damages (medical narrative)**
| Field | Source |
|-------|--------|
| Diagnoses (clinical specificity) | medical records |
| Treating providers (name, credential, practice, dates) | medical records |
| Examination findings | medical records |
| Imaging results | radiology reports |
| Recommended future treatment | medical records |

**§5 — Specials table**
| Field | Source |
|-------|--------|
| Per-provider line items + amounts | medical bills / ledgers |
| Total specials to date | sum of bills |
| Future medical reserve | physician estimate / **[judgment]** |

**§6 — General damages / pain & suffering**
| Field | Source |
|-------|--------|
| Occupational/daily-life impact narrative | client statement / intake |
| General-damages figure | **[judgment]** attorney valuation |
| Statutory citation (Cal. Civ. Code §1431.2(b)(2)) | **[boilerplate]** template |

**§7 — Settlement demand + conditions**
| Field | Source |
|-------|--------|
| Demand amount | **[judgment]** / §999 strategy |
| Policy limits / declarations | insurance declarations page |
| Lien handling terms | **[boilerplate]** + lien correspondence |
| Payee instructions | **[boilerplate]** |
| Release scope / insured declaration / delivery mechanics | **[boilerplate]** verbatim |
| Expiry/acceptance mechanics | **[boilerplate]** §999 |

**Closing/signature** — attorney name, bar affiliation, firm → firm profile / template.

## Minimal-Sufficient Bundle

For a Donahue-class CA PI/§999 demand:

1. **Firm template** `.docx` (class A)
2. Client/intake data
3. Incident/police report
4. Medical records
5. Medical bills/ledgers
6. Insurance information (adjuster/claim IDs + declarations page)
7. Attorney valuation parameters (general-damages figure, future-medical reserve, demand amount/strategy)

Items 2–6 are the case record; item 1 is the template; item 7 is attorney input the documents cannot supply.

**Optional / quality-improving (not required):** photographs and scene/vehicle-damage evidence; radiology image files (the *reports* suffice); lien correspondence (only if liens exist); prior insurer correspondence; additional sample letters / firm style guide for voice matching.

**Refinement-loop input (post-draft):** attorney free-text instructions scoped to named zones — a *second-pass* input, not part of the initial generation bundle.

## Sufficiency Gate & Gap Report

Because accuracy is paramount, **insufficiency must produce a gap report, not a hallucinated fill**. Before generation, map each variable zone in (A) to its fields from (B); every variable slot must have either an extracted value (with citation) or an explicit attorney value. Uncovered slots ("no declarations page → policy limits unconfirmed") are reported, never generated. This makes the field schema above the **canonical, testable input contract**.

## Constraints This Imposes on Ingestion

- **Format-preserving template ingestion** — template enters as structured `.docx`; flattening to text forfeits the fidelity requirement.
- **Provenance-preserving source ingestion** — case documents retain page/paragraph locators; OCR'd scans keep positional metadata.
- **Heterogeneous sources normalised** — records, reports, bills, declarations have wildly different layouts; extraction normalises into this field set.
- **Boilerplate is not a fillable field** — routing §7 conditions or the §6 citation through the LLM risks altering legal meaning.
- **Attorney-judgment slots are collected, not guessed.**
- **Jurisdiction coupling** — §999 mechanics and the §1431.2 citation are California-specific and live in the template; swapping templates swaps jurisdiction handling.

## Downstream Work (flagged by the source)

- Decision — template zone-detection strategy (boilerplate-verbatim vs. variable-populated in an arbitrary firm template).
- Decision — source-document ingestion + provenance strategy (PDF/`.docx`/OCR parsing preserving locators).
- Task — define this field schema as a typed contract, plus the sufficiency-gate / gap-report component.
