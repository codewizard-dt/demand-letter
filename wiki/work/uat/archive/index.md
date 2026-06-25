# UAT Archive

Terminal UAT files (`passed`, `skipped`, or `trashed`) moved here by `/wiki-archive` to reduce directory clutter. **Append-only** — archived items never move again.

| ID          | Title                                     | Final Status | Archived   |
| ----------- | ----------------------------------------- | ------------ | ---------- |
| [[UAT-001]] | UAT: AWS SAM TypeScript Monorepo Scaffold | passed       | 2026-06-23 |
| [[UAT-007]] | UAT: TypeScript Strict Mode + ESLint + Prettier — Clean Baseline | passed | 2026-06-23 |
| [[UAT-002]] | UAT: PostgreSQL Schema Bootstrap — jobs and files tables | passed | 2026-06-23 |
| [[UAT-003]] | UAT: RDS Instance with KMS CMK Encryption | passed | 2026-06-23 |
| [[UAT-004]] | UAT: S3 Bucket for Source Documents and Outputs | passed | 2026-06-23 |
| [[UAT-006]] | UAT: dotenv and SSM Parameter Store for All Secrets | passed | 2026-06-23 |
| [[UAT-005]] | UAT: Bedrock Model Access — Verify Inference Profile and Smoke-Test | skipped | 2026-06-23 |
| [[UAT-009]] | UAT: MODEL_PRICING Map and estimateCostUsd() Utility | passed | 2026-06-23 |
| [[UAT-008]] | UAT: LlmAuditLog Prisma Model | passed | 2026-06-23 |
| [[UAT-011]] | UAT: GET /admin/llm-costs Endpoint | passed | 2026-06-23 |
| [[UAT-013]] | UAT: POST /jobs Endpoint — Create Generation Job | passed | 2026-06-23 |
| [[UAT-010]] | UAT: AI Provider Wrapper with LLM Audit Logging | passed | 2026-06-23 |
| [[UAT-012]] | UAT: Admin Cost Dashboard Page /admin/usage | passed | 2026-06-23 |
| [[UAT-014]] | UAT: POST /jobs/:id/files Endpoint — Upload Template and Case Docs | passed | 2026-06-23 |
| [[UAT-018]] | UAT: Steno.com Style Audit and Generalized Style Guide | passed | 2026-06-24 |
| [[UAT-015]] | UAT: POST /jobs/:id/generate Endpoint — Naive Bedrock Generation with SSE | passed | 2026-06-24 |
| [[UAT-019]] | UAT: Add Tailwind CSS to Web Package | passed | 2026-06-24 |
| [[UAT-016]] | UAT: GET /jobs/:id/output Endpoint — Return Generation Output | passed | 2026-06-24 |
| [[UAT-017]] | UAT: Lambda DbLayer and SAM Template Wiring | passed | 2026-06-24 |
| [[UAT-022]] | UAT: Download Button for Generation Output | passed | 2026-06-24 |
| [[UAT-021]] | UAT: Generate Button with SSE Streaming Display | passed | 2026-06-24 |
| [[UAT-020]] | UAT: Upload Form — Template DOCX + Case PDFs | passed | 2026-06-24 |
| [[UAT-023]] | UAT: End-to-End Smoke Test and Verification (Skipped) | skipped | 2026-06-24 |
| [[UAT-024]] | UAT: Final Monorepo Typecheck Gate (Skipped) | skipped | 2026-06-24 |
| [[UAT-027]] | UAT: Prisma Schema — zones and templates DB Tables | passed | 2026-06-24 |
| [[UAT-025]] | UAT: Template Ingestion Service — Parse DOCX to OOXML Zone Spans | passed | 2026-06-24 |
| [[UAT-028]] | UAT: LLM Zone Classification — Claude on Bedrock Classifies Zones as Boilerplate or Variable | passed | 2026-06-24 |
| [[UAT-026]] | UAT: Zone Extraction Run-Path Field and DOCX Round-Trip Verification | passed | 2026-06-24 |
| [[UAT-029]] | UAT: Attorney Annotation UI — Zone Review and Confirmation Page | passed | 2026-06-24 |
| [[UAT-030]] | UAT: Delimiter Tag Injection — Inject {field_name} Tags, Save to S3, and Enumerate Slots via InspectModule | passed | 2026-06-24 |
| [[UAT-031]] | UAT: ROADMAP-002 End-to-End Verification — Zone Detection Pipeline Smoke Test | passed | 2026-06-24 |
| [[UAT-038]] | UAT: field-schema.ts Canonical Field Mapping | passed | 2026-06-24 |
| [[UAT-036]] | UAT: Generation data builder: assemble docxtemplater data object from extracted_fields | passed | 2026-06-24 |
| [[UAT-037]] | UAT: Sufficiency Pre-check for Generation Gate | passed | 2026-06-24 |
| [[UAT-044]] | UAT: docxtemplater render: load tagged template DOCX from S3 and render with data object | passed | 2026-06-25 |
| [[UAT-048]] | UAT: Wire renderTemplate into post-jobs-generate.ts: upload DOCX to S3 and set jobs.status = complete | passed | 2026-06-25 |
| [[UAT-046]] | UAT: SSE Consumer — Frontend Progress Indicator | passed | 2026-06-25 |
| [[UAT-053]] | UAT: redactText utility — replace PHI/PII entity spans with typed tokens | passed | 2026-06-25 |
| [[UAT-051]] | UAT: Detect PHI entities per block via ComprehendMedical DetectPHI | passed | 2026-06-25 |
| [[UAT-056]] | UAT: ESLint rule to flag direct console.log with block text in Lambda handlers | passed | 2026-06-25 |
| [[UAT-055]] | UAT: Role-based block text redaction in GET /jobs/:id/blocks API | passed | 2026-06-25 |
| [[UAT-054]] | UAT: Fail-closed detection policy and log scrubbing in SNS Textract handler | passed | 2026-06-25 |
| [[UAT-058]] | UAT: Phase 4 — Storage security confirmation — RDS KMS, S3 SSE-KMS, CloudTrail, AWS Config | passed | 2026-06-25 |
| [[UAT-059]] | UAT: Phase 5 End-to-end compliance verification — PHI redaction, detection failure, attorney vs developer roles | passed | 2026-06-25 |