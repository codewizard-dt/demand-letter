# AI Usage Log — Demand Letter Generator

**Author:** David Taylor (dt@davidtaylor.codes)
**Primary tool:** Claude Code (Anthropic CLI agent) with Claude Opus / Sonnet-class models

This document explains how AI was used to build this project: the workflow system, how research and architecture decisions were made (and where a human stayed in the loop), how code was generated and verified, and how every AI operation was kept traceable.

---

## 1. Summary

AI ran inside a structured, auditable workflow as a pair-engineer with a defined scope of work. Every phase of the project (research → decisions → roadmaps → tasks → implementation → verification) ran through a custom skill library on top of Claude Code, and every operation was appended to an immutable log (`wiki/log.md`, 1,100+ lines). I (the human) owned all architecture decisions, acceptance gates, and anything touching live AWS resources; the AI owned research synthesis, planning artifacts, code generation, and test authoring.

Key numbers:

| Artifact | Count |
|---|---|
| Architecture decision groups (DEC-0001–0004, 5 decisions) | 4 |
| Research bundles in `raw/research/` | 21 |
| Roadmaps (ROADMAP-001–010) | 10 |
| Tasks created and executed (TASK-001–118) | 118 |
| UAT files (one per task, auto-generated + auto-judged) | ~110 |
| Golden-set evals for AI features (`evals/golden/`) | 54 |
| Server unit/integration tests (Vitest) | 137 tests / 20 files |
| Append-only workflow log entries (`wiki/log.md`) | 1,100+ lines |

---

## 2. Tooling

- **Claude Code (CLI)** — the agent harness. All AI work ran through it.
- **Custom skill library** (slash commands) — codified, repeatable workflows for each phase: `/research`, `/wiki-ingest`, `/decision-create`, `/decision-finalize`, `/roadmap-create`, `/task-add`, `/tackle`, `/uat-generate`, `/uat-auto`, `/power-mode`, `/eval-create`, `/eval-run`, and wiki-maintenance skills (`/wiki-lint`, `/wiki-archive`, `/wiki-tidy`).
- **MCP servers:**
  - **Serena** (LSP-backed semantic code navigation) — enforced via hooks so the agent navigates by symbols/references rather than raw grep, keeping edits precise in a strict-TypeScript monorepo.
  - **Playwright** — browser automation for UI verification and for the Steno.com brand audit (extracting real design tokens for the frontend style guide).
  - **Brave Search + Context7** — web research and current library documentation (docxtemplater, Prisma, AWS SDK v3, TipTap/Y.js).
- **The product itself** uses Claude on **Amazon Bedrock** (Sonnet 4.x / Haiku 4.5), a choice from DEC-0003#D2 to keep PHI within the AWS account boundary. That is AI *in* the product; the rest of this document is about AI used to *build* the product.

---

## 3. The workflow system — a three-layer LLM wiki

The repository carries a knowledge system the AI maintains and I audit:

```
raw/        Immutable ground truth — PRD, the sample Pat Donahue demand letter,
            and 21 research bundles. The AI may read but never modify these.
wiki/       AI-maintained knowledge base:
            knowledge/  — timeless synthesis (source summaries, concepts, entities)
            work/       — stateful lifecycle artifacts (requirements, decisions,
                          roadmaps, tasks, UAT, bugs), each with its own index,
                          lifecycle schema, and archive
wiki/log.md Append-only operation log — every ingest, decision, task, and UAT
            run writes an entry. Never edited, only appended.
```

This structure is why the AI's work is reviewable: any artifact can be traced from the code back through its task, its roadmap, the decision that motivated it, and the research that backed the decision.

---

## 4. Phase-by-phase usage

### 4.1 Domain research and ingestion

- `/wiki-ingest` processed the PRD and the sample demand letter (Pat Donahue v. AAA) into structured knowledge pages — a 7-section California PI demand letter model, CCP §999 time-limited demand mechanics, and entity pages for every person/organization in the sample case.
- `/research` produced deep-dive bundles (each with a cited `sources.md`) on: demand-letter legal context, the required input contract (~40-field schema mapped to source documents), template zone-detection strategies, docx persistence substrates, Textract/HIPAA/SOC 2 compliance, and PHI detection engines.
- **How I used it:** I directed the research questions; the AI swept sources, synthesized, and filed everything with citations into `raw/research/` so claims could be audited later. Research that later backed an architecture decision is referenced from that decision file.

### 4.2 Architecture decisions

Every architecturally significant choice went through a formal decision workflow:

1. `/decision-create` drafted a Decision Group with explicit **decision drivers**, a considered-options table, per-option trade-off detail, and a mermaid relationship graph — all grounded in the research bundles, not model priors.
2. I reviewed each decision via walkthrough Q&A. The decision files record **"Deciders: David Taylor"** — the AI proposed and compared; I chose.
3. `/decision-finalize` ran an E-C-A-D-R completeness audit (evidence, context, alternatives, drivers, reversibility) and a supersession check before flipping status to `accepted`.

The four accepted decision groups:

| ID | Decision | Chosen outcome |
|---|---|---|
| DEC-0001 | Template zone detection | Hybrid: LLM-seeds zone labels → **attorney confirms** → persisted as deterministic in-OOXML markup (boilerplate must never be paraphrased — the asymmetric failure is malpractice-grade) |
| DEC-0002 | Docx persistence substrate | Delimiter tags filled by docxtemplater (fail-closed `nullGetter`, InspectModule slot enumeration feeding the sufficiency gate) |
| DEC-0003 | Source-doc ingestion + PHI residency | D1: hybrid Textract→Claude (bbox-level provenance per extracted field); D2: Claude on **Bedrock** so PHI stays inside the AWS HIPAA boundary |
| DEC-0004 | PHI/PII scrubbing engine | Comprehend Medical + Comprehend + custom redaction, inline in the Node Lambda stack |

The same principle applied to both the product and how it was built: LLM proposes, human confirms, execution is deterministic.

### 4.3 Planning

- `/roadmap-create` produced a 7-roadmap build sequence directly linked to the accepted decisions (skeleton → template ingestion → case-record ingestion/provenance → generation engine → PHI/PII compliance → attorney refinement → collaborative editing/Word export), later followed by ROADMAP-008 (API test suite), 009 (UI/UX polish), and 010 (live AWS deployment).
- `/task-add` decomposed roadmap phases into 118 execution-ready task files, each with concrete steps, dependencies, and acceptance criteria. `/roadmap-next` grouped tasks into parallelizable waves.
- **How I used it:** I approved roadmap scope and sequencing before any implementation started; roadmap checkboxes were only flipped by completed, verified tasks.

### 4.4 Code generation 

- `/tackle` executed one task at a time: read the task file, implement each step, run `pnpm typecheck` / lint / tests, and append a log entry describing exactly what was created or changed.
- `/power-mode` orchestrated parallel subagent teams through a full **tackle → uat-generate → uat-auto** pipeline per roadmap item — used heavily for ROADMAP-009's 21 UI-polish items, where independent tasks ran concurrently.
- Nontrivial refactors got a research pass first: e.g., the multi-variable zone refactor (TASK-112) started with a codebase research bundle (`raw/research/multi-variable-zone-refactor/`) that identified the exact broken sites (generation loop `String.replace`, classifier prompt, injector dedup) before any code was touched — the finding "no DB migration needed" came from that analysis.
- Code quality gates the AI had to pass on every task: strict TypeScript (`tsc --noEmit` across all packages), type-aware ESLint (flat config), Prettier, and the existing test suite.
- **What I did by hand / interactively:** anything the sandboxed agent could not or should not do — enabling Bedrock model entitlements, AWS console verification, confirming the deployment target account/region (logged: "User confirmed the deployment target as AWS account 429842292480 in region us-east-1"), and reviewing diffs before commits. Commits were mine; the git history's 26 commits map to reviewed milestones, not raw AI output.

### 4.5 Verification

Three independent verification layers, all AI-authored but human-gated:

1. **UAT per task.** `/uat-generate` derived test cases from the actual implementation contracts (handlers, SAM template, schema files) — typically 5–20 cases per task spanning filesystem checks, CLI checks, API calls, and edge cases. `/uat-auto` executed them headlessly and **fail-closed**: anything it could not machine-verify (live-server API tests, browser UI tests) was recorded as a failure requiring human verification rather than assumed to pass. I explicitly dispositioned those — either walking them manually (`/uat-walk`) or accepting them as non-blocking with the reason recorded in the log.
2. **Unit/integration tests.** The API test strategy was itself researched and decided first (Vitest node env, `aws-sdk-client-mock` for AWS SDK v3, `vitest-mock-extended` for Prisma), then ROADMAP-008 built the suite — now 137 tests across 20 files, run in CI.
3. **Evals for the AI features.** `/eval-create` built a 54-case golden set (`evals/golden/`) covering the product's LLM-adjacent seams: zone classification (correct field names, no hallucinated synonyms), delimiter injection (boilerplate byte-untouched), sufficiency gating, grounded extraction (every field must cite Textract block IDs), PHI/PII redaction, and refinement accept/reject semantics. Results are tracked in `evals/results/baseline.json` vs `latest.json` to catch regressions.

### 4.6 Documentation and hygiene

- Every ingest, decision, task, and UAT run appended to `wiki/log.md` — an audit trail of *what the AI did and why*, in chronological order.
- `/wiki-lint`, `/wiki-archive`, and `/wiki-tidy` kept the knowledge base consistent (no orphan pages, no index drift, terminal items archived).
- `/update-docs` synchronized task/UAT/project docs after implementation work.
- The demo deliverables (`.docs/demo/` runbook, Marp slides, mermaid architecture diagrams) were AI-generated from the actual codebase, then human-reviewed.

---

## 5. Human-in-the-loop summary

| Gate | Who decides | Evidence |
|---|---|---|
| Research direction | Human poses questions; AI sweeps and cites | `raw/research/*/sources.md` |
| Architecture decisions | AI compares options against explicit drivers; **human is the named decider** | DEC-0001–0004, "Deciders: David Taylor" |
| Roadmap scope & sequencing | Human approves before implementation | `wiki/log.md` roadmap entries |
| Task completion | Machine-verifiable gates (typecheck/lint/tests) + fail-closed UAT; human dispositions anything not machine-verifiable | UAT logs: "manual test requires human verification", "per user instruction" |
| Live AWS actions | Human confirms account, region, entitlements; agent performs read-only discovery only until confirmed | TASK-113–118 log entries |
| Commits | Human reviews diffs; commit messages describe verified milestones | git history |

---

## 6. Honest assessment

**What worked well:** The decision-first workflow meant the AI never architected by vibes — code generation was always downstream of a human-accepted decision backed by cited research. Fail-closed UAT prevented the classic agentic failure of self-certifying success. The append-only log made it possible to reconstruct any choice weeks later.

**Where AI needed correction:** Early UAT runs marked static YAML checks as passes when they were really manual checks; the auto-judge rules were tightened to fail-closed. An env-var mismatch between a handler and the SAM template (`SOURCE_DOCS_BUCKET` vs `DOCUMENTS_BUCKET`) was caught by UAT generation rather than the original implementation pass. The eval runner initially only validated YAML schema (a TODO stub). TASK-111 was filed to wire it to real handlers. All three corrections are visible in the log.

**Cost/energy posture:** The product's own LLM usage is fully audited: every Bedrock call writes an `LlmAuditLog` row with token counts and estimated cost, surfaced in the admin dashboard.
