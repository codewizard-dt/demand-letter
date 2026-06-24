---
topic: 'Textract, SOC2, HIPAA, and solutions for compliance for both of those within the AWS ecosystem'
slug: textract-soc2-hipaa-aws-compliance
researched: 2026-06-22
---

# Primary Sources — Textract, SOC2, HIPAA, and AWS Compliance

| ID  | Type     | Locator                                                                                                              | Accessed   | What it contributed                                                                                                                                 |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | web      | https://docs.aws.amazon.com/textract/latest/dg/SERVICENAME-compliance.html                                           | 2026-06-22 | Confirmed Textract is assessed under HIPAA, SOC, ISO, and PCI compliance programs by third-party auditors                                           |
| S2  | web      | https://aws.amazon.com/blogs/machine-learning/amazon-textract-is-now-soc-and-iso-compliant/                          | 2026-06-22 | Textract achieved SOC and ISO compliance; confirms it can be used for SOC-subject workloads                                                         |
| S3  | web      | https://d1.awsstatic.com/whitepapers/compliance/AWS_HIPAA_Compliance_Whitepaper.pdf                                  | 2026-06-22 | AWS HIPAA whitepaper explicitly lists Textract; states AWS contractually requires PHI encryption even though HIPAA calls it "addressable"           |
| S4  | web      | https://www.kiteworks.com/hipaa-compliance/hipaa-encryption-requirements-safe-harbor-guide/                          | 2026-06-22 | HIPAA Security Rule § 164.312(a)(2)(iv) designates encryption at rest as "addressable"; defines Safe Harbor for breach notification via AES-256     |
| S5  | web      | https://www.censinet.com/perspectives/hipaa-encryption-requirements-explained                                        | 2026-06-22 | December 2024 NPRM proposes removing addressable vs required distinction; would make encryption mandatory; under regulatory freeze as of early 2026 |
| S6  | web      | https://www.proactivechart.com/resources/hipaa-security-rule-2026-why-addressable-safeguards-are-becoming-mandatory/ | 2026-06-22 | 2026 HIPAA Security Rule proposes mandatory encryption of ePHI at rest and in transit; compliance deadlines expected 180 days after final rule      |
| S7  | web      | https://linfordco.com/blog/hipaa-security-rule-requirements-implementation-specifications/                           | 2026-06-22 | Clarifies "addressable" ≠ "optional"; covered entities must implement or document a justified equivalent alternative                                |
| S8  | web      | https://www.aarc-360.com/soc-2-cc6/                                                                                  | 2026-06-22 | SOC 2 CC6.7 explicitly requires encryption of data at rest; CC6.1 covers logical access where encryption is a primary control                       |
| S9  | web      | https://soc2auditors.org/insights/soc-2-encryption-requirements/                                                     | 2026-06-22 | CC6.1 requires encryption of data at rest as a primary logical access control; CC6.7 covers transmission and removable media                        |
| S10 | web      | https://linfordco.com/blog/mapping-aws-controls-soc-2/                                                               | 2026-06-22 | CC6.6 requires encryption in transit and at rest; maps to S3 bucket policies, RDS, EBS, DynamoDB via AWS KMS                                        |
| S11 | web      | https://www.tcsa.in/resources/aws-hipaa-compliance-guide                                                             | 2026-06-22 | CloudWatch Logs is HIPAA-eligible but PHI must not appear in plaintext; implement log scrubbing or structured logging with PHI redaction            |
| S12 | web      | https://soc2auditors.org/insights/soc-2-for-ai-companies/                                                            | 2026-06-22 | SOC 2 auditors test that prompt/completion logs have PII/PHI redaction applied before the log is written (CC6.8 / AI company guidance)              |
| S13 | web      | https://github.com/aws-samples/aws-ai-phi-deidentification                                                           | 2026-06-22 | Official AWS sample combining Textract (OCR) + Comprehend Medical (PHI detection) + de-identification in a single CDK-deployed pipeline             |
| S14 | web      | https://squareops.com/knowledge/aws-cloud-security-checklist-for-hipaa-soc2-pci-dss/                                 | 2026-06-22 | AWS security checklist mapping KMS, CloudTrail, Config, Security Hub, Macie, VPC private subnets to HIPAA + SOC 2 controls                          |
| S15 | codebase | `wiki/work/decisions/DEC-0003-source-document-ingestion.md`                                                          | 2026-06-22 | DEC-0003#D1: Textract's exact role as OCR/layout layer; DEC-0003#D2: Bedrock chosen for PHI residency                                               |
| S16 | codebase | `raw/research/presidio-phi-detection/index.md`                                                                       | 2026-06-22 | Presidio assessment: confirmed Presidio covers all PII (not just PHI); Comprehend Medical recommended as native AWS alternative                     |

---

## Excerpts

### S1 — AWS Textract Compliance Validation

https://docs.aws.amazon.com/textract/latest/dg/SERVICENAME-compliance.html

> Third-party auditors assess the security and compliance of Amazon Textract as part of multiple AWS compliance programs. These include HIPAA, SOC, ISO, and PCI.

### S2 — Textract SOC and ISO Compliance

https://aws.amazon.com/blogs/machine-learning/amazon-textract-is-now-soc-and-iso-compliant/

> You can now use Amazon Textract, a machine learning (ML) service that quickly and easily extracts text and data from forms and tables in scanned documents, for workloads that are subject to Service Organization Control (SOC) compliance and International Organization for Standardization (ISO) compliance.

### S3 — AWS HIPAA Compliance Whitepaper (Textract + encryption requirement)

https://d1.awsstatic.com/whitepapers/compliance/AWS_HIPAA_Compliance_Whitepaper.pdf

> The HIPAA Security Rule includes addressable implementation specifications for the encryption of PHI in transmission ("in transit") and in storage ("at rest"). Although this is an addressable implementation specification in HIPAA, AWS requires customers to encrypt PHI stored in or transmitted using HIPAA-eligible services.

### S4 — HIPAA encryption at rest "addressable" classification

https://www.kiteworks.com/hipaa-compliance/hipaa-encryption-requirements-safe-harbor-guide/

> The HIPAA Security Rule requires encryption protections for ePHI at rest (§164.312(a)(2)(iv)) and in transit (§164.312(e)(2)(ii)) as addressable implementation specifications. While the HIPAA Security Rule designates encryption as "addressable" rather than "required," this classification is widely misunderstood.

### S5 — 2024 NPRM removing addressable/required distinction

https://www.censinet.com/perspectives/hipaa-encryption-requirements-explained

> A Notice of Proposed Rulemaking from December 2024 suggested removing the "addressable" vs. "required" distinction, potentially making encryption mandatory across the board. While this proposal remains on hold due to a regulatory freeze as of early 2026, organizations should treat encryption as essential unless they have a well-documented and compelling reason not to implement it.

### S6 — 2026 HIPAA Security Rule mandatory encryption

https://www.proactivechart.com/resources/hipaa-security-rule-2026-why-addressable-safeguards-are-becoming-mandatory/

> Encryption of ePHI both at rest and in transit moves from optional to mandatory. … These changes represent the first major overhaul to the HIPAA Security Rule in nearly 20 years, with compliance deadlines expected in late 2026 or early 2027—just 180 days after the final rule is published.

### S7 — "Addressable" does not mean optional

https://linfordco.com/blog/hipaa-security-rule-requirements-implementation-specifications/

> It is important to note that "addressable" does not technically mean "optional" when it comes to implementation specifications.

### S8 — SOC 2 CC6 encryption requirement

https://www.aarc-360.com/soc-2-cc6/

> Uses Encryption to Protect Data – Encrypt data at rest. Encryption technologies or secured communication channels should be used to protect data transmission and other communications beyond connectivity access points.

### S9 — CC6.1 encryption as primary control

https://soc2auditors.org/insights/soc-2-encryption-requirements/

> CC6.1 - Logical Access Controls: This criterion requires the entity to implement logical access security measures to protect against unauthorized use of its information assets. Encryption of data at rest is a primary control here.

### S10 — AWS KMS mapping to SOC 2 CC6

https://linfordco.com/blog/mapping-aws-controls-soc-2/

> CC6.6 (Data Encryption): Make sure that all sensitive data is encrypted in transit and at rest. This includes using S3 bucket policies to enforce encryption, enabling encryption on RDS, EBS, and DynamoDB, and using AWS KMS for key management.

### S11 — CloudWatch PHI log scrubbing requirement

https://www.tcsa.in/resources/aws-hipaa-compliance-guide

> CloudWatch Logs is HIPAA-eligible, but you need to ensure PHI isn't logged in plaintext. Implement log scrubbing or use structured logging with PHI redaction.

### S12 — SOC 2 AI log redaction requirement

https://soc2auditors.org/insights/soc-2-for-ai-companies/

> Prompts and Completions — Redacted: If you log prompts and completions, apply PII/PHI redaction before the log is written.

### S13 — AWS official Textract + Comprehend Medical de-identification sample

https://github.com/aws-samples/aws-ai-phi-deidentification

> It is capable of extracting text using Amazon Textract powered ML based OCR, detect PHI entities using Amazon Comprehend Medical, and de-identify (redact) documents in bulk.

### S14 — AWS security checklist for HIPAA + SOC 2

https://squareops.com/knowledge/aws-cloud-security-checklist-for-hipaa-soc2-pci-dss/

> SOC2 expects companies to prove they enforce least privilege, encryption, monitoring, logging, change control, and incident response. AWS services like IAM, CloudTrail, Security Hub, and Config help meet these expectations.
