---
topic: What does the submit attorney judgment button actually do? Does that phrase have a known meaning in the legal field and in this context specifically?
slug: attorney-judgment-button
researched: 2026-06-29
---

# Primary Sources — "Submit Attorney Judgment" Button

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `app/server/src/handlers/post-jobs-attorney-judgment.ts::handler` | 2026-06-29 | Full handler logic: upserts fields with `source:'attorney-judgment'`, `confidence:1.0`; also handles `acceptMissing` array |
| S2 | codebase | `app/server/src/lib/sufficiency-gate.ts:46` | 2026-06-29 | `source === 'attorney-judgment'` is an unconditional pass in the gap computation — confidence/isNull ignored |
| S3 | web | https://www.margolisedelstein.com/wp-content/uploads/2013/10/KAHN-SELECTED-TOPICS-IN-PENNSYLVANIA-LEGAL-MALPRACTICE-AND-LIABILITY-LAW-April-2017.pdf | 2026-06-29 | Defines the "attorney judgment rule" as a malpractice shield doctrine |
| S4 | web | https://www.lawpractice.ai/blog/ai-demand-letter-pi-attorneys | 2026-06-29 | Industry norm: "attorney reviews and approves" / "attorney handles the judgment and sign-off" |
| S5 | web | https://justiceinnovation.law.stanford.edu/demand-letter-ai/ | 2026-06-29 | Stanford LASSB: "no letter is sent without attorney approval … professional legal judgment is applied" |
| S6 | web | https://www.proplaintiff.ai/post/best-ai-demand-letter-software-2026 | 2026-06-29 | "AI assists — it doesn't replace attorney judgment" — used as a contrast phrase, not a UI label |

## Excerpts

### S1 — handler: post-jobs-attorney-judgment.ts
`app/server/src/handlers/post-jobs-attorney-judgment.ts`
```
source: 'attorney-judgment',
confidence: 1.0,
isNull: false,
nullReason: null,
```

### S2 — sufficiency-gate.ts
`app/server/src/lib/sufficiency-gate.ts:46`
```
f.source === 'attorney-judgment' ||
(!f.isNull && f.confidence >= threshold)
```

### S3 — Pennsylvania Malpractice Law (Kahn, 2017)
https://www.margolisedelstein.com/wp-content/uploads/2013/10/KAHN-SELECTED-TOPICS-IN-PENNSYLVANIA-LEGAL-MALPRACTICE-AND-LIABILITY-LAW-April-2017.pdf
> "A claim against an attorney for negligence has traditionally been subject to a so-called 'attorney judgment' rule, where a claim is barred if an informed judgment by an attorney later proves to be [wrong]."

### S4 — lawpractice.ai: AI Demand Letter workflow
https://www.lawpractice.ai/blog/ai-demand-letter-pi-attorneys
> "The attorney handles the judgment and sign-off. Once approved, the letter is finalized with supporting exhibits attached and sent to the insurance company."
> "Any platform that positions itself as fully automated should be approached with caution. The attorney must review and approve every demand letter before it is sent. The AI role is to accelerate the drafting process, not to replace attorney judgment."

### S5 — Stanford Justice Innovation: Demand Letter AI
https://justiceinnovation.law.stanford.edu/demand-letter-ai/
> "Importantly, any AI agent would not replace attorney judgment or final sign-off."
> "no letter is sent out without attorney approval, ensuring that professional legal judgment is applied."

### S6 — proplaintiff.ai: Best AI Demand Letter Software 2026
https://www.proplaintiff.ai/post/best-ai-demand-letter-software-2026
> "AI assists—it doesn't replace attorney judgment."
