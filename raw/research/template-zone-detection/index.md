---
topic: 'template zone-detection strategy: how to automatically classify zones of an arbitrary firm demand-letter .docx template as boilerplate-verbatim (copy unchanged) vs variable-populated (fill from case record), for an LLM document-generation pipeline. Cover techniques: LLM-based zone classification, diff across multiple sample letters from the same firm, delimiter/placeholder markup conventions, docx structural parsing (styles, content controls, structured document tags), human-in-the-loop template annotation UI. Weigh accuracy, generalization across firms, setup cost, and how each preserves docx formatting fidelity.'
slug: template-zone-detection
researched: 2026-06-22
sources: [./sources.md]
---

# Research: Template Zone-Detection Strategy

> **The question:** before the generator can fill a firm's template, it must know _which spans are boilerplate-verbatim_ (copied unchanged, malpractice-grade legal text) and _which are variable slots_ (filled from the case record). Five techniques exist, and they split cleanly into two families: **automatic detection** of an unmarked letter (LLM classification, multi-letter diff) and **explicit markup** that makes the boundary deterministic (delimiter tags, Word content controls, human annotation UI). The accuracy mandate is decisive: a boilerplate clause misclassified as variable gets paraphrased by the LLM and silently alters legal meaning — so **no purely-automatic method can be trusted unsupervised**. The recommendation is a **hybrid: LLM pre-labels zones on ingest → attorney confirms/corrects them once in an annotation UI → the confirmed map is persisted as deterministic markup (content controls or `{{delimiter}}` tags) so every subsequent fill is verbatim-exact and formatting-lossless.** This buys automation leverage on the tedious first pass, puts a human on the legal-correctness boundary, and makes generation a deterministic substitution rather than a probabilistic rewrite.

## Research Questions

1. What techniques can classify a template zone as boilerplate-verbatim vs variable-populated, and how does each actually work on a `.docx`?
2. Which techniques _auto-detect_ from an arbitrary unmarked letter vs which require an explicit markup/authoring step?
3. How does each technique score on accuracy, generalization across firms, setup cost, and docx formatting fidelity?
4. Given the project's "accuracy is paramount / boilerplate must be verbatim" mandate, which failure modes are unacceptable, and what architecture mitigates them?

## Current State (Codebase)

No application code exists yet. The relevant foundations are in the wiki:

- The two-class **input contract** (`wiki/knowledge/concepts/demand-letter-input-contract.md`) already establishes the three field origins — **extracted / boilerplate-verbatim / attorney-judgment** — and names this exact decision as downstream work: _"how to detect boilerplate-verbatim vs variable-populated zones in an arbitrary firm template."_
- `template-driven-generation.md` records the requirement that boilerplate be reproduced verbatim with variable substitution only, ingested losslessly as structured `.docx` (flattening to text forfeits fidelity).
- `ai-document-generation.md` records "zone-based generation" and "boilerplate verbatim from template" as design principles.
- The PRD specifies firms create and manage their own templates — so the template is an arbitrary, firm-supplied variable input, not a fixed schema. The generator must handle templates it has never seen.

The decision this research supports is **DEC-0001 (template zone-detection)**.

## Key Findings

### 1. The five techniques split into "auto-detect" vs "explicit markup" [S1][S2][S3][S4][S5]

| Technique                                  | Family                     | How it draws the boilerplate/variable boundary                                                                                    |
| ------------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **LLM zone classification**                | Auto-detect                | Feed template paragraphs/structure to an LLM; it labels each span boilerplate vs variable from semantics [S5][S6]                 |
| **Multi-letter diff (template induction)** | Auto-detect                | Align N prior letters from the same firm; constant spans = boilerplate, divergent spans = variable slots [S7][S8]                 |
| **Delimiter/placeholder markup**           | Explicit markup            | Template authored with `{{field}}` / Jinja tags; everything outside a tag is boilerplate by definition [S1][S2]                   |
| **Content controls / SDTs**                | Explicit markup            | Variable spans wrapped in native Word Structured Document Tags carrying an `alias`/`tag`; everything else is boilerplate [S3][S4] |
| **Human-in-the-loop annotation UI**        | Explicit markup (assisted) | Attorney highlights variable zones in a UI; system stores the zone map (can be LLM-seeded) [S5]                                   |

### 2. Delimiter markup is the legal-tech standard and is deterministic + formatting-lossless [S1][S2]

The dominant docx templating libraries — **docxtemplater** (JS) and **docxtpl/Jinja2** (Python, used by **Docassemble / Suffolk LIT Lab's Document Assembly Line**) — operate directly on the OOXML inside the `.docx` zip, so **all formatting, styles, and layout are preserved exactly**; only the tag text is replaced [S1][S2]. Delimiters are configurable (`{…}`, `<<…>>`, `{{…}}`, ERB-style) to avoid collisions with template prose [S1]. The boilerplate/variable boundary is **explicit and unambiguous**: anything not inside a tag is copied verbatim. The cost is that **a human must author the tags** — these libraries fill templates, they do not detect zones in an unmarked letter.

> Document Assembly Line (a production legal-document system) uses exactly this: `{{ field_name }}` fill-ins and `{%p if %}` conditional paragraphs in DOCX, and explicitly warns to "test with both short and long amounts of text" because tightly-formatted legal documents are sensitive to substituted content length [S2].

### 3. Word content controls (SDTs) are a native, machine-readable variable-slot mechanism [S3][S4]

OOXML defines **Structured Document Tags** (`<w:sdt>`), the XML behind Word's "content controls." Each carries an `<w:alias>` (friendly name) and `<w:tag>`, can show placeholder text (`<w:showingPlcHdr>`), and can be **bound to a custom XML data part** so values populate from data [S3][S4]. Because SDTs are native Word objects, they preserve formatting perfectly, give crisp programmatic boundaries (the document model exposes each SDT node [S4]), and are editable by lawyers through Word's normal UI rather than raw tags. The cost is authoring: someone inserts the controls (Word Developer tab), and untrained authors find them less obvious than typing `{{tags}}`.

### 4. Auto-detection works but cannot be trusted unsupervised for legal boilerplate [S5][S6][S9]

LLM zone classification generalizes across firms with **zero per-firm setup** — describe the field meanings, pass blocks, let the model label them [S6] — and the same "classify the block, then extract" pattern is widely used [S5]. But two limits matter here:

- LLMs are a strong fit for _classification/summary_ but a **weaker, error-prone fit for rigidly-defined extraction**, and production IDP guidance positions LLMs as "strategic accelerators within a broader pipeline," not the trusted final authority for precise field capture [S9]. A peer-reviewed comparison found general LLMs do not yet match bespoke models on rigid extraction/NER tasks [S10].
- **The failure mode is asymmetric and severe.** If the classifier marks a boilerplate clause (release scope, §999 acceptance mechanics, payee restrictions) as _variable_, the generation step paraphrases it and can silently alter legal meaning — malpractice-grade. The input-contract concept page already flags this as the reason boilerplate must be routed non-LLM. So an unsupervised classifier's mistakes land exactly where the cost is highest.

### 5. Multi-letter diff is precise on boilerplate but has a cold-start and alignment problem [S7][S8]

Template induction / wrapper induction infers a template from **multiple example documents**: spans that are constant across letters are boilerplate; spans that vary are slots [S7]. Recent work (TWIX) infers a "visual template" from repeated documents using phrase-location patterns rather than fragile coordinates [S8]. For a firm with a corpus of past demand letters this is empirically grounded and high-precision on the verbatim boilerplate. Its weaknesses: it needs **several aligned samples per firm** (a new firm or a one-off template can't use it), and **alignment breaks** when sections are reordered, optional, or differently populated — common in real letters.

### 6. Formatting fidelity is a property of _where the fill happens_, not of detection [S1][S2][S3]

All explicit-markup methods (delimiters, SDTs) fill **inside the OOXML**, so they are formatting-lossless by construction [S1][S2][S3]. Auto-detection methods that flatten the docx to plain text for the LLM **lose the structure** and must map the labels back onto the original OOXML spans to preserve formatting — an extra, error-prone step. This is why detection and fill are best decoupled: detect once (however), then **persist the result as in-OOXML markup** so every fill is lossless.

## Solution Comparison

| Criteria                             | A. LLM zone classification      | B. Multi-letter diff     | C. Delimiter markup   | D. Content controls (SDT) | E. Human annotation UI (LLM-seeded) |
| ------------------------------------ | ------------------------------- | ------------------------ | --------------------- | ------------------------- | ----------------------------------- |
| **How boundary is set**              | Model semantics                 | Cross-letter constancy   | Author types tags     | Author inserts controls   | Attorney confirms (LLM pre-labels)  |
| **Auto from unmarked letter?**       | Yes                             | Yes (needs ≥2–3 letters) | No                    | No                        | Partial (LLM draft, human final)    |
| **Accuracy on boilerplate**          | Risky (asymmetric errors)       | High (if aligned)        | Exact (by definition) | Exact (by definition)     | Highest (human owns boundary)       |
| **Generalization across firms**      | High (zero setup)               | Medium (needs corpus)    | High (any template)   | High (any template)       | High                                |
| **Per-template setup cost**          | None                            | None (needs corpus)      | Manual tag authoring  | Manual control authoring  | One-time human review               |
| **Formatting fidelity**              | Low unless mapped back to OOXML | Low unless mapped back   | Lossless (in-OOXML)   | Lossless (in-OOXML)       | Lossless (persists as markup)       |
| **Build cost**                       | Low                             | Medium                   | Low (libs exist)      | Medium (Word UX)          | High (build the UI)                 |
| **Trust for malpractice-grade text** | ❌ unsupervised                 | ⚠️ corpus-dependent      | ✅                    | ✅                        | ✅                                  |

## Recommendation

**Adopt a hybrid that decouples detection from fill: LLM-assisted detection → human confirmation → persisted deterministic markup.**

1. **On template ingest, LLM pre-labels zones.** Parse the `.docx` structurally (do not flatten — keep paragraph/run/style references), send the prose to the LLM, and have it propose, per zone, `boilerplate-verbatim` vs `variable-populated` plus a suggested field name from the canonical schema. This gives automation leverage and works on the very first letter from a brand-new firm.
2. **Attorney confirms/corrects once in an annotation UI.** The attorney reviews the pre-labels and fixes the boundary — this is the accountable human check that the accuracy mandate requires, and it is **one-time per template**, not per letter.
3. **Persist the confirmed map as in-OOXML markup** — either native content controls (SDTs with `alias`/`tag`) or delimiter tags consumed by docxtemplater. From then on, every generation is a **deterministic substitution**: boilerplate copied byte-for-byte, variable slots filled from the joined case record, formatting lossless.
4. **Generation never re-classifies.** Once a template is mapped, the boilerplate boundary is fixed data, not an LLM decision — removing the asymmetric-error risk from the hot path.

**Why not the alternatives alone:** pure LLM classification (A) puts probabilistic decisions on malpractice-grade text with no human gate; multi-letter diff (B) can't serve a firm's first template and breaks on section reordering; pure manual markup (C/D) forfeits the automation the product promises and burdens lawyers with tag/control authoring on every template. The hybrid keeps each technique where it is strong: LLM for the tedious first pass, human for the legal boundary, deterministic markup for the fill.

**Implementation outline:**

- Choose the persistence substrate (content controls vs delimiter tags) — this is a sub-decision; delimiter+docxtemplater is lower build cost, SDTs give better in-Word UX and XML data binding.
- Build the structural docx parser that maps LLM/attorney labels back to OOXML spans without flattening.
- Build the annotation UI (can be minimal: render zones, toggle boilerplate/variable, name the field).
- Gate generation on a fully-mapped template (no unlabeled zones).

**Risks & mitigations:**

- _LLM mislabels boilerplate as variable_ → caught by the mandatory human confirmation step before any generation; generation can't run on an unconfirmed map.
- _Substituted content breaks tight formatting_ → test slots with short and long values (the Document Assembly Line warning [S2]); prefer styles that reflow.
- _Annotation UI build cost_ → start with delimiter tags + a thin review screen; upgrade to SDT-based editing later.
- _Firm has no prior corpus_ → the LLM-seeded path needs only the single template, so diff's cold-start problem never blocks onboarding.

**Alternative if constraints change:** if a firm supplies a large, consistent corpus of past letters and onboarding speed matters more than first-letter support, multi-letter diff (B) can pre-seed the zone map even more reliably than the LLM, feeding the same human-confirmation step.

## Next Steps

- This report is the research input for **`/decision-create — template zone-detection`** (DEC-0001). Draft options A–E with the hybrid as the recommended outcome.
- A follow-on decision will choose the **persistence substrate** (content controls vs delimiter tags) and the **docx parsing/ingestion library**.
- `/wiki-ingest raw/research/template-zone-detection/index.md` to synthesize this into the knowledge base after the decision is drafted.
