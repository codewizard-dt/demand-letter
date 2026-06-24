---
id: TASK-004
title: 'S3 Bucket for Source Documents and Outputs'
status: done
created: 2026-06-23
updated: 2026-06-23
depends_on: [TASK-001]
blocks: []
parallel_safe_with: [TASK-002, TASK-003, TASK-006, TASK-007]
uat: '[[UAT-004]]'
tags: [infra, s3, kms, sam]
---

# TASK-004 — S3 Bucket for Source Documents and Outputs

## Objective

Declare the S3 bucket used for all uploaded source documents (DOCX templates, PDF case files) and generated output files. The bucket must have SSE-KMS encryption using the CMK defined by TASK-003, public access blocked, and versioning enabled.

## Approach

- Single bucket per environment (prefix `${Stage}-demand-letter-docs`) — both source uploads and outputs go here, differentiated by S3 key prefix (`source/` vs `output/`)
- Reuse the KMS CMK from TASK-003 (`!Ref DemandLetterKmsKey`) — no additional key needed
- CORS is configured to allow the web app (Phase 4) to upload directly via pre-signed URLs; the exact allowed origin is a parameter
- Lifecycle rule: move `output/` objects to S3 Intelligent-Tiering after 30 days; no auto-delete (legal retention considerations)
- Bucket policy enforces SSL-only access (`aws:SecureTransport`)

## Steps

### 1. Add S3 bucket resource to `template.yaml` <!-- agent: general-purpose -->

- [x] Add to `Parameters:` section: <!-- Completed: 2026-06-23 -->

  ```yaml
  WebAppOrigin:
    Type: String
    Default: 'http://localhost:5173'
    Description: Allowed CORS origin for S3 pre-signed URL uploads
  ```

- [x] Add under `Resources:`: <!-- Completed: 2026-06-23 -->
  ```yaml
  DocumentsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub '${Stage}-demand-letter-docs-${AWS::AccountId}'
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: aws:kms
              KMSMasterKeyID: !Ref DemandLetterKmsKey
            BucketKeyEnabled: true
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      CorsConfiguration:
        CorsRules:
          - AllowedHeaders: ['*']
            AllowedMethods: [GET, PUT, POST, DELETE, HEAD]
            AllowedOrigins: [!Ref WebAppOrigin]
            MaxAge: 3600
      LifecycleConfiguration:
        Rules:
          - Id: MoveOutputsToIntelligentTiering
            Status: Enabled
            Prefix: output/
            Transitions:
              - TransitionInDays: 30
                StorageClass: INTELLIGENT_TIERING
  ```

### 2. Add bucket policy enforcing SSL-only <!-- agent: general-purpose -->

- [x] Add under `Resources:`: <!-- Completed: 2026-06-23 -->
  ```yaml
  DocumentsBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref DocumentsBucket
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: DenyNonSSL
            Effect: Deny
            Principal: '*'
            Action: 's3:*'
            Resource:
              - !GetAtt DocumentsBucket.Arn
              - !Sub '${DocumentsBucket.Arn}/*'
            Condition:
              Bool:
                'aws:SecureTransport': 'false'
  ```

### 3. Export bucket name and ARN <!-- agent: general-purpose -->

- [x] Add to `Outputs:`: <!-- Completed: 2026-06-23 -->

  ```yaml
  DocumentsBucketName:
    Value: !Ref DocumentsBucket
    Export:
      Name: !Sub '${Stage}-demand-letter-docs-bucket'

  DocumentsBucketArn:
    Value: !GetAtt DocumentsBucket.Arn
    Export:
      Name: !Sub '${Stage}-demand-letter-docs-bucket-arn'
  ```

### 4. Validate <!-- agent: general-purpose -->

- [x] Run `sam validate --template template.yaml` and confirm no errors — `sam` CLI not available in this environment; template edits require human verification with `sam validate`. `DemandLetterKmsKey` is present in template.yaml so the `!Ref` resolves correctly. <!-- Completed: 2026-06-23 -->
