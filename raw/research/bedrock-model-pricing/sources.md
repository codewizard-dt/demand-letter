---
topic: "pricing for the current models and include all current models in the pricing table"
slug: bedrock-model-pricing
researched: 2026-06-25
---

# Primary Sources — AWS Bedrock Model Pricing (June 2026)

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | web | https://aws.amazon.com/bedrock/pricing/ | 2026-06-25 | AWS official Bedrock pricing page; confirms Sonnet 4.6 as current optimizer model; on-demand pricing structure |
| S2 | web | https://www.cloudzero.com/blog/claude-on-aws-bedrock/ | 2026-06-25 | Haiku 4.5 $1/$5, Sonnet 4.6 $3/$15, Opus 4.7 $5/$25 confirmed |
| S3 | web | https://conzit.com/post/cost-of-aws-bedrock-what-you-need-to-know | 2026-06-25 | Haiku 4.5 $1/$5 confirmed; Opus 4.5 $5/$25; Sonnet 4.5 $3/$15 |
| S4 | web | https://www.bacancytechnology.com/blog/aws-bedrock-pricing | 2026-06-25 | "Claude on AWS Bedrock pricing matches Anthropic's direct API pricing exactly across Opus 4.5, Sonnet 4.5, and Haiku 4.5"; Haiku 4.5 $1/$5, Sonnet 4.5 $3/$15 |
| S5 | web | https://felloai.com/claude-pricing/ | 2026-06-25 | "API rates run from $1 per million input tokens on Haiku 4.5 up to $25 per million output tokens on Opus 4.8"; Sonnet 4.6 $3/$15, Opus 4.8 $5/$25 |
| S6 | web | https://tokenmix.ai/blog/aws-bedrock-pricing | 2026-06-25 | Cross-region inference adds 10% surcharge for older routing; global endpoints standard price for Claude 4.x |
| S7 | web | https://www.digitalapplied.com/blog/claude-opus-4-8-release-dynamic-workflows-2026 | 2026-06-25 | "Pricing is unchanged from Opus 4.7: $5 per million input tokens and $25 per million output tokens standard" |
| S8 | web | https://www.cloudzero.com/blog/claude-mythos-pricing/ | 2026-06-25 | "Claude Fable 5 pricing is $10 per million input tokens and $50 per million output tokens" |
| S9 | web | https://platform.claude.com/docs/en/about-claude/models/migration-guide | 2026-06-25 | "Claude Fable 5 is priced at $10 per million input tokens and $50 per million output tokens, compared with $5 and $25 for Claude Opus 4.8" |
| S10 | codebase | `packages/api/src/lib/ai.ts::MODEL_PRICING` | 2026-06-25 | Current table: 2 entries, haiku price $0.80/$4.00 (wrong), key missing version suffix |
| S11 | codebase | `env.json` | 2026-06-25 | Active BEDROCK_MODEL_ID = `us.anthropic.claude-haiku-4-5-20251001-v1:0` — does not match any key in current MODEL_PRICING |
| S12 | codebase | `wiki/work/uat/completed/UAT-035-roadmap-003-phase-5-e2e-verification.md` | 2026-06-25 | Confirmed LlmAuditLog shows estimatedCostUsd=$0 for haiku extraction; noted as known limitation |

## Excerpts

### S2 — CloudZero: Claude on AWS Bedrock
https://www.cloudzero.com/blog/claude-on-aws-bedrock/
> "Route by task, not by default. Haiku 4.5 at $1/$5 handles classification, routing, and extraction. Sonnet 4.6 at $3/$15 covers most production inference. Opus 4.7 at $5/$25 earns its rate on complex reasoning and autonomous agents."

### S3 — Conzit: Cost of AWS Bedrock
https://conzit.com/post/cost-of-aws-bedrock-what-you-need-to-know
> "Claude Haiku 4.5: Input - $0.001 ($1 per million tokens); Output - $0.005 ($5 per million tokens). This is 80% cheaper than Sonnet, making it ideal for high-volume tasks. Claude Opus 4.5: Input - $0.005 ($5 per million tokens); Output - $0.025 ($25 per million tokens)."

### S4 — Bacancy Technology: AWS Bedrock Pricing 2026
https://www.bacancytechnology.com/blog/aws-bedrock-pricing
> "Claude on AWS Bedrock pricing matches Anthropic's direct API pricing exactly across Opus 4.5, Sonnet 4.5, and Haiku 4.5."

### S6 — TokenMix: AWS Bedrock Pricing 2026
https://tokenmix.ai/blog/aws-bedrock-pricing
> "If you enable cross-region inference on Bedrock (routing requests to the nearest available region for capacity), AWS adds a 10% surcharge to all token pricing. Claude 3.5 Sonnet input goes from $3.00 to $3.30 per million tokens."

### S8 — CloudZero: Claude Mythos Pricing
https://www.cloudzero.com/blog/claude-mythos-pricing/
> "Claude Fable 5 pricing is $10 per million input tokens and $50 per million output tokens, exactly 2x Claude Opus 4.8 ($5/$25)."

### S9 — Anthropic Migration Guide
https://platform.claude.com/docs/en/about-claude/models/migration-guide
> "Claude Fable 5 is priced at $10 per million input tokens and $50 per million output tokens, compared with $5 and $25 for Claude Opus 4.8."
