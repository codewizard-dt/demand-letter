# Template Zone-Detection Strategy (DEC-0001#D1 — accepted 2026-06-22)

## Decision (DEC-0001#D1 accepted + DEC-0002#D1 accepted + DEC-0003#D1 accepted + DEC-0003#D2 accepted)
The generator uses a **hybrid pipeline** to classify template zones as boilerplate-verbatim vs variable-populated:

1. **Structural docx parse** — parse the `.docx` keeping OOXML spans, paragraph/run/style references intact. **Never flatten to plain text** — flattening forfeits formatting fidelity.
2. **LLM pre-labels each zone** — proposes `boilerplate-verbatim | variable-populated` per zone and suggests a field name from the canonical schema. Works on the very first template from a new firm.
3. **Attorney annotation UI confirms/corrects** — one-time per template; this is the accountable human gate on malpractice-grade legal text.
4. **Persist as in-OOXML markup** — store the confirmed zone map as native content controls (SDTs) or delimiter tags (`{{field}}`). From this point on, generation is a **deterministic substitution**; the boundary never re-classifies at generation time.

## Critical constraint
**Boilerplate zones must NEVER route through the LLM as content to generate** — asymmetric failure mode. §999 conditions, release scope, payee restrictions, Cal. Civ. Code §1431.2 citation are all boilerplate and must be copied byte-for-exact.

## Key rationale
Pure LLM classification (no human gate) violates the "accuracy is paramount" mandate — a mislabeled boilerplate clause gets paraphrased and silently alters legal meaning. The hybrid keeps the LLM on the tedious first pass and the human on the legal boundary.

## Persistence substrate (DEC-0002#D1 — accepted 2026-06-22)
Use **delimiter/placeholder tags filled by docxtemplater (OSS core)**. The annotation UI inserts clean single-run `{tag}` placeholders onto confirmed variable zones; boilerplate is left entirely untouched. Key capabilities that drove the choice:
- **Native loops** `{#specials}…{/specials}` for the itemised specials table
- **Native conditionals** `{#hasLiens}…{/hasLiens}` for optional §7 clauses
- **InspectModule** enumerates all placeholder slots before render → feeds the input-contract sufficiency gate
- **nullGetter** + structured error schema (`unopened_tag`, `unclosed_tag`, `multi_error`) fail closed; never emit a corrupt or slot-missing document
- Programmatic tag insertion from the annotation UI eliminates the split-run pitfall

Do NOT use Word content controls (SDTs) — programmatic fill in Node requires Aspose (commercial .NET bridge) or hand-rolled OOXML; loops/conditionals are manual; no built-in slot enumeration.

## Research backing
`raw/research/template-zone-detection/index.md` — 5 options, 10 sources.
`raw/research/docx-persistence-substrate/index.md` — 3 substrate options, 8 sources.
