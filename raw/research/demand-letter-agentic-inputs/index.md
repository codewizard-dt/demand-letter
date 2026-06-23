---
topic: based on the sample demand letter, what would be the required inputs, both necessary and sufficient to generate said letter in an agentic workflow
slug: demand-letter-agentic-inputs
researched: 2026-06-22
sources: [./sources.md]
---

# Research: Required Inputs to Generate the Sample Demand Letter in an Agentic Workflow

> Generating the Donahue demand letter to the PRD's standard — *"matches the template exactly in structure, formatting, and layout, populated with information relevant to the case; accuracy is paramount"* — requires exactly **two classes of input**. **(A) A structural input: the firm template** (a prior letter, e.g. the Donahue `.docx` itself) which alone fixes structure, formatting, layout, section order, boilerplate, and legal register. **(B) A content input: the case record** — the set of source documents (intake sheet, police/incident report, medical records + bills, insurance declarations, lien correspondence) from which every case-specific field is extracted. The template is *necessary* for fidelity but supplies no facts; the case record is *necessary* for content but supplies no form. Together they are *sufficient* only if the case record covers every variable slot the template exposes — which, for the Donahue letter, is an enumerable list of ~40 fields (parties, dates, liability narrative, diagnoses, providers, an itemised specials table, a future-care reserve, and the §999 demand parameters). The accuracy mandate adds a third, non-content requirement: **provenance** — each extracted field must carry a citation back to its source document so the attorney can verify it, since a hallucinated diagnosis or dollar figure is malpractice-grade. Anything beyond these two input classes (web knowledge, general legal training) must NOT be a generation input — it is the leakage path that produces unverifiable, inaccurate output.

---

## Research Questions

1. What classes of input does the agentic workflow require, and which are *necessary* versus *sufficient*?
2. Decomposing the sample letter zone-by-zone, what is the exhaustive list of variable fields the system must populate, and which source document supplies each?
3. What does the template input alone determine (vs. what it cannot supply)?
4. What does "accuracy is paramount" add to the input contract beyond raw facts?
5. What is the minimal-sufficient input bundle, and what optional inputs improve the draft without being required?

---

## Current State (Codebase)

No application code exists yet. The foundational assets are all in `raw/` and synthesised in the wiki:

- **The template/sample**: `raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx` — a real California CCP §999 time-limited policy-limits demand from Stalwart Law Group, analysed in `wiki/knowledge/sources/aaa-insurance-demand-letter-pat-donahue.md`. Its 7-section structure is the concrete target.
- **The PRD**: `raw/prd-demand-letter-generator.md` — defines the generation contract: template + case materials → letter matching template *exactly* in structure/formatting/layout, accuracy paramount, attorney refinement loop, Claude preferred, TS/React/AWS/PostgreSQL.
- **Prior research**: `raw/research/demand-letter-legal-context/` — the legal-context layer (types, universal 10-element structure, FRE 408, SOL non-tolling, PI timeline).
- **Concept pages**: `wiki/knowledge/concepts/{demand-letter,ai-document-generation,template-driven-generation,time-limited-policy-limits-demand}.md` — already record the zone-based generation principle, boilerplate-verbatim rule, and citation-layer recommendation.

This report builds on that synthesis to answer the *inputs* question specifically and concretely.

---

## Key Findings

### 1. There are exactly two input classes; both are necessary, neither alone is sufficient [S1][S2][S3]

The PRD's own framing — *"Given a real demand letter as a template **and** relevant legal case materials"* [S1] — names the two classes:

| Class | What it is | What it determines | What it CANNOT supply |
|-------|-----------|--------------------|------------------------|
| **(A) Template** | A prior firm letter (the Donahue `.docx` is the exemplar) | Structure, section order, headings, formatting, layout, legal register, **and the verbatim boilerplate** (settlement conditions, release language, §999 acceptance mechanics) | Any case-specific fact |
| **(B) Case record** | The source documents for *this* claim | Every variable value: parties, dates, narrative facts, diagnoses, providers, dollar amounts | Any structure or formatting |

Because "matches the template exactly in structure, formatting, and layout" is a hard requirement [S1], the template is **necessary** — you cannot reconstruct a firm's exact layout and boilerplate from case facts. Because the letter must be "populated with information relevant to the case," the case record is **necessary** — the template is a blank cast. **Sufficiency** is the join: the case record must cover *every variable slot the template exposes*. A missing slot (e.g. no declarations page → no policy-limit confirmation) is an insufficiency that the workflow must detect and surface, not fill by invention.

> **Design consequence:** the agentic workflow is fundamentally a **slot-filling** problem (template defines slots; case record fills them), not a free-generation problem. This matches the wiki's existing "zone-based generation" and "boilerplate verbatim from template" principles in `ai-document-generation.md`. [S4]

### 2. Field-by-field decomposition of the Donahue letter → the exhaustive variable list and its sources [S2][S5]

The sample letter's 7 sections expose the following variable slots. This is the concrete "necessary content" set — the union of these fields is what the case record must supply.

**§1 — Header block**
| Field | Example (Donahue) | Source document |
|-------|-------------------|-----------------|
| Letter date | May 29, 2026 | system/clock or attorney input |
| Delivery method | (certified mail / email) | attorney input / firm default |
| Adjuster name + title | Elaine Collins | insurer correspondence |
| Insurer name + address | Interinsurance Exchange of the Automobile Club (AAA) | insurer correspondence / declarations |
| Claim number | (claim #) | insurer correspondence |
| Insured name | Carol Bush | police report / declarations |
| Claimant name | Patrick Donahue | intake sheet |
| Date of loss | June 6, 2025 | police report / intake |
| Demand expiry date + time | June 29, 2026, 12:00 p.m. PST | computed from letter date + firm policy (§999) |

**§2 — Salutation** — derived from adjuster name (no new field).

**§3 — Liability** (factual narrative)
| Field | Example | Source |
|-------|---------|--------|
| Incident date/time/location | June 6, 2025, Hwy 67 / Hwy 8 E, El Cajon CA | police/incident report |
| Traffic/road conditions | (conditions) | police report |
| Claimant conduct | (stopped/proceeding) | police report / client statement |
| At-fault party + conduct | Larry L. Lawhorn, rear-end | police report |
| Liability admission status | 100% accepted by AAA | insurer correspondence |

**§4 — Damages (medical narrative)**
| Field | Example | Source |
|-------|---------|--------|
| Diagnoses (clinical specificity) | multilevel lumbar/thoracic injuries | medical records |
| Treating providers (name, credential, practice, dates) | Dr. Bansal MD (Coastal Pain), Dr. Kelly DC (Santee Chiro) | medical records |
| Examination findings | (exam notes) | medical records |
| Imaging results | lumbar + thoracic MRI (MAX MRI) | radiology reports |
| Recommended future treatment | medial branch block, PT, cervical MRI | medical records |

**§5 — Specials table (itemised)**
| Field | Example | Source |
|-------|---------|--------|
| Per-provider line items + amounts | chiropractic, pain mgmt, MRI | medical bills / ledgers |
| Total specials to date | $8,625.58 | sum of bills |
| Future medical reserve | ≥ $50,000.00 | physician estimate / attorney |

**§6 — General damages / pain & suffering**
| Field | Example | Source |
|-------|---------|--------|
| Occupational/daily-life impact narrative | RV technician, physically demanding job | client statement / intake |
| General-damages figure | $100,000.00 | attorney valuation |
| Statutory citation | Cal. Civ. Code §1431.2(b)(2) | **template boilerplate (jurisdiction)** |

**§7 — Settlement demand + conditions**
| Field | Example | Source |
|-------|---------|--------|
| Demand amount | all applicable BI policy limits | attorney / §999 strategy |
| Policy limits / declarations | (per declarations page) | insurance declarations page |
| Lien handling terms | perfected-lien proof required | **template boilerplate** + lien correspondence |
| Payee instructions | client + firm only | **template boilerplate** |
| Release scope / insured declaration / delivery mechanics | scope-limited, perjury declaration, Santa Ana office | **template boilerplate (verbatim)** |
| Expiry/acceptance mechanics | 30-day, non-compliant = rejection | **template boilerplate (§999)** |

**Closing/signature** — attorney name, bar affiliation, firm (Faby Rivera, Esq.; Stalwart Law Group) → **firm profile / template**.

The rows marked **template boilerplate** confirm a critical point: a large fraction of §7 is *not* a case-record input at all — it comes verbatim from the template (class A). The case record (class B) supplies only the small set of variables those boilerplate clauses reference (policy limits, lien claimants, payee names). [S5]

### 3. The template input alone fixes everything formatting-related — but supplies zero facts [S4][S5]

Because fidelity to "structure, formatting, and layout" is mandatory, the template input must be ingested in a form that *preserves* those properties — i.e. as a structured `.docx`, not flattened plain text. The template determines: section presence and order; heading text and styling; paragraph/numbering structure; the verbatim boilerplate blocks; and the firm voice/register. The wiki already records this as "template-driven generation" and "boilerplate verbatim." What the template *cannot* do is supply any case fact — making class B independently necessary. *(Inference grounded in PRD wording + existing concept pages — no external primary source.)*

### 4. "Accuracy is paramount" adds two requirements beyond raw facts: provenance and grounding-only [S1][S2][S6]

The accuracy mandate converts a third item from "nice-to-have" into part of the input/output contract:

- **Provenance (citation layer).** Every populated value (each diagnosis, dollar figure, date, party, provider) must be traceable to the source document and location it came from, so the attorney can verify rather than re-read everything. The wiki already recommends this. This means source documents must be ingested in a way that preserves locators (page/paragraph), not just raw text. [S6]
- **Grounding-only generation.** The model must populate fields *only* from the case record + template — never from its own training knowledge. General legal/medical knowledge is explicitly **not** a permitted generation input; it is the primary inaccuracy vector (invented case law, plausible-but-wrong diagnoses). The two-class input model is therefore also a *guardrail*: if a value isn't in (A) or (B), it must be flagged as missing, not generated. [S1]

This reframes a missing input: insufficiency must produce a **gap report** ("no declarations page → policy limits unconfirmed"), not a hallucinated fill.

### 5. Minimal-sufficient bundle vs. optional inputs [S1][S2][S5]

**Necessary-and-sufficient minimal bundle** (for a Donahue-class CA PI/§999 demand):

1. **Firm template** — the prior demand letter `.docx` (structure + boilerplate + register + firm/attorney identity).
2. **Client/intake data** — claimant identity, occupation, contact, representation.
3. **Incident/police report** — liability narrative facts (date, location, parties, fault).
4. **Medical records** — diagnoses, providers, exam findings, imaging, future-care recommendations.
5. **Medical bills/ledgers** — the specials line items and totals.
6. **Insurance information** — adjuster/claim identifiers + declarations page (policy limits).
7. **Attorney-supplied valuation parameters** — general-damages figure, future-medical reserve, demand amount/strategy (these are judgment calls, not extractable facts).

Items 2–6 are the *case record*; item 1 is the *template*; item 7 is *attorney input the documents cannot supply*.

**Optional / quality-improving (not required):**
- Photographs, scene/vehicle-damage evidence (strengthen liability/damages narrative).
- Radiology image files themselves (the *reports* suffice for text).
- Lien correspondence (only if liens exist; otherwise the boilerplate clause stands unparameterised).
- Prior correspondence with the insurer (tone/context).
- Firm style guide / additional sample letters (sharpen voice matching beyond the single template).

**Refinement-loop input (PRD-required, post-draft):** attorney free-text instructions to revise specific sections — a *second-pass* input, not part of the initial generation bundle.

---

## Constraints

Any input pipeline must account for:

- **Format-preserving template ingestion** — the template must enter as structured `.docx` so structure/formatting/layout survive; flattening to text forfeits the fidelity requirement.
- **Provenance-preserving source ingestion** — case documents must retain page/paragraph locators for the citation layer; OCR'd scans (medical records are often scanned) must keep positional metadata.
- **Heterogeneous, semi-structured sources** — medical records, police reports, bills, and declarations pages have wildly different layouts; extraction must normalise them into the field set in Finding 2.
- **Missing-input handling** — sufficiency is per-slot; the workflow must detect uncovered slots and emit a gap report rather than invent values (the accuracy mandate).
- **Boilerplate must not be treated as a fillable field** — §7 conditions and §6 statutory citations come verbatim from the template; routing them through the LLM as "content to generate" risks altering legal meaning.
- **Attorney-judgment slots are inputs, not extractions** — demand amount, general-damages valuation, and future-medical reserve are decisions, not facts in the record; the system must collect them explicitly, not guess.
- **Jurisdiction coupling** — the §999 expiry/acceptance mechanics and the Cal. Civ. Code §1431.2 citation are California-specific; they live in the template, so swapping templates swaps jurisdiction handling.

---

## Solution Comparison

Not applicable — this report enumerates the required input set; it does not compare implementation technologies. (The downstream architectural choice — how to detect/label template zones and how to ingest source documents — is flagged as a decision below.)

---

## Recommendation

Model the agentic workflow's input contract as **two ingestion channels feeding a slot-filling join, gated by a sufficiency check**:

1. **Channel A — Template ingestion.** Accept the firm's prior letter as `.docx`; parse it into typed zones (header, liability, damages, specials, general damages, settlement conditions, signature). Classify each zone as *boilerplate-verbatim* or *variable-populated*. This is the structure/formatting/layout authority and must be preserved losslessly.

2. **Channel B — Case-record ingestion.** Accept the source-document set (intake, police report, medical records, bills, declarations, optional evidence). Extract into the normalised field schema from Finding 2, **with a source locator attached to every field** (provenance). Collect attorney-judgment slots (demand amount, valuation, reserve) via explicit form input, flagged as attorney-sourced.

3. **Join + sufficiency gate.** Map each variable zone in (A) to its fields from (B). Before generation, run a coverage check: every variable slot must have either an extracted value (with citation) or an explicit attorney value. Uncovered slots → **gap report**, not generation.

4. **Generate per-zone, grounded-only.** Populate variable zones from the joined data only; copy boilerplate zones verbatim. Surface the citation for each populated value.

5. **Refinement loop.** Accept attorney free-text instructions as a second-pass input scoped to named zones.

**Risks & mitigations:**
- *Hallucinated fills on missing inputs* → hard sufficiency gate + gap report; never auto-fill.
- *Boilerplate paraphrased and legally altered* → mark boilerplate zones non-LLM, copy verbatim with variable substitution only.
- *Lost formatting from text-flattening the template* → ingest/emit `.docx` structurally end-to-end.
- *Unverifiable output* → mandatory per-field provenance; no field renders without a source or explicit attorney-input tag.

**Define the field schema in Finding 2 as the canonical input contract** — it is the bridge between document ingestion and template population, and it is testable (does the case record cover every field?).

---

## Next Steps

- `/wiki-ingest raw/research/demand-letter-agentic-inputs/index.md` — synthesize this input contract into the knowledge base (likely a new `concepts/demand-letter-input-contract.md` and updates to `ai-document-generation.md`).
- `/decision-create` — decide the **template zone-detection strategy** (how to detect boilerplate-verbatim vs variable-populated zones in an arbitrary firm template).
- `/decision-create` — decide the **source-document ingestion + provenance strategy** (PDF/`.docx`/OCR parsing that preserves page/paragraph locators for the citation layer).
- `/task-add` — define the **canonical field schema** (Finding 2) as a typed contract, plus the sufficiency-gate/gap-report component.
