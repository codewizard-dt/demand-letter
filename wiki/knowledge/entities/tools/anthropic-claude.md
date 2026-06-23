---
id: anthropic-claude
title: Anthropic Claude
aliases: [Claude, Anthropic API, AWS Bedrock Claude]
updated: 2026-06-22
sources:
  - ../../../raw/prd-demand-letter-generator.md
tags: [ai-model, llm, preferred-tool]
---

# Anthropic Claude

relates_to::[[../../sources/prd-demand-letter-generator.md]]

The **preferred AI model** for the demand letter generator project, per the Steno PRD. Accessible via the Anthropic API or AWS Bedrock. Claude is the LLM that will generate demand letter drafts from source documents and firm templates, and that will handle iterative attorney refinement instructions.

DeepSeek models are explicitly off-limits. No other model preference is stated.

**PHI / HIPAA posture (DEC-0003#D2):** Claude inference runs on **Amazon Bedrock** to keep PHI inside the AWS account/region under AWS's HIPAA-eligible controls and BAA. This avoids the need for a separate Anthropic BAA and keeps the entire pipeline (Textract → Bedrock → PostgreSQL) within one HIPAA-eligible AWS boundary. PDF input and Citations are both available on Bedrock; the Files API and `inference_geo` are not (PDFs sent inline as base64). relates_to::[[../../concepts/hipaa-soc2-compliance-aws.md]]
