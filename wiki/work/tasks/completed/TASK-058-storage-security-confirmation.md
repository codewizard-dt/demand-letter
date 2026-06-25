---
id: TASK-058
title: "Phase 4: Storage security confirmation — RDS KMS, S3 SSE-KMS, CloudTrail, AWS Config"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: []
blocks: [TASK-059]
parallel_safe_with: [TASK-051, TASK-053, TASK-056]
uat: "[[UAT-058]]"
tags: [compliance, hipaa, aws, kms, s3, cloudtrail, security-audit]
---

# TASK-058 — Phase 4: Storage security confirmation — RDS KMS, S3 SSE-KMS, CloudTrail, AWS Config

implements::[[ROADMAP-005]]

## Objective

Confirm all four storage security controls required by ROADMAP-005 Phase 4 are in place: (1) RDS encrypted with KMS CMK, (2) S3 SSE-KMS on PHI-bearing buckets, (3) CloudTrail enabled with encrypted log bucket, (4) AWS Config HIPAA conformance pack. Where controls are already defined in `template.yaml`, verify via static review. AWS CLI checks are documented as manual verification steps for live environments.

## Approach

Most of these controls are already declared in `template.yaml` (RDS `StorageEncrypted: true` + `KmsKeyId`, S3 `SSEAlgorithm: aws:kms`). The task is to: (a) statically confirm these declarations exist and are correct, (b) document the manual AWS CLI verification commands, (c) add CloudTrail and AWS Config resources to `template.yaml` if not already present.

## Steps

### 1. Static review: RDS KMS encryption  <!-- agent: general-purpose -->

- [x] Open `template.yaml` and locate `DemandLetterDb` <!-- Completed: 2026-06-25 -->
- [x] Confirm `StorageEncrypted: true` and `KmsKeyId: !Ref DemandLetterKmsKey` are present <!-- Confirmed: present at lines 111-112 -->
- [x] Confirm `DemandLetterKmsKey` resource exists with `EnableKeyRotation: true` <!-- Confirmed: present at lines 54-73 -->
- [x] Document the live verification command in a comment or wiki note:
  ```bash
  aws rds describe-db-instances --query '[].StorageEncrypted'
  # Expected: [true]
  ```

### 2. Static review: S3 SSE-KMS on PHI-bearing buckets  <!-- agent: general-purpose -->

- [x] In `template.yaml`, locate `DocumentsBucket` <!-- Completed: 2026-06-25 -->
- [x] Confirm `BucketEncryption.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault.SSEAlgorithm: aws:kms` <!-- Confirmed: present at line 132 -->
- [x] Confirm `KMSMasterKeyID: !Ref DemandLetterKmsKey` is set <!-- Confirmed: present at line 133 -->
- [x] Confirm `BucketKeyEnabled: true` (cost optimization) is present <!-- Confirmed: present at line 134 -->
- [x] Confirm `PublicAccessBlockConfiguration` blocks all public access <!-- Confirmed: all four block flags true at lines 135-139 -->

### 3. Add CloudTrail resource to template.yaml  <!-- agent: general-purpose -->

- [x] Check if `template.yaml` already has a `CloudTrailBucket` or `DemandLetterTrail` resource; if not, add: <!-- Completed: 2026-06-25 — resources were absent, added CloudTrailLogsBucket + CloudTrailLogsBucketPolicy + DemandLetterTrail -->
  ```yaml
  CloudTrailLogsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub '${Stage}-demand-letter-cloudtrail-${AWS::AccountId}'
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

  CloudTrailLogsBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref CloudTrailLogsBucket
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: AWSCloudTrailAclCheck
            Effect: Allow
            Principal:
              Service: cloudtrail.amazonaws.com
            Action: s3:GetBucketAcl
            Resource: !GetAtt CloudTrailLogsBucket.Arn
          - Sid: AWSCloudTrailWrite
            Effect: Allow
            Principal:
              Service: cloudtrail.amazonaws.com
            Action: s3:PutObject
            Resource: !Sub '${CloudTrailLogsBucket.Arn}/AWSLogs/${AWS::AccountId}/*'
            Condition:
              StringEquals:
                's3:x-amz-acl': 'bucket-owner-full-control'

  DemandLetterTrail:
    Type: AWS::CloudTrail::Trail
    DependsOn: CloudTrailLogsBucketPolicy
    Properties:
      TrailName: !Sub '${Stage}-demand-letter-trail'
      S3BucketName: !Ref CloudTrailLogsBucket
      IsLogging: true
      IsMultiRegionTrail: true
      EnableLogFileValidation: true
      KMSKeyId: !Ref DemandLetterKmsKey
  ```

### 4. Document AWS Config HIPAA conformance pack  <!-- agent: general-purpose -->

- [x] Add a `# HIPAA Compliance Note` comment block to `template.yaml` (before Outputs or at end of Resources) documenting the manual AWS Config setup: <!-- Completed: 2026-06-25 —  added at lines 642-648 -->
  ```yaml
  # HIPAA Compliance — AWS Config Conformance Pack (Tier 2)
  # Deploy manually after stack creation:
  #   aws configservice put-conformance-pack \
  #     --conformance-pack-name demand-letter-hipaa \
  #     --template-s3-uri s3://aws-config-rules-packages/hipaa-final.yaml
  # This flags drift automatically for HIPAA controls.
  # Cannot be automated via SAM/CloudFormation due to Config Service permissions.
  ```

### 5. TypeScript/SAM template validation  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api typecheck` — must still pass <!-- Completed: 2026-06-25 — passed, no errors -->
- [x] Optionally validate template syntax: `sam validate --template template.yaml` (if SAM CLI available) <!-- Completed: 2026-06-25 — "valid SAM Template" -->
