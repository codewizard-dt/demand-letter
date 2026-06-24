---
topic: 'persistence substrate for a docx demand-letter template: Word content controls (Structured Document Tags / SDTs) vs delimiter/placeholder tags (docxtemplater / docxtpl Jinja). For a TypeScript/React/Node/AWS stack, compare library maturity, conditional/repeating handling, round-trip fidelity, attorney authoring UX, and round-trip with the DEC-0001 LLM-seed → human-confirm pipeline. Boilerplate must stay byte-exact; substitution must be deterministic.'
slug: docx-persistence-substrate
researched: 2026-06-22
sources: [./sources.md]
---

# Research: Docx Persistence Substrate — Content Controls vs Delimiter Tags

> **The question (deferred from DEC-0001):** once the zone-detection pipeline knows which spans are boilerplate-verbatim and which are variable, _in what markup_ do we persist that zone map inside the `.docx` so every later fill is deterministic and lossless? Two substrates compete: **Word content controls / SDTs** (native Word objects) and **delimiter/placeholder tags** (`{tag}`, filled by docxtemplater/docxtpl). For the project's TypeScript/React/Node/AWS stack the recommendation is **delimiter tags filled by docxtemplater (OSS core)**, for three converging reasons: (1) the OSS Node ecosystem is markedly more mature for delimiter-tag filling — docxtemplater, docx-templates, and easy-template-x are all active and native to Node/browser, whereas programmatic SDT _filling_ generally requires a heavy commercial library (Aspose) or hand-rolled OOXML; (2) docxtemplater natively supports the exact constructs the Donahue letter needs — **loops** (`{#specials}…{/specials}` for the itemised specials table), **conditionals** (`{#hasLiens}…{/hasLiens}` for optional §7 clauses), a **structured error schema** that refuses to emit a corrupt file, and **`InspectModule`** to enumerate every placeholder in a template (which feeds the input-contract sufficiency gate directly); and (3) **DEC-0001 already mandates a custom annotation UI that writes the markup programmatically** — so the one real advantage of SDTs (native in-Word authoring) is moot, while their disadvantage (thin OSS fill tooling) is not. Boilerplate stays byte-exact because it is simply never inside a tag; substitution is deterministic by construction.

## Research Questions

1. Which substrate has better library maturity and API ergonomics for _filling_ in Node/TS?
2. How does each handle conditional sections and repeating rows (the specials table; optional §7 conditions)?
3. How does each preserve round-trip formatting fidelity and keep boilerplate byte-exact?
4. What is the attorney authoring UX, and how would the DEC-0001 annotation UI write the chosen markup?
5. How does the persisted zone map round-trip with the LLM-seed → human-confirm pipeline (sufficiency gate, re-editing)?

## Current State (Codebase)

No application code exists yet. Relevant context:

- **DEC-0001#D1 (accepted)** chose the hybrid zone-detection pipeline and explicitly **deferred the persistence-substrate choice** (content controls vs delimiter tags) plus the docx parsing library to this follow-on decision. See `wiki/work/decisions/archive/DEC-0001-template-zone-detection.md`.
- **`docx-zone-detection-pipeline.md`** records the "decouple detection from fill" and "never flatten" principles, and lists docxtemplater/SDTs as candidate substrates.
- **`demand-letter-input-contract.md`** defines the ~40-field schema, the three field origins (extracted / boilerplate-verbatim / attorney-judgment), and the **sufficiency gate** that must verify every variable slot is covered before generation.
- **`docxtemplater.md`** (tool entity) already frames docxtemplater/docxtpl as a candidate substrate.
- The PRD fixes the stack as **TypeScript/React/Node.js/AWS Lambda/PostgreSQL** with Claude for generation — so a Node-native, serverless-friendly fill library is strongly preferred over a .NET-bridged or external-service dependency.

## Key Findings

### 1. The OSS Node ecosystem strongly favors delimiter-tag filling [S2][S3][S4][S5]

Delimiter-tag templating has multiple mature, actively-maintained, Node-and-browser libraries: **docxtemplater** (tested on Node 12–24, with React/Angular/Vue/Next.js integration guides) [S2], **docx-templates**, and **easy-template-x** [S3][S4]. By contrast, programmatic _filling_ of Word **content controls/SDTs** in pure Node is comparatively thin: `easy-template-x` offers a data-binding extension for **custom XML parts** [S4], but the general-purpose SDT manipulation story leads to **Aspose.Words** (a commercial, .NET-via-Node package) [S5] or hand-rolled OOXML editing. The `docx` (dolanmiu) library is excellent for _generating_ documents declaratively but is not a template-fill engine for an arbitrary firm `.docx` [S3]. For a serverless TS/Node stack, the delimiter-tag path has the lower dependency risk and the better-trodden path.

### 2. docxtemplater natively covers the Donahue letter's hard cases [S1][S6]

The sample letter needs two non-trivial constructs, both first-class in docxtemplater:

| Need (Donahue letter)                                        | docxtemplater construct                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Itemised specials table (N provider rows)                    | Loop `{#specials}{provider} {amount}{/specials}` with `paragraphLoop`/table-row repetition [S1]                                |
| Optional §7 clauses (e.g. lien handling only if liens exist) | Conditional `{#hasLiens}…{/hasLiens}` / inverted `{^hasLiens}…{/hasLiens}` [S1]                                                |
| Missing-value handling (fail-closed / gap report)            | `nullGetter` returns a controlled marker or keeps the placeholder, instead of silently emptying [S1][S6]                       |
| Refuse to emit a corrupt file                                | Structured **error schema** (`unopened_tag`, `unclosed_tag`, `duplicate_open_tag`, `multi_error`, …) thrown before output [S6] |

The `nullGetter` + error-schema behaviour aligns with the input contract's **sufficiency gate**: a missing variable can be made to fail loudly (or render a visible `[Missing: x]`) rather than produce a silently-wrong letter. [S1][S6]

### 3. docxtemplater's InspectModule enumerates a template's placeholders — feeding the sufficiency gate [S6]

Before rendering, docxtemplater compiles the template and, via **InspectModule**, exposes the full list of placeholders/tags. This is exactly the data the **sufficiency gate** needs: parse a confirmed template → list its variable slots → check the joined case record covers each → emit a gap report for any uncovered slot. The substrate thus does double duty as the slot-enumeration mechanism, not just the fill engine. [S6]

### 4. The DEC-0001 annotation UI neutralises SDT's main advantage and docxtemplater's main pitfall [S2][S6][S7]

The classic real-world docxtemplater failure is the **split-run / "unopened tag" problem**: when a human types `{{tag}}` into Word, Word may split it across XML runs or autocorrect quotes, producing `unclosed_tag`/`unopened_tag` errors [S6][S7]. **But DEC-0001 mandates a custom annotation UI that writes the markup programmatically** — the app inserts clean, single-run tags onto the confirmed zones, so attorneys never hand-type tags in Word. This simultaneously:

- **neutralises docxtemplater's main pitfall** (no hand-typed tags → no split runs), and
- **neutralises SDTs' main advantage** (native in-Word authoring UX is irrelevant when the boundary is confirmed in the app, not in Word).

What remains is each substrate's _programmatic_ fill story — where delimiter tags win on OSS maturity. SDTs retain a secondary edge (machine-readable boundaries with alias/tag, and the ability to remain visible as editable controls in Word), but neither is needed once the zone map is persisted and generation is headless.

### 5. Both substrates are OOXML-lossless; boilerplate byte-exactness is a property of "outside a tag" [S2][S8]

Both delimiter-tag fillers (operating inside the PizZip/OOXML) and SDTs (native OOXML nodes) preserve surrounding formatting exactly [S2][S8]. For delimiter tags, **boilerplate is byte-exact precisely because it is never inside a tag** — the engine only touches tag spans, copying everything else verbatim. Determinism follows: given the same data, the same bytes. The one fidelity caveat (shared by all substrates) is that **substituted variable content of varying length can disturb tightly-formatted layout**, so variable slots should be tested with short and long values. [prior research S2 / template-zone-detection]

## Constraints

- **Stack fit**: must be Node/TS-native and serverless-friendly (AWS Lambda); avoid .NET bridges or external paid APIs for the core fill path.
- **Boilerplate byte-exact + deterministic fill**: non-negotiable (malpractice risk); the substrate must touch only variable spans.
- **Must express loops + conditionals**: the specials table and optional §7 clauses are not flat fields.
- **Must enumerate slots**: the sufficiency gate needs the template's variable list.
- **Annotation UI writes the markup**: the substrate must be programmatically authorable (insert tags/controls onto confirmed zones), not reliant on manual Word authoring.
- **Re-editability**: a firm must be able to revise a template later; the persisted markup should survive a round-trip and re-confirmation.

## Solution Comparison

| Criteria                          | A. Delimiter tags (docxtemplater)                     | B. Content controls / SDTs                        | C. SDT + custom XML data binding              |
| --------------------------------- | ----------------------------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| **Approach**                      | `{tag}` placeholders filled inside OOXML              | Native `<w:sdt>` controls filled programmatically | SDTs bound to a custom XML part; fill the XML |
| **Node/TS OSS maturity**          | High (docxtemplater, docx-templates, easy-template-x) | Low (Aspose commercial or hand-rolled OOXML)      | Low–Med (easy-template-x data-binding ext.)   |
| **Loops / conditionals**          | Native (`{#}`, `{^}`, table-row loops)                | Manual (repeat/clone SDT nodes by hand)           | Manual / XML-driven                           |
| **Slot enumeration**              | Built-in (InspectModule)                              | Custom walk of SDT nodes                          | Read custom XML schema                        |
| **Boilerplate byte-exact**        | Yes (only tags touched)                               | Yes (only control content touched)                | Yes                                           |
| **Formatting fidelity**           | Lossless (in-OOXML)                                   | Lossless (native)                                 | Lossless (native)                             |
| **Authoring UX (attorney)**       | App writes tags; raw tags ugly if hand-edited         | Native Word controls (moot — app writes them)     | Native + data binding (complex)               |
| **Dependency risk**               | Low (OSS core; paid modules optional)                 | High (Aspose) or high-effort (hand-rolled)        | Med–High                                      |
| **Complexity**                    | Low–Med                                               | High                                              | High                                          |
| **Codebase fit (TS/Node/Lambda)** | Excellent                                             | Poor (без .NET) / heavy                           | Medium                                        |

## Recommendation

**Adopt Option A — delimiter/placeholder tags filled by docxtemplater (OSS core).**

It is the only option that is simultaneously Node/TS-native, serverless-friendly, and natively capable of the loops, conditionals, slot-enumeration, and fail-closed error handling the Donahue letter and the input contract require — and DEC-0001's annotation UI erases the one scenario (hand-typed tags in Word) where docxtemplater is fragile, while also erasing SDTs' one genuine advantage (native Word authoring). Boilerplate stays byte-exact because it lives outside every tag; substitution is deterministic by construction.

**Implementation outline:**

1. **Tag schema** — define a canonical tag vocabulary mapped to the input-contract field schema (e.g. `{claimant_name}`, `{#specials}{provider}{amount}{/specials}`, `{#hasLiens}…{/hasLiens}`).
2. **Annotation UI writes tags** — on attorney confirmation, the app inserts clean single-run tags onto the confirmed variable zones (avoiding split-run corruption); boilerplate zones are left untouched.
3. **Slot enumeration via InspectModule** — parse the confirmed template to list variable slots; wire this into the input-contract **sufficiency gate** and gap report.
4. **Deterministic fill** — render with the joined case record; configure `nullGetter` to fail-closed (or surface `[Missing: …]`) and `errorLogging` to capture the structured error schema; never emit on `multi_error`.
5. **Round-trip** — store the tagged `.docx` as the canonical template artifact; re-edits re-enter the LLM-seed → human-confirm loop.

**Risks & mitigations:**

- _Split-run/unopened-tag corruption_ → app writes tags programmatically (single run), never hand-typed in Word; validate every template with InspectModule before activation. [S6][S7]
- _Variable content length breaks tight layout_ → test each slot with short and long values; prefer reflowing styles.
- _Advanced needs hit paid modules_ → the OSS core covers text, loops, conditions; budget for PRO modules only if HTML/image insertion becomes required. [S2]
- _Long-term Word-native editing desired by a firm_ → revisit Option B/C later; the zone map is portable, so a substrate migration is bounded.

**Alternative if constraints change:** if the product later requires firms to **author and maintain templates directly inside Word** (no app-side annotation UI), content controls/SDTs (Option B) become preferable despite the heavier fill tooling, because they are first-class Word objects rather than visible tag noise.

## Next Steps

- This report backs **`/decision-create — docx persistence substrate`** (DEC-0002). Draft options A/B/C with Option A as the recommended outcome.
- Follow-on: `/task-add` the **docx parsing + tag-writing module** (annotation UI → clean single-run tags) and the **fill engine** (docxtemplater render + nullGetter fail-closed + sufficiency-gate via InspectModule).
- `/wiki-ingest raw/research/docx-persistence-substrate/index.md` after the decision is drafted.
