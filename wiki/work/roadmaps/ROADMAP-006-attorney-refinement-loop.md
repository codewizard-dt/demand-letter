---
id: ROADMAP-006
title: Attorney Refinement Loop
status: active
created: 2026-06-22
updated: 2026-06-22
owner: David Taylor
linked_decisions: [DEC-0003]
tags: [refinement, chat, sse, diff, attorney-ux]
---

# ROADMAP-006: Attorney Refinement Loop

Allow attorneys to give further instructions on a generated draft to refine it via AI — the scoped second-pass Claude call the PRD requires. Instructions are scoped to a section (or the whole letter), streamed back in real-time, and the attorney can diff, accept, or revert the change.

---

### Phase 1 — Backend

- [ ] `refinements` DB table: `id`, `job_id`, `instruction`, `scope` (section name or "all"), `before_text`, `after_text`, `accepted`, `created_at`; preserves the full refinement history for audit
- [ ] `POST /jobs/:id/refine`: accepts `{ instruction: string, scope?: string }`; builds a second-pass Claude prompt with the current letter text, the instruction, and the relevant `extracted_fields` as grounding context; streams the refined output via SSE
- [ ] Scope filtering: if `scope` is a section name (e.g. `"medical_narrative"`), only the relevant zone text is included in the prompt; Claude is instructed to return only the replacement text for that zone, not the full letter
- [ ] On stream completion: persist `before_text` and `after_text` to `refinements`; update `jobs.output_text` if the attorney later accepts
- [ ] Log to `LlmAuditLog` with `feature: "refinement"` via provider wrapper

---

### Phase 2 — Frontend

- [ ] Refinement panel in the generation view (below or beside the document display): text input for the attorney instruction + optional section scope dropdown (populated from `template_slots`)
- [ ] SSE consumer for the refinement stream: displays refined text in a side-by-side or inline preview
- [ ] Diff view: highlight added/changed/removed paragraphs between `before_text` and `after_text` (use `diff` npm package or a simple line-diff)
- [ ] Accept button: replaces the displayed letter with the refined version; triggers `PATCH /jobs/:id/refine/:refinement_id/accept`
- [ ] Revert button: restores the letter to the prior version; triggers `PATCH /jobs/:id/refine/:refinement_id/reject`
- [ ] Refinement history list: collapsible panel showing all past instructions and their accepted/rejected status

---

### Phase 3 — Verification

- [ ] Instruction: "Increase general damages to $250,000 and update the demand accordingly" → streams updated letter → diff highlights the changed paragraph → accept → download updated DOCX reflects the change
- [ ] Instruction scoped to `medical_narrative` only: Claude returns replacement prose for §4 only; rest of letter unchanged
- [ ] Revert: after accepting, revert returns the letter to the pre-refinement version
- [ ] `refinements` table contains before/after text and accepted flag after each accepted refinement
- [ ] Cost dashboard shows `refinement` rows with correct token counts
