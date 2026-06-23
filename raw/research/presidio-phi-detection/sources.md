---
topic: "Microsoft Presidio (https://microsoft.github.io/presidio/) — assess fit for our infrastructure and setup: TypeScript/React/Node.js/AWS Lambda/PostgreSQL, with the DEC-0003 hybrid Textract→Claude-on-Bedrock pipeline for medical-record ingestion and PHI already kept inside AWS. Determine what role (if any) Presidio would play, what it costs to integrate, and whether it is the right tool."
slug: presidio-phi-detection
researched: 2026-06-22
---

# Primary Sources — Microsoft Presidio Fit Assessment

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | web | https://microsoft.github.io/presidio/ | 2026-06-22 | Presidio is Python; ships four modules (analyzer, anonymizer, image-redactor, structured); usage options "from Python or PySpark workloads through Docker to Kubernetes"; runs as an HTTP service. Grounds §1 (Python-only) and §5 (alternatives framing). |
| S2 | codebase | `wiki/work/decisions/DEC-0003-source-document-ingestion.md#D2` | 2026-06-22 | DEC-0003#D2 (proposed) runs Claude inference on Amazon Bedrock so PHI never leaves the AWS account — the architectural fact that makes anonymization-before-transmission non-mandatory. Grounds §4 exposure-surface analysis. |
| S3 | web | https://microsoft.github.io/presidio/supported_entities/ | 2026-06-22 | Medical entities are handled by `MedicalNERRecognizer`, which **requires the `transformers` extra**; covers diseases, medications, procedures, clinical events, biological attributes, anatomy, patient/family history; comprehensive PHI can integrate Azure Health Data Services. Grounds §2 (medical NER not in base install). |
| S4 | web | https://microsoft.github.io/presidio/faq/ | 2026-06-22 | "The main Presidio modules (analyzer, anonymizer, image-redactor) can be used both as a Python package and as a dockerized REST API"; "Presidio API endpoints do not include built-in authentication by design." Grounds §1 (Node integration is via the REST API / sidecar; auth must be added). |
| S5 | web | https://towardsdatascience.com/building-a-customized-pii-anonymizer-with-microsoft-presidio-b5c2ddfe523b/ | 2026-06-22 | A worked Presidio anonymizer with "scripts for running it as a Docker app and deploying it to AWS" — confirms the container-on-AWS deployment pattern (rather than inline in a Node Lambda). Grounds §3 (containerized AWS deployment is the real path). |
| S6 | web | https://huggingface.co/blaze999/Medical-NER | 2026-06-22 | The transformer model the `MedicalNERRecognizer` uses by default (`blaze999/Medical-NER`); a model download at container-build time is required for medical coverage. (`StanfordAIMI/stanford-deidentifier-base` appears in Presidio's transformers-recognizer docs as an alternative de-identification NER example.) Grounds §2 (model download needed). |
| S7 | web | https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html | 2026-06-22 | AWS Lambda quotas: .zip deployment package limit is 250 MB unzipped (function + all layers); container-image functions go up to 10 GB; max 10,240 MB memory; 15-min max invocation. Grounds §3 (spaCy + transformers bust the 250 MB zip limit; container image required). |
| S8 | web | https://www.micahwalter.com/2024/01/lambda-package-size-limits | 2026-06-22 | Independent confirmation: "Use a container – This will up the size limit to 10GB from 250MB." Corroborates the §3 workaround (container-image Lambda) and the cold-start concern of loading heavy NLP models at init. |

## Excerpts

### S1 — Presidio Overview
https://microsoft.github.io/presidio/
> "Presidio helps to ensure sensitive data is properly managed and governed. It provides fast identification and anonymization modules for private entities in text and images."
> "Presidio analyzer: PII identification in text" · "Presidio anonymizer: De-identify detected PII entities using different operators" · "Presidio image redactor: Redact PII entities from images using OCR and PII identification" · "Presidio structured: PII identification in structured/semi-structured data"
> "Multiple usage options, from Python or PySpark workloads through Docker to Kubernetes."

### S2 — DEC-0003#D2 (internal decision record)
`wiki/work/decisions/DEC-0003-source-document-ingestion.md#D2`
> Chosen: Claude on Amazon Bedrock — PHI stays inside the AWS account under AWS HIPAA controls, accepting loss of the Files API (inline base64) and `inference_geo`. (The decision that removes the "sending PHI to a third-party API" risk Presidio's anonymize-before-transmission would address.)

### S3 — Supported Entities
https://microsoft.github.io/presidio/supported_entities/
> Medical concepts are detected by the `MedicalNERRecognizer`, "which requires the `transformers` extra." Supported medical entity types include diseases/disorders, medications and drugs, therapeutic/diagnostic procedures, clinical events, biological attributes, anatomical structures, and family/patient medical history.
> "Azure Health Data Services PHI is a cloud-based service that provides Natural Language Processing (NLP) features for detecting PHI in text." — offered as an optional integration for comprehensive PHI.

### S4 — FAQ
https://microsoft.github.io/presidio/faq/
> "The main Presidio modules (analyzer, anonymizer, image-redactor) can be used both as a Python package and as a dockerized REST API. See the different deployment samples for example deployments."
> "Presidio API endpoints do not include built-in authentication by design. The containers are intentionally kept lean to allow flexibility for different deployment scenarios."

### S5 — PII Anonymization Made Easy by Presidio (Towards Data Science)
https://towardsdatascience.com/building-a-customized-pii-anonymizer-with-microsoft-presidio-b5c2ddfe523b/
> "Check out the full implementation of the customized anonymizer in my Github repository. It also includes scripts for running it as a Docker app and deploying it to AWS."

### S6 — Medical-NER model card (HuggingFace)
https://huggingface.co/blaze999/Medical-NER
> The default transformer model behind Presidio's `MedicalNERRecognizer`; medical entity recognition is transformer-based and requires downloading the model (at container-build time for a deployed service).

### S7 — AWS Lambda Quotas
https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
> "The total unzipped size of the function and all layers can't exceed the unzipped deployment package size limit of 250 MB." Container-image functions may use up to 10,240 MB of memory; "Code can run for up to 15 minutes in a single invocation."

### S8 — Dealing with AWS Lambda deployment package size limits (Micah Walter)
https://www.micahwalter.com/2024/01/lambda-package-size-limits
> "Use a container – This will up the size limit to 10GB from 250MB."

## Notes on source fidelity

- **Model-size figures in `index.md` §3** (spaCy `en_core_web_lg` ≈ 560 MB; transformers de-id model ≈ 400+ MB) are approximate, widely-documented package sizes used to show that a base-spaCy + transformers install exceeds the 250 MB Lambda zip limit (S7/S8). The *conclusion* (container image required; cold-start risk) is grounded in S5/S7/S8; the exact megabyte figures are order-of-magnitude estimates, not pinned to a single authoritative byte count.
- **Default medical model**: `index.md` references `StanfordAIMI/stanford-deidentifier-base`; the current `MedicalNERRecognizer` default is `blaze999/Medical-NER` (S3/S6). Both are legitimate Presidio transformer-NER options — the architectural point (a HuggingFace transformer download is required for medical coverage) holds regardless of which model is selected.
- **AWS Comprehend Medical** (`@aws-sdk/client-comprehendmedical`) named in §5/§Recommendation as the preferred in-AWS alternative is asserted from the AWS SDK for JavaScript surface; it was not separately fetched in this run and is flagged here as the standing AWS-service claim to verify before any implementation task.
