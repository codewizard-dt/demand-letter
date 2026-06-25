---
id: ROADMAP-007
title: Stretch — Collaborative Editing & Word Export
status: active
created: 2026-06-22
updated: 2026-06-25
owner: David Taylor
linked_decisions: []
tags: [stretch, collaboration, yjs, prosemirror, word-export, change-tracking]
---

# ROADMAP-007: Stretch — Collaborative Editing & Word Export

PRD stretch goal: Google Docs-style collaborative editing of the generated demand letter, with change tracking (who changed what), and exportable to Word. Build only after ROADMAP-001–006 are complete and there is remaining build time.

---

### Phase 1 — Rich-Text Editor

- [x] [[TASK-066: Integrate TipTap editor in React app and render generated output as editor content]] → completed/TASK-066-tiptap-editor-integration.md
- [x] [[TASK-067: DOCX-to-editor import via mammoth.js: convert output DOCX to HTML then load into TipTap]] → completed/TASK-067-docx-to-tiptap-import.md
- [x] [[TASK-068: Maintain zone boundaries in TipTap editor schema: boilerplate read-only marks, variable editable nodes]] → completed/TASK-068-editor-zone-boundaries.md

---

### Phase 2 — Real-Time Collaboration

- [x] [[TASK-069: Y.js CRDT document bound to TipTap editor via y-prosemirror]] → completed/TASK-069-yjs-crdt-tiptap-binding.md
- [x] [[TASK-070: WebSocket sync server: API Gateway WebSocket + Lambda (or y-websocket ECS) with Y.js awareness]] → completed/TASK-070-websocket-sync-server.md
- [x] [[TASK-071: Persist Y.js document state snapshots to S3; restore from snapshot on reconnect]] → completed/TASK-071-yjs-s3-snapshot-persistence.md

---

### Phase 3 — Change Tracking

- [x] [[TASK-072: Per-operation change log in PostgreSQL: collaborative_changes table]] → completed/TASK-072-collaborative-changes-db-table.md
- [x] [[TASK-073: Y.js observe hook on shared document: write CollaborativeChange records per transaction]] → completed/TASK-073-yjs-observe-change-log.md
- [x] [[TASK-074: Track-changes view in UI: toggle insertions/deletions with author and timestamp tooltip]] → completed/TASK-074-track-changes-ui.md
- [x] [[TASK-075: Accept/reject individual collaborative change end-to-end: verify mark removal and delta revert]] → completed/TASK-075-accept-reject-change-verification.md

---

### Phase 4 — Word Export

- [x] [[TASK-076: Editor state → DOCX export using docx npm package; convert ProseMirror JSON to .docx]] → completed/TASK-076-editor-docx-export.md
- [ ] [[TASK-077: DOCX export preserves bold, italic, table structure, and paragraph styles from original template]]
- [ ] [[TASK-078: GET /jobs/:id/export/docx — stream generated .docx and trigger browser download]]
- [ ] [[TASK-079: Smoke test: export Pat Donahue letter to Word, verify structure matches original template]]

---

### Phase 5 — Verification

- [x] [[TASK-080: Verify two browser windows on same job editor sync edits in real-time]] → completed/TASK-080-two-browser-realtime-sync-verify.md
- [x] [[TASK-081: Verify track-changes view shows each edit with correct author and timestamp]] → completed/TASK-081-track-changes-author-timestamp-verify.md
- [ ] [[TASK-082: Verify accept/reject individual changes correctly updates document state]]
- [ ] [[TASK-083: Verify exported DOCX opens in Microsoft Word with correct formatting and no corruption]]
- [ ] Boilerplate zones (§7 conditions) are not editable in the collaborative editor
