---
topic: What does the submit attorney judgment button actually do? Does that phrase have a known meaning in the legal field and in this context specifically?
slug: attorney-judgment-button
researched: 2026-06-29
sources: [./sources.md]
---

# Research: "Submit Attorney Judgment" — What It Does and Whether the Name Fits

> The button upserts manually entered field values into `ExtractedField` records tagged `source: 'attorney-judgment'` with `confidence: 1.0`, marking them as authoritative overrides of AI extraction. In legal practice, "attorney judgment" is a real malpractice doctrine (also called "judgmental immunity") that shields attorneys from liability for reasonable strategic choices — not a synonym for "manual input." The name is a plausible internal code metaphor but is jargon-loaded and misleading as a UI label. **Recommended replacement: "Save Values"** (or "Apply Corrections" if the override framing is important).

## Research Questions

1. What does the button do mechanically in the codebase?
2. Does "attorney judgment" have a specific meaning in legal practice?
3. Is that meaning related to what the button does?
4. How do comparable legal AI tools describe this step?
5. What label would be clearer for attorneys using the product?

## Current State (Codebase)

**Endpoint**: `POST /jobs/:id/attorney-judgment` — implemented in both `app/server/src/handlers/post-jobs-attorney-judgment.ts` and duplicated in `app/server/src/routes/rest.ts:567`.

**What it does**:
1. For each `{ fieldName, value }` in `req.body.fields`: upserts an `ExtractedField` row with:
   - `source: 'attorney-judgment'`
   - `confidence: 1.0`
   - `isNull: false`
   - `nullReason: null`
   - `blockIds: []` (no citation — the attorney supplied it directly)
2. Previously also handled `acceptMissing` slots (marking them `acceptMissing: true`); that path still exists in the handler but the UI no longer sends it [S1].

**Downstream effect**: The sufficiency gate (`app/server/src/lib/sufficiency-gate.ts:46`) treats `source === 'attorney-judgment'` as unconditionally covered — confidence is ignored, `isNull` is ignored. An attorney-entered value can never be a gap [S2].

**In plain English**: The button persists whatever the attorney typed into the gap-report form as a first-class fact with full authority, overriding whatever the AI extracted (or didn't).

## Key Findings

**[S3] "Attorney judgment" is a real legal doctrine — legal malpractice law.** Pennsylvania courts (and most US jurisdictions) apply the "attorney judgment rule" (also called "judgmental immunity rule"): a malpractice claim is barred when an attorney exercised an informed professional judgment on an unsettled question, even if it later proved wrong. It is a shield from liability, not a descriptor of data entry. Using it as a UI label imports heavy connotations that have nothing to do with filling in a form field.

**[S4] Legal AI tools use "attorney review/approval" language, not "judgment."** Industry sources (lawpractice.ai, Stanford LASSB, proplaintiff.ai) consistently phrase this step as "attorney reviews and approves" or "attorney sign-off" — language that connotes sign-off on AI output, not a named legal doctrine [S4].

**The internal `source` tag is fine; the button label is the problem.** Using `'attorney-judgment'` as a DB enum value is reasonable shorthand for "attorney-supplied, authoritative." Surfacing that exact phrase as a button label exposes internal implementation naming to users, which is a UX anti-pattern.

## Constraints

- The DB column `source` stores the string `'attorney-judgment'` — this is a backend concern and does not need to change.
- The sufficiency gate relies on this string — any rename must be DB-only if changed at all; the UI label is independent.
- The button currently only saves *manually typed* values (the `acceptMissing` path was removed from the UI in the current session).
- The button is shown when `report.gaps.length > 0` — it is a "save partial progress" action before the user decides to generate.

## Recommendation

**Rename the button label to "Save Values".**

Rationale:
- Accurately describes the action: the user is saving the values they typed.
- No legal-doctrine baggage.
- Consistent with how attorneys think about the step: "I've typed some things in, save them."
- If you want to foreground the corrective nature: **"Apply Corrections"** works and implies overriding AI output.

**Do not rename the DB field or API endpoint** — those are internal and the rename would touch migrations and the sufficiency gate with no user-facing benefit.

**Implementation**: One-line label change in `GapReportPage.tsx` where the button reads `'Submit Attorney Judgment'`.

## Next Steps

- `/task-add rename-attorney-judgment-button` — change the label in `GapReportPage.tsx` from "Submit Attorney Judgment" to "Save Values" (or "Apply Corrections")
- Optional: audit the gap-report page for any other exposed internal identifiers (e.g. field names displayed as-is to attorneys)
