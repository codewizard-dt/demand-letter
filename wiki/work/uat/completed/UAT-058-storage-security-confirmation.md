---
id: UAT-058
title: "UAT: Phase 4 — Storage security confirmation — RDS KMS, S3 SSE-KMS, CloudTrail, AWS Config"
status: passed
task: TASK-058
created: 2026-06-25
updated: 2026-06-25
---

# UAT-058 — UAT: Phase 4 — Storage security confirmation — RDS KMS, S3 SSE-KMS, CloudTrail, AWS Config

implements::[[TASK-058]]

> **Source task**: [[TASK-058]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] `template.yaml` is checked out at the project root (`/Users/davidtaylor/Repositories/gauntlet/demand-letter/template.yaml`)
- [ ] SAM CLI available (`sam` on PATH) for template validation
- [ ] For live-environment CLI tests: AWS CLI configured with credentials for the target account/region

---

## Test Cases

### UAT-STATIC-001: RDS instance has StorageEncrypted: true

- **Scenario**: `DemandLetterDb` resource in `template.yaml` must declare `StorageEncrypted: true`
- **Steps**:
  1. Open `template.yaml`
  2. Locate the `DemandLetterDb` resource (around line 100)
  3. Verify the `StorageEncrypted` property under `Properties`
- **Command**:
  ```bash
  grep -A 30 'DemandLetterDb:' template.yaml | grep 'StorageEncrypted'
  ```
- **Expected Result**: Output contains `StorageEncrypted: true`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-002: RDS instance KMS key references DemandLetterKmsKey

- **Scenario**: `DemandLetterDb` must use the project CMK, not the default AWS-managed key
- **Steps**:
  1. Open `template.yaml`
  2. Locate `DemandLetterDb` → `Properties.KmsKeyId`
  3. Verify value is `!Ref DemandLetterKmsKey`
- **Command**:
  ```bash
  grep -A 30 'DemandLetterDb:' template.yaml | grep 'KmsKeyId'
  ```
- **Expected Result**: Output contains `KmsKeyId: !Ref DemandLetterKmsKey`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-003: KMS CMK has automatic key rotation enabled

- **Scenario**: `DemandLetterKmsKey` must have `EnableKeyRotation: true` to satisfy HIPAA key management requirements
- **Steps**:
  1. Open `template.yaml`
  2. Locate the `DemandLetterKmsKey` resource (around line 54)
  3. Verify `EnableKeyRotation` under `Properties`
- **Command**:
  ```bash
  grep -A 10 'DemandLetterKmsKey:' template.yaml | grep 'EnableKeyRotation'
  ```
- **Expected Result**: Output contains `EnableKeyRotation: true`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-004: DocumentsBucket uses SSE-KMS encryption

- **Scenario**: The PHI-bearing S3 bucket must use `aws:kms` (not `AES256`) for server-side encryption
- **Steps**:
  1. Open `template.yaml`
  2. Locate `DocumentsBucket` → `BucketEncryption.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault`
  3. Verify `SSEAlgorithm` is `aws:kms`
- **Command**:
  ```bash
  grep -A 15 'DocumentsBucket:' template.yaml | grep 'SSEAlgorithm'
  ```
- **Expected Result**: Output contains `SSEAlgorithm: aws:kms`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-005: DocumentsBucket KMS master key references DemandLetterKmsKey

- **Scenario**: `DocumentsBucket` must explicitly reference the project CMK (not the default S3-managed key)
- **Steps**:
  1. Open `template.yaml`
  2. Locate `DocumentsBucket` → `BucketEncryption` block
  3. Verify `KMSMasterKeyID: !Ref DemandLetterKmsKey`
- **Command**:
  ```bash
  grep -A 20 'DocumentsBucket:' template.yaml | grep 'KMSMasterKeyID'
  ```
- **Expected Result**: Output contains `KMSMasterKeyID: !Ref DemandLetterKmsKey`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-006: DocumentsBucket has BucketKeyEnabled for cost optimization

- **Scenario**: `BucketKeyEnabled: true` reduces KMS API call costs at high request volume
- **Steps**:
  1. Open `template.yaml`
  2. Locate `DocumentsBucket` → `BucketEncryption` block
  3. Verify `BucketKeyEnabled: true`
- **Command**:
  ```bash
  grep -A 20 'DocumentsBucket:' template.yaml | grep 'BucketKeyEnabled'
  ```
- **Expected Result**: Output contains `BucketKeyEnabled: true`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-007: DocumentsBucket blocks all public access

- **Scenario**: PHI bucket must have all four `PublicAccessBlockConfiguration` flags set to `true`
- **Steps**:
  1. Open `template.yaml`
  2. Locate `DocumentsBucket` → `PublicAccessBlockConfiguration`
  3. Verify all four flags: `BlockPublicAcls`, `BlockPublicPolicy`, `IgnorePublicAcls`, `RestrictPublicBuckets`
- **Command**:
  ```bash
  grep -A 40 'DocumentsBucket:' template.yaml | grep -E 'Block|Ignore|Restrict'
  ```
- **Expected Result**: All four lines show `true`:
  ```
  BlockPublicAcls: true
  BlockPublicPolicy: true
  IgnorePublicAcls: true
  RestrictPublicBuckets: true
  ```
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-008: CloudTrailLogsBucket resource exists in template.yaml

- **Scenario**: The CloudTrail log bucket resource must be present so CloudTrail has an encrypted destination
- **Steps**:
  1. Open `template.yaml`
  2. Locate the `CloudTrailLogsBucket` resource (around line 593)
  3. Confirm `Type: AWS::S3::Bucket` and `SSEAlgorithm: aws:kms`
- **Command**:
  ```bash
  grep 'CloudTrailLogsBucket:' template.yaml
  ```
- **Expected Result**: Output contains `CloudTrailLogsBucket:` (resource key present)
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-009: CloudTrailLogsBucket uses SSE-KMS and blocks public access

- **Scenario**: The CloudTrail log bucket must be encrypted with KMS and fully block public access
- **Steps**:
  1. Open `template.yaml`
  2. Locate `CloudTrailLogsBucket` block
  3. Verify `SSEAlgorithm: aws:kms`, `KMSMasterKeyID: !Ref DemandLetterKmsKey`, and all four public-access block flags
- **Command**:
  ```bash
  grep -A 25 'CloudTrailLogsBucket:' template.yaml | grep -E 'SSEAlgorithm|KMSMasterKeyID|BlockPublicAcls|BlockPublicPolicy|IgnorePublicAcls|RestrictPublicBuckets'
  ```
- **Expected Result**: Six matching lines, all with expected values (`aws:kms`, `!Ref DemandLetterKmsKey`, four `true` flags)
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-010: CloudTrailLogsBucketPolicy grants CloudTrail service write access

- **Scenario**: Without the bucket policy, CloudTrail cannot write logs (deployment would fail at runtime)
- **Steps**:
  1. Open `template.yaml`
  2. Locate `CloudTrailLogsBucketPolicy` resource
  3. Confirm both statement SIDs are present: `AWSCloudTrailAclCheck` and `AWSCloudTrailWrite`
- **Command**:
  ```bash
  grep -E 'AWSCloudTrailAclCheck|AWSCloudTrailWrite' template.yaml
  ```
- **Expected Result**: Two matching lines, one for each SID
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-011: DemandLetterTrail resource exists with correct properties

- **Scenario**: The CloudTrail trail must be multi-region, have log file validation, and be KMS-encrypted
- **Steps**:
  1. Open `template.yaml`
  2. Locate `DemandLetterTrail` resource
  3. Verify: `IsLogging: true`, `IsMultiRegionTrail: true`, `EnableLogFileValidation: true`, `KMSKeyId: !Ref DemandLetterKmsKey`
- **Command**:
  ```bash
  grep -A 15 'DemandLetterTrail:' template.yaml | grep -E 'IsLogging|IsMultiRegionTrail|EnableLogFileValidation|KMSKeyId'
  ```
- **Expected Result**: Four matching lines, all with expected values (`true`, `true`, `true`, `!Ref DemandLetterKmsKey`)
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-012: DemandLetterTrail DependsOn CloudTrailLogsBucketPolicy

- **Scenario**: The trail must wait for the bucket policy to be created, otherwise deployment fails with an access denied error
- **Steps**:
  1. Open `template.yaml`
  2. Locate `DemandLetterTrail` resource
  3. Verify `DependsOn: CloudTrailLogsBucketPolicy`
- **Command**:
  ```bash
  grep -A 5 'DemandLetterTrail:' template.yaml | grep 'DependsOn'
  ```
- **Expected Result**: Output contains `DependsOn: CloudTrailLogsBucketPolicy`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-013: AWS Config HIPAA conformance pack comment is present in template.yaml

- **Scenario**: The manual deployment instructions for the conformance pack must be documented in the template so operators know to run them post-deploy
- **Steps**:
  1. Open `template.yaml`
  2. Search for the HIPAA conformance pack comment block (around lines 643–649)
  3. Verify the `aws configservice put-conformance-pack` command is present
- **Command**:
  ```bash
  grep 'put-conformance-pack' template.yaml
  ```
- **Expected Result**: Output contains `aws configservice put-conformance-pack`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-014: SAM template validates successfully

- **Scenario**: The full `template.yaml` (with new CloudTrail resources) must pass SAM's structural validator
- **Steps**:
  1. Ensure SAM CLI is installed (`sam --version`)
  2. Run SAM validate from the project root
- **Command**:
  ```bash
  sam validate --template template.yaml
  ```
- **Expected Result**: Output contains `is a valid SAM Template`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-CLI-015: Live RDS encryption check (manual — requires AWS credentials)

- **Scenario**: Confirm the deployed RDS instance actually has encryption enabled at the storage layer
- **Steps**:
  1. Configure AWS CLI with credentials for the target deployment account/region
  2. Run the describe command below
  3. Verify the output shows `true`
- **Command**:
  ```bash
  aws rds describe-db-instances --query 'DBInstances[*].StorageEncrypted'
  ```
- **Expected Result**: `[true]` (JSON array with single `true` value for the demand-letter DB instance)
- **Note**: This test requires a live deployed environment. Mark pass only after confirming against a deployed stack.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### UAT-CLI-016: Live S3 SSE-KMS check (manual — requires AWS credentials)

- **Scenario**: Confirm the deployed `DocumentsBucket` has SSE-KMS applied at the bucket level
- **Steps**:
  1. Configure AWS CLI with credentials for the target deployment account/region
  2. Run the get-bucket-encryption command (replace `<stage>` and `<account-id>` with real values)
- **Command**:
  ```bash
  aws s3api get-bucket-encryption --bucket "<stage>-demand-letter-docs-<account-id>" --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault'
  ```
- **Expected Result**: JSON object containing `"SSEAlgorithm": "aws:kms"` and the KMS key ARN
- **Note**: This test requires a live deployed environment.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### UAT-CLI-017: Live CloudTrail trail enabled check (manual — requires AWS credentials)

- **Scenario**: Confirm the deployed CloudTrail trail is active and logging
- **Steps**:
  1. Configure AWS CLI with credentials for the target deployment account/region
  2. Run the describe-trails command (replace `<stage>` with the deployed stage name)
- **Command**:
  ```bash
  aws cloudtrail get-trail-status --name "<stage>-demand-letter-trail" --query '{IsLogging: IsLogging, LatestDeliveryTime: LatestDeliveryTime}'
  ```
- **Expected Result**: `"IsLogging": true` and a non-null `LatestDeliveryTime`
- **Note**: This test requires a live deployed environment with at least one logged API call after trail creation.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->
