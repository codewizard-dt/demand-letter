---
topic: based on the sample demand letter, what would be the required inputs, both necessary and sufficient to generate said letter in an agentic workflow
slug: demand-letter-agentic-inputs
researched: 2026-06-22
---

# Primary Sources — Required Inputs to Generate the Sample Demand Letter

This report is grounded in project-internal ground-truth sources (the PRD, the sample letter, and the prior legal-context research) rather than new web research — the question is a decomposition of an existing artifact, so the sample letter and PRD are the primary sources. No new external web sources were consulted.

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `raw/prd-demand-letter-generator.md` (Functional Requirements) | 2026-06-22 | The generation contract: "Given a real demand letter as a template **and** relevant legal case materials … matches the template exactly in structure, formatting, and layout, populated with information relevant to the case. Accuracy is paramount." + attorney refinement loop. Establishes the two input classes and the accuracy mandate. |
| S2 | codebase | `raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx` | 2026-06-22 | The sample letter itself — the concrete artifact whose every variable field was enumerated (parties, dates, diagnoses, providers, specials, reserve, §999 demand parameters). |
| S3 | codebase | `wiki/knowledge/concepts/demand-letter.md` | 2026-06-22 | Universal 10-element structure and PI-specific 7-section structure used to organise the field decomposition; confirmation that element 6 (damages) and 7 (settlement conditions) carry the bulk of variable + boilerplate content. |
| S4 | codebase | `wiki/knowledge/concepts/ai-document-generation.md` | 2026-06-22 | Existing design principles: zone-based generation, boilerplate-verbatim-from-template, citation layer, jurisdiction awareness — confirms the slot-filling framing and provenance requirement. |
| S5 | codebase | `wiki/knowledge/sources/aaa-insurance-demand-letter-pat-donahue.md` | 2026-06-22 | Section-by-section template pattern and case-specific key facts (specials $8,625.58; future reserve ≥$50,000; general damages $100,000; expiry June 29 2026 12pm PST; providers; at-fault party) used to populate the field table and example column. |
| S6 | codebase | `wiki/knowledge/concepts/time-limited-policy-limits-demand.md` | 2026-06-22 | §999 compliance/acceptance mechanics (declarations pages, payee restrictions, release scope, insured perjury declaration) that constitute template boilerplate and define which §7 variables the case record must supply. |

## Excerpts

### S1 — PRD, Functional Requirements
`raw/prd-demand-letter-generator.md`
> "Given a real demand letter as a template and relevant legal case materials, implement a system that generates a demand letter that matches the template exactly in structure, formatting, and layout, populated with information relevant to the case. Accuracy is paramount. The attorney should also be able to give further instructions on the draft document to further refine the output using AI."

### S5 — Sample Demand Letter summary, Key Facts
`wiki/knowledge/sources/aaa-insurance-demand-letter-pat-donahue.md`
> "Specials to date: $8,625.58 (chiropractic, pain management, MRI) — Future medical reserve: $50,000.00 minimum (lumbar medial branch block, PT, cervical MRI) — General damages demand: $100,000.00 — Demand: all applicable bodily injury policy limits"

### S6 — Time-Limited Policy Limits Demand, compliance requirements
`wiki/knowledge/concepts/time-limited-policy-limits-demand.md`
> "Acceptance requires delivery of: (a) settlement draft made payable solely to claimant and law firm; (b) certified copies of all declaration pages for all operative policies; (c) a compliant release (scope-limited, no third-party releases, no indemnification of insurer/counsel); (d) insured declaration under penalty of perjury covering insurance disclosure, scope-of-employment, and ride-share status."
