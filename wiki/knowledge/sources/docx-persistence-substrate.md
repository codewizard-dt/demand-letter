---
id: docx-persistence-substrate
title: Research — Docx Persistence Substrate (Content Controls vs Delimiter Tags)
aliases: [Persistence Substrate Research, docxtemplater vs SDT]
updated: 2026-06-22
sources:
  - ../../../raw/research/docx-persistence-substrate/index.md
tags: [research, docx, persistence-substrate, template-fill, architecture]
---

# Research — Docx Persistence Substrate

derived_from::[[../../../raw/research/docx-persistence-substrate/index.md]] | relates_to::[[../concepts/docx-zone-detection-pipeline.md]] | relates_to::[[../concepts/demand-letter-input-contract.md]] | uses::[[../entities/tools/docxtemplater.md]] | informs::[[../../work/decisions/archive/DEC-0002-docx-persistence-substrate.md]]

## What This Source Is

A focused research report (2026-06-22) answering the question DEC-0001 deferred: **once the zone-detection pipeline knows which spans are boilerplate-verbatim and which are variable, in what markup do we persist that zone map inside the `.docx` so every later fill is deterministic and lossless?** It compares three substrates for a TypeScript/React/Node/AWS-Lambda stack and backs **DEC-0002#D1 (accepted)**.

## Core Claim — Delimiter Tags Win on a Convergence of Reasons

Three substrates were compared: **(A) delimiter/placeholder tags** filled by docxtemplater, **(B) Word content controls / SDTs**, and **(C) SDTs bound to a custom XML part**. All three are OOXML-native and formatting-lossless, so the differentiator is the *programmatic fill story* in a serverless Node stack. **Option A is recommended** because three forces converge:

1. **OSS maturity** — docxtemplater, docx-templates, and easy-template-x are all active Node/browser libraries; programmatic SDT *filling* generally needs **Aspose** (commercial, .NET-bridged) or hand-rolled OOXML. uses::[[../entities/tools/docxtemplater.md]]
2. **Native expressiveness** — docxtemplater natively provides **loops** (`{#specials}…{/specials}` for the itemised specials table), **conditionals** (`{#hasLiens}…{/hasLiens}` for optional §7 clauses), a **structured error schema** that refuses to emit a corrupt file, and **`nullGetter`** for fail-closed missing-value handling.
3. **The DEC-0001 annotation UI changes the calculus** — because the UI writes the markup **programmatically**, SDTs' main advantage (native in-Word authoring) is moot, and docxtemplater's main fragility (Word splitting hand-typed tags across runs) is avoided.

## The InspectModule → Sufficiency Gate Link

A key synthesis: docxtemplater's **`InspectModule`** enumerates every placeholder in a template before rendering. This is exactly the data the input-contract **sufficiency gate** needs — list the template's variable slots, check the joined case record covers each, emit a gap report for any uncovered slot. The substrate thus doubles as the slot-enumeration mechanism, not merely the fill engine. relates_to::[[../concepts/demand-letter-input-contract.md]]

## Outcome (filed as DEC-0002#D1, accepted)

Persist the confirmed zone map as **delimiter tags filled by docxtemplater (OSS core)**: the annotation UI inserts clean single-run tags onto variable zones (boilerplate untouched); `InspectModule` enumerates slots into the sufficiency gate; `render(data)` fills deterministically with `nullGetter` failing closed; boilerplate stays byte-exact because it is never inside a tag. The alternative (SDTs) becomes preferable only if firms must later author and maintain templates directly inside Word with no app-side annotation UI. relates_to::[[../concepts/docx-zone-detection-pipeline.md]]
