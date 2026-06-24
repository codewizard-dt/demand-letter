---
topic: a demand letter more generally as used in a legal context
slug: demand-letter-legal-context
researched: 2026-06-22
sources: [./sources.md]
---

# Research: Demand Letters in Legal Context

> A demand letter is a formal pre-litigation document sent by one party (typically through an attorney) to another, asserting a legal right, stating the factual and legal basis for a claim, and demanding specific relief within a stated deadline — with threatened litigation as the consequence for non-compliance. Its core purpose is to initiate settlement negotiations and avoid the cost of litigation; in many jurisdictions and under some statutes, it is also a mandatory prerequisite to filing suit. In personal injury/insurance cases it is the primary vehicle by which claimants open settlement negotiations with insurers after completing medical treatment. Under FRE Rule 408 and state equivalents, demand letters are generally inadmissible to prove liability but are discoverable, and they do NOT toll statutes of limitations.

---

## Research Questions

1. What is a demand letter and what legal purposes does it serve?
2. What are the main types of demand letters in legal practice?
3. What are the key structural components of a legally effective demand letter?
4. What are the legal implications of sending/receiving a demand letter (admissibility, statute of limitations, prerequisite rules)?
5. How does a demand letter fit into the pre-litigation settlement process timeline, specifically in personal injury/insurance cases?

---

## Current State (Codebase)

This project has no codebase yet — this research is foundational context for an AI demand letter generator being built for Steno. The sample letter already ingested (`raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx`) is a real California CCP §999 personal injury demand, which represents one specific and highly structured subtype. This research covers the broader category.

---

## Key Findings

### 1. Definition and Purpose [S1][S2][S5]

A demand letter is a formal written communication — usually on law firm letterhead — from one party to another (often attorney-to-insurer or attorney-to-defendant) that:

- **States the factual background** of the dispute
- **Asserts a legal right or claim** (with statutory or contractual basis)
- **Quantifies and demands specific relief** (payment, action, or cessation)
- **Sets a response deadline** (typically 10–30 days)
- **Warns of litigation** as the consequence of non-compliance

The primary purpose is **pre-suit settlement** — avoiding the time, cost, and uncertainty of litigation. Courts generally view the demand letter stage favorably; some require it as a condition precedent to filing suit [S3][S4].

Secondary purposes include: creating a paper trail of the dispute, establishing the sender's seriousness, framing the narrative and case value before litigation, and in some statutes, satisfying a mandatory notice requirement [S3].

### 2. Types of Demand Letters [S4][S6]

Demand letters are used across virtually every area of civil law. The principal types:

| Type                                                 | Common Context                                                 | Core Demand                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| **Personal injury / insurance settlement**           | Car accidents, slip-and-fall, medical malpractice              | Monetary compensation from insurer for bodily injury damages |
| **Breach of contract**                               | Unpaid invoices, failed delivery, broken agreements            | Performance, payment, or damages for breach                  |
| **Debt collection**                                  | Overdue accounts, loans                                        | Payment of debt owed                                         |
| **Employment disputes**                              | Unpaid wages, wrongful termination, discrimination             | Back pay, severance, cessation of conduct                    |
| **Real estate / landlord-tenant**                    | Security deposit, lease breach, eviction                       | Return of funds, repairs, vacating premises                  |
| **IP / defamation / consumer protection**            | Trademark infringement, copyright violation, false advertising | Cease and desist, damages                                    |
| **Time-limited policy limits demand** (CCP §999, CA) | High-value PI claims                                           | All policy limits, within strict statutory conditions        |

**The personal injury / insurance demand is the most common and most structured subtype** — it has a canonical multi-section format with specific medical, damages, and settlement-conditions content (see the Donahue sample letter). [S6][S7]

### 3. Structural Components [S2][S8][S9]

A legally effective demand letter universally contains:

1. **Header block** — date; delivery method (certified mail, e-mail, etc.); addressee name, title, and address; RE / subject line (parties, claim/case number, date of incident)
2. **Salutation** — formal, addressed to the specific recipient
3. **Introduction / purpose statement** — one sentence identifying the attorney's client and the purpose of the letter
4. **Factual background** — chronological narrative of relevant events, specific dates, locations, parties, and prior communications; objective tone, no speculation
5. **Legal basis** — citation of statute, contract provision, or common-law principle establishing the right to relief
6. **Harm / damages** — itemised description of losses (economic + non-economic); in PI cases: medical diagnoses, treating physicians, treatment timeline, medical expense table, future care estimate, general damages narrative
7. **Demand** — specific amount or action requested; in PI/insurance cases may be "all applicable policy limits"
8. **Deadline** — clear date and time for acceptance/compliance (10–30 days typical; CCP §999 letters commonly 30 days)
9. **Consequence** — statement that litigation will follow if demand is not met
10. **Closing and signature** — attorney name, bar affiliation, firm

**In personal injury insurance demands specifically**, items 6 and 10 expand significantly: item 6 becomes a detailed medical narrative (diagnoses, physicians, examination findings, MRI results, future treatment recommendations) and the demand section includes exhaustive enumerated settlement conditions (payee instructions, release scope, insured declarations, document delivery requirements) [S7].

### 4. Legal Implications [S3][S10][S11][S12]

**Admissibility:**

- Under **FRE Rule 408** (federal) and state equivalents (e.g., California Evidence Code §§1152/1154), demand letters and settlement communications are inadmissible **to prove liability or the amount of a claim** [S10][S11].
- However, they are **not privileged** — they can be discovered and admitted for other purposes (showing knowledge, bad faith, statute of limitations timing, bias of witnesses) [S11][S12].
- Practitioners sometimes caption letters "Rule 408 Settlement Communication" as a signal of intent, but this labeling has no binding effect on admissibility determinations — courts look at substance, not labels [S12].

**Statute of Limitations:**

- A demand letter does **NOT toll the statute of limitations** in most jurisdictions — the clock keeps running regardless [S13].
- If the limitations period is tight and settlement negotiations are underway, parties need a signed **tolling agreement** or the plaintiff must file suit to stop the clock [S13].
- Some statutes make a demand letter a **condition precedent to suit** (e.g., Florida auto insurance statutes, certain consumer protection statutes, government claims acts). Filing suit before completing any required notice/cure period typically results in dismissal without prejudice [S3][S13].

**Court weight:**

- Courts generally want to see that parties made good-faith attempts to settle before litigating; a demand letter documents that attempt and can influence how a judge views conduct in subsequent proceedings [S2][S5].
- In California, failure of an insurer to accept a reasonable CCP §999 demand within the deadline can expose the insurer to **bad-faith liability** and judgment in excess of policy limits [S7].

### 5. Personal Injury / Insurance Settlement Timeline [S7][S14][S15]

The typical sequence in a PI insurance claim:

1. **Incident and treatment** — claimant receives medical treatment; attorney gathers records
2. **Maximum medical improvement (MMI)** — attorney typically waits until claimant reaches MMI to capture full damages; sending prematurely leaves future damages unquantified
3. **Demand letter sent** — attorney sends demand package to insurer (letter + medical records + bills + photos/evidence); the demand package is the full evidentiary submission
4. **Insurer review period** — insurer investigates, reviews medical records, assesses liability; typically **a few weeks to several months** depending on complexity, severity, and insurance company [S15]
5. **Counter-offer / denial** — insurer responds with counter-offer (often significantly lower than demand), denial, or request for additional information
6. **Negotiation** — attorney and insurer negotiate; most cases settle at this stage
7. **Litigation** — if no agreement, attorney files suit; case proceeds to discovery, possible mediation, and trial

**Most personal injury cases settle before trial.** The demand letter stage is where the majority of case value is argued and most settlements are reached [S14].

---

## Constraints

Any demand letter generator must account for:

- **Jurisdiction variation** — structure, required prerequisites, admissibility rules, and special demand statutes (like CCP §999) vary significantly by state
- **Case type variation** — a PI insurance demand and a breach-of-contract demand share the same skeleton but have very different content in the damages and settlement-conditions sections
- **Template fidelity** — law firms have house styles that practitioners are accustomed to; variation from the firm's template may signal that AI generated the letter, which attorneys want to avoid
- **Accuracy imperative** — incorrect diagnoses, wrong dollar figures, or misidentified parties in a demand letter can harm the case, expose the attorney to malpractice liability, or result in bad-faith claims if the insurer acts on false information
- **Boilerplate precision** — the settlement conditions section in PI/insurance demands (release scope, payee instructions, insured declarations) contains standardised legal language that must be reproduced verbatim from the template

---

## Solution Comparison

Not applicable — this research is contextual/foundational, not a comparison of technical implementation options.

---

## Recommendation

For the demand letter generator:

1. **Treat the demand letter as a structured document with typed zones, not free-form text.** Each canonical section (liability, damages narrative, specials table, settlement conditions) has distinct content requirements and sourcing logic. The generator should be designed to fill each zone from appropriate source documents rather than generating the whole letter in a single pass.

2. **The settlement conditions / boilerplate section should be lifted verbatim from the template** with minimal AI involvement — the template language is precise for good legal reasons and any paraphrase risks inadvertent changes in legal meaning.

3. **The damages / medical narrative section is where AI adds the most value** — it requires synthesising physician records, diagnoses, and treatment histories into a coherent narrative that matches the firm's writing style. This is the most time-consuming section for attorneys to draft manually.

4. **Build in jurisdiction awareness.** Even within the same document type (PI demand), California CCP §999 demands have additional required elements (expiry notice, acceptance conditions, statutory citation) that must be present or the demand loses its statutory protection.

5. **Surface a confidence / citation layer.** For every factual claim in the generated letter (diagnosis, dollar amount, date, physician name), the generator should be able to point to the source document and page/paragraph it drew from. This lets the attorney verify accuracy efficiently.

---

## Next Steps

- `/wiki-ingest raw/research/demand-letter-legal-context/index.md` to synthesize this research into the knowledge base
- `/task-add` — implement the demand letter generator core: template parsing + zone-by-zone Claude generation
- `/decision-create` — decide on the zone-identification strategy (how to detect and label sections in an arbitrary firm template)
- `/decision-create` — decide on the source document ingestion format (PDF parsing, OCR, structured upload) for medical records and case materials
