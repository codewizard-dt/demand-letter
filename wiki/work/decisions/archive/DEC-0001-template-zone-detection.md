---
id: DEC-0001
title: Template Zone-Detection Strategy
created: 2026-06-22
updated: 2026-06-22
tags: [template-ingestion, zone-detection, generation-architecture]
---

# DEC-0001: Template Zone-Detection Strategy

> Single-decision Decision Group covering how the generator classifies template zones as boilerplate-verbatim vs variable-populated.

- **File created**: 2026-06-22
- **Last updated**: 2026-06-22
- **Tags (group)**: template-ingestion, zone-detection

## Shared Context

The demand-letter generator's input contract treats generation as a **slot-filling join**: a firm template (class A) supplies all form and verbatim boilerplate; the case record (class B) supplies all facts. See [[../../knowledge/concepts/demand-letter-input-contract.md|Demand Letter Input Contract]] and [[../../knowledge/concepts/template-driven-generation.md|Template-Driven Generation]].

Before any fill can happen, the system must know, for every span of an arbitrary firm-supplied `.docx`, whether it is **boilerplate-verbatim** (copied byte-for-byte — release scope, payee restrictions, CCP §999 acceptance mechanics, the Cal. Civ. Code §1431.2 citation) or **variable-populated** (filled from the joined case record). The PRD makes templates a firm-managed variable input, so the generator must handle templates it has never seen, and "accuracy is paramount" makes one failure mode unacceptable: a boilerplate clause misclassified as variable gets paraphrased by the LLM and can silently alter legal meaning — malpractice-grade.

Research for this decision: `raw/research/template-zone-detection/index.md` (+ `sources.md`).

---

## D1. Adopt a hybrid LLM-seeded, human-confirmed, deterministic-markup zone-detection pipeline

- **Status**: accepted
- **Date**: 2026-06-22
- **Deciders**: David Taylor
- **Consulted**: —
- **Informed**: —
- **Supersedes**: none
- **Tags**: template-ingestion, zone-detection, generation-architecture

### Context (decision-specific)

The five candidate techniques split into two families: **auto-detection** of an unmarked letter (LLM zone classification; multi-letter diff/template induction) and **explicit markup** that makes the boundary deterministic (delimiter tags; Word content controls/SDTs; human annotation). Formatting fidelity is a property of *where the fill happens*, not of detection: explicit-markup methods fill inside the OOXML and are lossless by construction, while auto-detection that flattens the docx must map labels back onto OOXML spans to preserve formatting. This argues for **decoupling detection from fill** — detect once by whatever means, then persist the result as in-OOXML markup so every subsequent fill is deterministic and lossless.

### Decision Drivers

| # | Driver | Why it matters |
|---|--------|----------------|
| 1 | Boilerplate must never be paraphrased | Altering §999 / release / payee legal text is malpractice-grade; the asymmetric error (boilerplate → variable) is the worst outcome |
| 2 | Must work on a firm's *first* template | PRD lets any firm add templates; onboarding cannot require a pre-existing corpus of past letters |
| 3 | Formatting/layout fidelity is mandatory | Output must match the template exactly; the fill step must be OOXML-lossless |
| 4 | Automation leverage on the tedious first pass | The product promises to reduce attorney time; pure manual markup forfeits that |
| 5 | Accountable human on the legal boundary | Accuracy mandate requires a verifiable owner of the boilerplate/variable split, not a probabilistic guess |

### Considered Options

| Option | One-line summary |
|--------|------------------|
| **A. Pure LLM zone classification** | LLM labels every zone unsupervised on each template; zero setup, no human gate |
| **B. Multi-letter diff (template induction)** | Align N prior firm letters; constant spans = boilerplate, divergent = variable |
| **C. Explicit delimiter markup** | Author writes `{{field}}`/Jinja tags; docxtemplater/docxtpl fills them |
| **D. Content controls / SDTs** | Variable spans wrapped in native Word Structured Document Tags with alias/tag |
| **E. Hybrid: LLM-seed → human-confirm → persist as markup** | LLM pre-labels, attorney confirms once, store as deterministic in-OOXML markup |

### Option Comparison

| Criterion | A. Pure LLM | B. Multi-letter diff | C. Delimiter markup | D. Content controls | E. Hybrid |
|-----------|-------------|----------------------|---------------------|---------------------|-----------|
| Driver 1 — boilerplate never paraphrased | ❌ | ⚠️ | ✅ | ✅ | ✅ |
| Driver 2 — works on first template | ✅ | ❌ | ✅ | ✅ | ✅ |
| Driver 3 — formatting fidelity | ⚠️ (must map back) | ⚠️ (must map back) | ✅ | ✅ | ✅ |
| Driver 4 — automation leverage | ✅ | ✅ | ❌ | ❌ | ✅ |
| Driver 5 — accountable human boundary | ❌ | ❌ | ✅ (author) | ✅ (author) | ✅ |
| Implementation cost | Low | Med | Low | Med | High |
| Reversibility | Easy | Easy | Med | Med | Med |

### Trade-off Detail per Option

#### Option A: Pure LLM zone classification

| Aspect | Assessment |
|--------|------------|
| Pros | Zero per-firm setup, generalizes across any template, lowest build cost, works on first letter |
| Cons | Probabilistic decision on malpractice-grade text; LLMs weaker at rigid extraction than classification; flattening loses formatting |
| Risks | Asymmetric failure: boilerplate mislabeled variable → paraphrased legal text, silently wrong |
| Exit cost | Easy — wrap with a human gate to become Option E |

#### Option B: Multi-letter diff (template induction)

| Aspect | Assessment |
|--------|------------|
| Pros | Empirically grounded, high precision on boilerplate when letters align, no per-template manual markup |
| Cons | Cold-start — needs ≥2–3 aligned letters per firm; alignment breaks on reordered/optional sections |
| Risks | A new firm or one-off template cannot be onboarded; false "variable" spans where letters happened to differ |
| Exit cost | Easy — can be used to pre-seed Option E instead of the LLM |

#### Option C: Explicit delimiter markup

| Aspect | Assessment |
|--------|------------|
| Pros | Deterministic and OOXML-lossless (docxtemplater/docxtpl fill in-zip); explicit unambiguous boundary; proven in legal tech (Docassemble/Suffolk LIT Lab) |
| Cons | A human must author every tag; no automation of detection; lawyers handle raw `{{tags}}` |
| Risks | Tight formatting can break on long substituted values (test short+long) |
| Exit cost | Medium — tags become the persistence substrate under Option E |

#### Option D: Content controls / SDTs

| Aspect | Assessment |
|--------|------------|
| Pros | Native Word objects, lossless formatting, machine-readable boundaries, alias/tag metadata, XML data binding, edited via normal Word UI |
| Cons | Authoring requires inserting controls (Developer tab); less obvious to untrained authors; still manual, not auto-detection |
| Risks | Onboarding friction if firms must learn content controls |
| Exit cost | Medium — SDTs become the persistence substrate under Option E |

#### Option E: Hybrid (LLM-seed → human-confirm → persist as markup)

| Aspect | Assessment |
|--------|------------|
| Pros | Automation on the tedious first pass; accountable human owns the legal boundary; persisted markup makes every later fill deterministic and lossless; works on a firm's first template; generation never re-classifies |
| Cons | Highest build cost — needs a structural docx parser plus an annotation UI |
| Risks | Annotation UI scope creep; mitigated by starting with a thin review screen over delimiter tags |
| Exit cost | Medium — degrades gracefully to C/D (drop the LLM seed) or to A (drop the human gate) if priorities change |

### Decision Outcome

**Chosen option**: **Option E — Hybrid: LLM-seed → human-confirm → persist as deterministic markup**, because it is the only option that satisfies Driver 1 (boilerplate never paraphrased) *and* Driver 4 (automation leverage) *and* Driver 2 (first-template support) simultaneously — it routes the LLM to the tedious first pass while keeping an accountable human on the malpractice-grade boundary and making the eventual fill a deterministic, lossless substitution.

### Decision Flow

```mermaid
flowchart TD
    A[Firm uploads .docx template] --> B[Structural docx parse<br/>keep OOXML spans, no flatten]
    B --> C[LLM pre-labels each zone<br/>boilerplate-verbatim | variable-populated<br/>+ suggested field name]
    C --> D[Attorney annotation UI<br/>confirm / correct boundary - once per template]
    D --> E{All zones labeled?}
    E -- no --> D
    E -- yes --> F[Persist zone map as in-OOXML markup<br/>content controls or delimiter tags]
    F --> G[Generation: deterministic substitution<br/>boilerplate byte-exact, variables from case record]
    G --> H[No re-classification in the hot path]
```

### Consequences

| Type | Consequence |
|------|-------------|
| ✅ Positive | Removes probabilistic decisions from malpractice-grade text; every fill is deterministic and formatting-lossless |
| ✅ Positive | Onboards a firm's very first template (no corpus needed); attorney review is one-time per template, not per letter |
| ⚠️ Negative | Requires building a structural docx parser and an annotation UI — the highest build cost of the five options |
| ⚠️ Negative | Adds a human step to template onboarding (acceptable: one-time, and it is the accountable legal gate) |
| 🔁 Follow-up | Decide the persistence substrate (content controls vs delimiter tags) and the docx parsing library — a separate decision |
| 🔁 Follow-up | Task: structural docx parser that maps labels to OOXML spans without flattening |
| 🔁 Follow-up | Task: attorney zone-annotation UI; gate generation on a fully-mapped template |

### Validation

| Signal | Threshold | When measured |
|--------|-----------|---------------|
| Boilerplate zones altered in generated output | 0 (byte-exact vs template) | Per generation, from first integration test |
| Zones requiring attorney correction after LLM pre-label | Trends downward as prompts improve | Across first 10 templates onboarded |
| Generation blocked on an unlabeled/unconfirmed zone | 100% blocked (fail-closed) | Per generation |

### Links

- Related concepts: [[../../knowledge/concepts/demand-letter-input-contract.md|Demand Letter Input Contract]], [[../../knowledge/concepts/template-driven-generation.md|Template-Driven Generation]], [[../../knowledge/concepts/ai-document-generation.md|AI Document Generation]]
- Research: `raw/research/template-zone-detection/index.md`
- Follow-on decision (to create): persistence substrate (content controls vs delimiter tags) + docx parsing library
- Source task(s): _(none yet — `/task-add` after finalize)_
