---
id: ROADMAP-007
title: Stretch — Collaborative Editing & Word Export
status: active
created: 2026-06-22
updated: 2026-06-22
owner: David Taylor
linked_decisions: []
tags: [stretch, collaboration, yjs, prosemirror, word-export, change-tracking]
---

# ROADMAP-007: Stretch — Collaborative Editing & Word Export

PRD stretch goal: Google Docs-style collaborative editing of the generated demand letter, with change tracking (who changed what), and exportable to Word. Build only after ROADMAP-001–006 are complete and there is remaining build time.

---

### Phase 1 — Rich-Text Editor

- [ ] Integrate TipTap (ProseMirror-based) editor in the React app; render the generated DOCX as editor content
- [ ] DOCX-to-editor import: convert output DOCX to HTML or ProseMirror JSON (mammoth.js for DOCX → HTML; then parse into TipTap schema)
- [ ] Maintain zone boundaries in the editor schema: boilerplate zones are read-only marks; variable zones are editable nodes

---

### Phase 2 — Real-Time Collaboration

- [ ] Y.js CRDT document bound to the TipTap editor (`y-prosemirror` binding)
- [ ] WebSocket sync server: API Gateway WebSocket API (Lambda handler) or a small ECS Fargate container running `y-websocket`; Y.js awareness for user presence (name, cursor color)
- [ ] Persist Y.js document state snapshots to S3 (incremental updates + periodic full snapshot); restore from snapshot on reconnect

---

### Phase 3 — Change Tracking

- [ ] Per-operation change log in PostgreSQL: `collaborative_changes` table — `id`, `job_id`, `user_id`, `user_name`, `operation_type` (insert / delete / format), `content_delta` (JSONB), `created_at`
- [ ] Y.js `observe` hook on the shared document → write change records on each transaction
- [ ] Track-changes view in the UI: toggle to show inline insertions (green underline) and deletions (red strikethrough) with author and timestamp tooltip
- [ ] Accept / reject individual change: accepting removes the mark; rejecting reverts the delta

---

### Phase 4 — Word Export

- [ ] Editor state → DOCX export: use `docx` npm package or ProseMirror's DOCX serializer to convert the final editor JSON back to a `.docx` file
- [ ] Export preserves: bold, italic, table structure (specials table), paragraph styles matching the original template
- [ ] `GET /jobs/:id/export/docx` — streams the generated `.docx` file; triggers the download in the browser
- [ ] Smoke test: export the Pat Donahue letter → open in Word → verify structure matches the original template

---

### Phase 5 — Verification

- [ ] Two browser windows open the same job editor → edits in one appear in real-time in the other
- [ ] Track-changes view shows each edit with the correct author and timestamp
- [ ] Accept/reject individual changes updates the document correctly
- [ ] Exported DOCX opens in Microsoft Word with correct formatting and no corruption
- [ ] Boilerplate zones (§7 conditions) are not editable in the collaborative editor
