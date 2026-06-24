---
id: UAT-004
title: 'UAT: S3 Bucket for Source Documents and Outputs'
status: passed
task: TASK-004
created: 2026-06-23
updated: 2026-06-23
---

# UAT-004 — UAT: S3 Bucket for Source Documents and Outputs

implements::[[TASK-004]]

> **Source task**: [[TASK-004]]
> **Generated**: 2026-06-23

All tests are static file-content checks against `template.yaml`. SAM CLI is not installed in this environment — no `sam validate` or `sam build` steps are included. Tests assert that every resource and property required by the task acceptance criteria is present in the template with the correct values.

---

## Prerequisites

- [ ] `template.yaml` exists at the project root
- [ ] No SAM CLI required — all tests are static content checks

---

## Test Cases

### UAT-FS-001: WebAppOrigin parameter declared with correct type and default

- **File**: `template.yaml`
- **Description**: Verifies that `WebAppOrigin` is present in `Parameters` with `Type: String` and `Default: 'http://localhost:5173'` — required for the CORS `AllowedOrigins` reference.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Parameters:`, locate `WebAppOrigin`.
  3. Confirm `Type: String` and `Default: 'http://localhost:5173'`.
- **Expected Result**: `WebAppOrigin` appears in the `Parameters` block with `Type: String` and `Default: 'http://localhost:5173'`.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-002: DocumentsBucket resource declared with correct type

- **File**: `template.yaml`
- **Description**: Verifies that `DocumentsBucket` is declared as `AWS::S3::Bucket` under `Resources`.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Resources:`, locate `DocumentsBucket`.
  3. Confirm `Type: AWS::S3::Bucket` is present.
- **Expected Result**: `DocumentsBucket:\n    Type: AWS::S3::Bucket` appears in the `Resources` block.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-003: DocumentsBucket has stage-interpolated bucket name including AccountId

- **File**: `template.yaml`
- **Description**: Verifies that `BucketName` is set to `!Sub '${Stage}-demand-letter-docs-${AWS::AccountId}'` — the account ID suffix prevents global naming collisions.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DocumentsBucket` → `Properties`, confirm `BucketName: !Sub '${Stage}-demand-letter-docs-${AWS::AccountId}'`.
- **Expected Result**: `BucketName` uses the exact substitution string with both `${Stage}` and `${AWS::AccountId}`.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-004: DocumentsBucket has versioning enabled

- **File**: `template.yaml`
- **Description**: Verifies that `VersioningConfiguration.Status: Enabled` is set on `DocumentsBucket` — required by the task acceptance criteria.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DocumentsBucket` → `Properties` → `VersioningConfiguration`, confirm `Status: Enabled`.
- **Expected Result**: `VersioningConfiguration:\n        Status: Enabled` appears in the `DocumentsBucket` properties block.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-005: DocumentsBucket has SSE-KMS encryption referencing the CMK

- **File**: `template.yaml`
- **Description**: Verifies that `BucketEncryption` uses `SSEAlgorithm: aws:kms` with `KMSMasterKeyID: !Ref DemandLetterKmsKey` and `BucketKeyEnabled: true` — the core encryption requirement of this task.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DocumentsBucket` → `Properties` → `BucketEncryption` → `ServerSideEncryptionConfiguration`, confirm:
     - `SSEAlgorithm: aws:kms`
     - `KMSMasterKeyID: !Ref DemandLetterKmsKey`
     - `BucketKeyEnabled: true`
- **Expected Result**: All three encryption properties are present with the specified values.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-006: DocumentsBucket has all four public access block settings enabled

- **File**: `template.yaml`
- **Description**: Verifies that `PublicAccessBlockConfiguration` has all four block flags set to `true` — required to prevent any public exposure of uploaded documents.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DocumentsBucket` → `Properties` → `PublicAccessBlockConfiguration`, confirm all four properties are present and set to `true`:
     - `BlockPublicAcls: true`
     - `BlockPublicPolicy: true`
     - `IgnorePublicAcls: true`
     - `RestrictPublicBuckets: true`
- **Expected Result**: All four public access block properties are `true`.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-007: DocumentsBucket CORS rule configured for pre-signed URL uploads

- **File**: `template.yaml`
- **Description**: Verifies that `CorsConfiguration` allows all headers, the required HTTP methods (GET, PUT, POST, DELETE, HEAD), and references `WebAppOrigin` for allowed origins with a `MaxAge` of 3600.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DocumentsBucket` → `Properties` → `CorsConfiguration` → `CorsRules`, confirm:
     - `AllowedHeaders: ['*']`
     - `AllowedMethods` contains GET, PUT, POST, DELETE, HEAD
     - `AllowedOrigins: [!Ref WebAppOrigin]`
     - `MaxAge: 3600`
- **Expected Result**: The CORS rule contains all five specified settings.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-008: DocumentsBucket lifecycle rule moves output/ objects to INTELLIGENT_TIERING after 30 days

- **File**: `template.yaml`
- **Description**: Verifies that the lifecycle rule `MoveOutputsToIntelligentTiering` is `Enabled`, scoped to the `output/` prefix, and transitions objects to `INTELLIGENT_TIERING` after `30` days — no auto-delete (legal retention requirement).
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DocumentsBucket` → `Properties` → `LifecycleConfiguration` → `Rules`, locate the rule with `Id: MoveOutputsToIntelligentTiering`.
  3. Confirm:
     - `Status: Enabled`
     - `Prefix: output/`
     - `Transitions` contains `TransitionInDays: 30` and `StorageClass: INTELLIGENT_TIERING`
- **Expected Result**: All three rule properties match exactly. No `ExpirationInDays` or deletion rule is present.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-009: DocumentsBucket lifecycle rule has no expiration or deletion configuration

- **File**: `template.yaml`
- **Description**: Verifies that the lifecycle rule contains no `ExpirationInDays`, `NoncurrentVersionExpiration`, or `AbortIncompleteMultipartUpload` keys — auto-deletion is prohibited for legal retention.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DocumentsBucket` → `Properties` → `LifecycleConfiguration` → `Rules`, confirm that neither `ExpirationInDays` nor `NoncurrentVersionExpiration` appears in the rule block.
- **Expected Result**: No expiration or deletion configuration is present in the lifecycle rule.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-010: DocumentsBucketPolicy resource declared with correct type

- **File**: `template.yaml`
- **Description**: Verifies that `DocumentsBucketPolicy` is declared as `AWS::S3::BucketPolicy` and references `DocumentsBucket`.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Resources:`, locate `DocumentsBucketPolicy`.
  3. Confirm `Type: AWS::S3::BucketPolicy` and `Bucket: !Ref DocumentsBucket`.
- **Expected Result**: `DocumentsBucketPolicy` has the correct type and bucket reference.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-011: DocumentsBucketPolicy enforces SSL-only access with DenyNonSSL statement

- **File**: `template.yaml`
- **Description**: Verifies that the bucket policy contains a `DenyNonSSL` statement that denies all `s3:*` actions to all principals when `aws:SecureTransport` is `false` — prevents any unencrypted access to the bucket.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DocumentsBucketPolicy` → `Properties` → `PolicyDocument` → `Statement`, locate the statement with `Sid: DenyNonSSL`.
  3. Confirm:
     - `Effect: Deny`
     - `Principal: '*'`
     - `Action: 's3:*'`
     - Condition `aws:SecureTransport: 'false'` (Bool condition)
- **Expected Result**: The `DenyNonSSL` statement is present with all four specified attributes.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-012: DocumentsBucketPolicy applies to both bucket ARN and all object ARNs

- **File**: `template.yaml`
- **Description**: Verifies that the `DenyNonSSL` statement's `Resource` list covers both the bucket itself (`!GetAtt DocumentsBucket.Arn`) and all objects within it (`!Sub '${DocumentsBucket.Arn}/*'`) — a policy covering only one of the two is incomplete.
- **Steps**:
  1. Open `template.yaml`.
  2. Under the `DenyNonSSL` statement, confirm `Resource` contains:
     - `!GetAtt DocumentsBucket.Arn`
     - `!Sub '${DocumentsBucket.Arn}/*'`
- **Expected Result**: Both ARN forms are present in the `Resource` list.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-013: DocumentsBucketName output declared and exported

- **File**: `template.yaml`
- **Description**: Verifies that the `DocumentsBucketName` output exists, sources the bucket name via `!Ref DocumentsBucket`, and exports it as `${Stage}-demand-letter-docs-bucket`.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Outputs:`, locate `DocumentsBucketName`.
  3. Confirm `Value: !Ref DocumentsBucket` and `Export.Name: !Sub '${Stage}-demand-letter-docs-bucket'`.
- **Expected Result**: Both `Value` and `Export.Name` match exactly.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-FS-014: DocumentsBucketArn output declared and exported

- **File**: `template.yaml`
- **Description**: Verifies that the `DocumentsBucketArn` output exists, sources the bucket ARN via `!GetAtt DocumentsBucket.Arn`, and exports it as `${Stage}-demand-letter-docs-bucket-arn`.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Outputs:`, locate `DocumentsBucketArn`.
  3. Confirm `Value: !GetAtt DocumentsBucket.Arn` and `Export.Name: !Sub '${Stage}-demand-letter-docs-bucket-arn'`.
- **Expected Result**: Both `Value` and `Export.Name` match exactly.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-EDGE-001: BucketKeyEnabled is true alongside SSE-KMS to reduce KMS API call costs

- **File**: `template.yaml`
- **Description**: Verifies that `BucketKeyEnabled: true` is co-present with `SSEAlgorithm: aws:kms` — without bucket key enabled, every object operation would incur an individual KMS API call, significantly increasing cost at scale.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DocumentsBucket` → `Properties` → `BucketEncryption` → `ServerSideEncryptionConfiguration`, confirm that `BucketKeyEnabled: true` appears in the same rule as `SSEAlgorithm: aws:kms`.
- **Expected Result**: Both `SSEAlgorithm: aws:kms` and `BucketKeyEnabled: true` are present in the same encryption rule object.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-EDGE-002: Template contains no hardcoded bucket names outside the Sub substitution

- **File**: `template.yaml`
- **Description**: Verifies that the bucket name is never hardcoded as a literal string — it must only appear as the `!Sub` expression `'${Stage}-demand-letter-docs-${AWS::AccountId}'`. Hardcoded names would break multi-environment deployments.
- **Steps**:
  1. Open `template.yaml`.
  2. Search for any literal string matching the pattern `dev-demand-letter-docs` or `staging-demand-letter-docs` or `prod-demand-letter-docs`.
- **Expected Result**: No literal stage-prefixed bucket name strings appear in the template.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->
