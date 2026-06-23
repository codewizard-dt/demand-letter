---
id: aws-kms
title: AWS KMS
aliases: [AWS Key Management Service, KMS, CMK]
updated: 2026-06-22
sources:
  - ../../../raw/research/textract-soc2-hipaa-aws-compliance/index.md
tags: [aws, encryption, hipaa, soc2, key-management]
---

# AWS KMS

relates_to::[[../../sources/textract-soc2-hipaa-aws-compliance.md]] | relates_to::[[aws-textract.md]] | relates_to::[[../../concepts/hipaa-soc2-compliance-aws.md]]

AWS Key Management Service (KMS) is the managed encryption key service used to fulfil the encryption-at-rest requirements of both HIPAA and SOC 2 on an AWS stack. Customer-managed keys (CMKs) provide key rotation, fine-grained access policies, and a CloudTrail audit log of every key usage event.

**Role in this project (Tier-1 compliance):** KMS is the encryption substrate for every storage tier that touches PHI or PII:

- **RDS PostgreSQL** (Textract provenance store) — encryption must be enabled **at database creation time** using a KMS CMK; it cannot be added to a running unencrypted instance without a snapshot-restore.
- **S3 buckets** (raw case documents) — server-side encryption via `SSE-KMS` (`aws:kms` SSEAlgorithm); all public access blocked.
- **EBS volumes** attached to any EC2/container compute handling PHI.

KMS integration is the primary mechanism satisfying: HIPAA § 164.312(a)(2)(iv) (encryption at rest, contractually required under the AWS BAA even though technically "addressable" in the Security Rule); and SOC 2 CC6.1 and CC6.7 (logical access controls and transmission/removal protection). Neither HIPAA nor SOC 2 requires redaction of the primary data store — KMS encryption is sufficient.
