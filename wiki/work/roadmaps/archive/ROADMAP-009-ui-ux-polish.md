---
id: ROADMAP-009
title: UI/UX Polish — production-ready attorney-facing frontend
status: done
created: 2026-06-26
updated: 2026-06-26
owner: David Taylor
linked_requirements: —
linked_decisions: —
tags: [ui, ux, frontend]
---

# Roadmap 009: UI/UX Polish — production-ready attorney-facing frontend

## Goal

Every user-facing page meets a consistent production-quality bar — unified Tailwind styling, clear workflow orientation, robust error handling, and complete empty states — so attorneys can navigate and operate the tool without friction.

## Phase 1: Foundation

- [x] [[TASK-089: Convert UploadPage inline styles to Tailwind]]
- [x] [[TASK-090: Convert GapReportPage inline styles to Tailwind]]
- [x] [[TASK-091: Add route-specific document titles to all pages]]
- [x] [[TASK-092: Gate TanStack Query DevTools behind NODE_ENV check]]
- [x] [[TASK-093: Remove duplicate Sign-out button from AccountPage]]

## Phase 2: Orientation

- [x] [[TASK-094: Add jobs list page as home screen]]
- [x] [[TASK-095: Add workflow stepper component to all 5 stages]]
- [x] [[TASK-096: Add active-page indicator to navbar]]

## Phase 3: Interactions

- [x] [[TASK-097: Replace AnnotatePage alert() with inline success message]]
- [x] [[TASK-098: Add show/hide password toggle to all three auth forms]]
- [x] [[TASK-099: Add password strength indicator and match validation on RegisterPage]]
- [x] [[TASK-100: Add styled drag-and-drop dropzone to UploadPage with file name preview]]
- [x] [[TASK-101: Replace raw error strings with actionable error states]]
- [x] [[TASK-102: Show meaningful citation labels in Gap Report sidebar]]
- [x] [[TASK-103: Make zone text expandable on AnnotatePage]]
- [x] [[TASK-104: Remove PRIORITY_SLOTS dead code from GapReportPage]]

## Phase 4: Editor

- [x] [[TASK-105: Default to diff view after refinement completes]]
- [x] [[TASK-106: Group post-generation actions with primary Open in Editor CTA]]
- [x] [[TASK-108: Replace streaming output pre block with styled prose container in GeneratePage]]
- [x] [[TASK-107: Make WS-missing banner dismissible on EditorPage]]
- [x] [[TASK-109: Add aria-live region for streaming generation output in GeneratePage]]

## Notes

Findings sourced from Playwright UI audit conducted 2026-06-26 — 20 issues across all 8 pages.
