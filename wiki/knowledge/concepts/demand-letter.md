---
id: demand-letter
title: Demand Letter
updated: 2026-06-22
sources:
  - ../../raw/prd-demand-letter-generator.md
  - ../../raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx
  - ../../raw/research/demand-letter-legal-context/index.md
tags: [legal, litigation, document-type]
---

# Demand Letter

relates_to::[[../sources/prd-demand-letter-generator.md]] | relates_to::[[../sources/aaa-insurance-demand-letter-pat-donahue.md]] | relates_to::[[../sources/demand-letter-legal-context.md]] | relates_to::[[time-limited-policy-limits-demand.md]]

## Definition

A demand letter is a pre-litigation document sent by a claimant (typically through their attorney) to an opposing party or their insurer asserting a legal claim and demanding a specific remedy — usually a monetary settlement. It is one of the first formal steps in a litigation workflow. (See also: https://www.law.cornell.edu/wex/demand_letter)

Its primary purpose is **pre-suit settlement** — avoiding the time, cost, and uncertainty of litigation. Secondary purposes: creating a paper trail, establishing the sender's seriousness, framing case value before litigation, and satisfying mandatory notice requirements where statutes require a demand as a condition precedent to filing suit.

## Types

Demand letters are used across virtually all areas of civil law. The major types:

| Type | Common Context | Core Demand |
|------|---------------|-------------|
| **Personal injury / insurance settlement** | Car accidents, slip-and-fall, malpractice | Monetary compensation from insurer for bodily injury |
| **Breach of contract** | Unpaid invoices, failed delivery | Performance, payment, or damages for breach |
| **Debt collection** | Overdue accounts, loans | Payment of debt owed |
| **Employment disputes** | Unpaid wages, wrongful termination | Back pay, severance, cessation of conduct |
| **Real estate / landlord-tenant** | Security deposit, lease breach | Return of funds, repairs, vacating premises |
| **IP / defamation / consumer** | Trademark, copyright, false advertising | Cease and desist, damages |
| **Time-limited policy limits** (CCP §999) | High-value CA PI claims | All policy limits, strict statutory conditions |

**The PI/insurance demand is the most common and most structured subtype**, with a canonical multi-section format and extensive medical and legal content. See relates_to::[[../sources/aaa-insurance-demand-letter-pat-donahue.md]] for the canonical template.

## Universal Structure (10 Elements)

Every demand letter contains these elements regardless of type:

1. **Header block** — date, delivery method, addressee name/title/address, RE/subject line (parties, claim/case number, date of incident)
2. **Salutation** — formal, addressed to the specific recipient
3. **Introduction / purpose statement** — one sentence identifying client and purpose
4. **Factual background** — chronological narrative of relevant events; specific dates, locations, parties; objective tone
5. **Legal basis** — statute, contract provision, or common-law principle establishing the right to relief
6. **Harm / damages** — itemised losses (economic + non-economic)
7. **Demand** — specific amount or action requested
8. **Deadline** — clear date and time for compliance (10–30 days typical)
9. **Consequence** — statement that litigation will follow if demand is not met
10. **Closing and signature** — attorney name, bar affiliation, firm

**In PI/insurance demands specifically**, element 6 expands into a full medical narrative (diagnoses, physicians, examination findings, MRI results, future treatment recommendations) and element 7 grows into exhaustive enumerated settlement conditions (payee instructions, release scope, insured declarations, document delivery requirements). See the 7-section PI-specific structure derived from the Donahue sample below.

## Canonical PI/Insurance Letter Structure (from Donahue sample)

Based on the sample letter (Donahue v. AAA):

1. **Header block** — date, delivery method, adjuster name and address, RE block (client, claim number, insured, date of loss), letter title, demand expiry notice
2. **Salutation**
3. **Liability** — factual narrative establishing fault: incident description (date, time, location, conditions), claimant conduct, at-fault conduct, liability admission (if applicable)
4. **Damages** — detailed medical narrative: diagnoses with clinical specificity, treating providers (name, credential, practice, date), examination findings, imaging results, recommended future treatment
5. **Specials table** — itemised medical expenses by provider; total to date; future medical reserve estimate
6. **General damages / Pain & Suffering** — narrative linking injuries to occupational and daily-life impact; statutory basis (California: Cal. Civ. Code §1431.2(b)(2))
7. **Settlement demand** — amount or policy-limits demand, followed by enumerated acceptance conditions (payee, release scope, insured declarations, document delivery mechanics, expiry deadline)

## Legal Implications

**Admissibility:** Under FRE Rule 408 (federal) and state equivalents (California Evidence Code §§1152/1154), demand letters are **inadmissible to prove liability or the amount of a claim**. However, they are **not privileged** — they can be discovered and admitted for other purposes (knowledge, bad faith, SOL timing, witness bias). Labelling a letter "Rule 408 Settlement Communication" has no binding effect; courts look at substance, not labels.

**Statute of limitations:** A demand letter does **NOT toll the statute of limitations** in most jurisdictions — the clock continues running. If the limitations period is tight, the parties need a signed tolling agreement or the plaintiff must file suit.

**Condition precedent:** Some statutes require a demand letter before suit can be filed (e.g., Florida auto insurance statutes, government claims acts). Filing suit before completing any required notice/cure period typically results in dismissal without prejudice.

**Court weight:** Courts generally expect parties to have made good-faith attempts to settle before litigating; a demand letter documents that attempt. In California, an insurer's bad-faith failure to accept a reasonable CCP §999 demand within the deadline can expose it to judgment beyond policy limits.

## Role in the Demand Letter Generator

The generator's core task is to fill this structure from case-specific source documents while exactly replicating the formatting and layout of a firm-provided template. relates_to::[[ai-document-generation.md]] | relates_to::[[template-driven-generation.md]]

## California-Specific Notes

California CCP §999 governs **time-limited policy-limits demands** — a specialised demand subtype with strict acceptance mechanics and statutory consequences for bad-faith rejection. See relates_to::[[time-limited-policy-limits-demand.md]].
