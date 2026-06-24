---
id: UAT-003
title: 'UAT: RDS Instance with KMS CMK Encryption'
status: passed
task: TASK-003
created: 2026-06-23
updated: 2026-06-23
---

# UAT-003 — UAT: RDS Instance with KMS CMK Encryption

implements::[[TASK-003]]

> **Source task**: [[TASK-003]]
> **Generated**: 2026-06-23

All tests are static file-content checks against `template.yaml`. SAM CLI is not installed in this environment — no `sam validate` or `sam build` steps are included. Tests assert that every resource and property required by the task acceptance criteria is present in the template with the correct values.

---

## Prerequisites

- [ ] `template.yaml` exists at the project root
- [ ] No SAM CLI required — all tests are static content checks

---

## Test Cases

### UAT-FS-001: KMS CMK resource declared with correct type

- **File**: `template.yaml`
- **Description**: Verifies that `DemandLetterKmsKey` is declared as `AWS::KMS::Key` under `Resources`.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Resources:`, locate `DemandLetterKmsKey`.
  3. Confirm `Type: AWS::KMS::Key` is present.
- **Expected Result**: `DemandLetterKmsKey:\n    Type: AWS::KMS::Key` appears in the `Resources` block.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-002: KMS CMK has EnableKeyRotation set to true

- **File**: `template.yaml`
- **Description**: Verifies that `EnableKeyRotation: true` is set on the KMS key to satisfy the compliance requirement in the PRD.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DemandLetterKmsKey` → `Properties`, confirm `EnableKeyRotation: true` is present.
- **Expected Result**: `EnableKeyRotation: true` appears in the `DemandLetterKmsKey` properties block.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-003: KMS key policy grants root account full access

- **File**: `template.yaml`
- **Description**: Verifies that the key policy includes a statement allowing the AWS account root to perform all KMS actions — required so the key is manageable and not locked out.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DemandLetterKmsKey` → `Properties` → `KeyPolicy` → `Statement`, locate the statement with `Action: 'kms:*'`.
  3. Confirm the `Principal` is `AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'` and `Effect: Allow`.
- **Expected Result**: A statement with `Action: 'kms:*'`, `Effect: Allow`, and `Principal.AWS` equal to the account root ARN is present.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-004: KMS key policy grants RDS service decrypt and GenerateDataKey access

- **File**: `template.yaml`
- **Description**: Verifies the key policy has a statement permitting `rds.amazonaws.com` to call `kms:Decrypt` and `kms:GenerateDataKey` — required for RDS to use the CMK at rest.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DemandLetterKmsKey` → `Properties` → `KeyPolicy` → `Statement`, locate the statement with `Principal.Service: rds.amazonaws.com`.
  3. Confirm both `kms:Decrypt` and `kms:GenerateDataKey` are in the `Action` list.
- **Expected Result**: A statement with `Principal.Service: rds.amazonaws.com` and both `kms:Decrypt` and `kms:GenerateDataKey` in `Action` is present.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-005: KMS key alias resource declared and targets the CMK

- **File**: `template.yaml`
- **Description**: Verifies that `DemandLetterKmsKeyAlias` of type `AWS::KMS::Alias` is declared and references `DemandLetterKmsKey`.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Resources:`, locate `DemandLetterKmsKeyAlias`.
  3. Confirm `Type: AWS::KMS::Alias`, `AliasName: !Sub 'alias/${Stage}-demand-letter-rds'`, and `TargetKeyId: !Ref DemandLetterKmsKey`.
- **Expected Result**: `DemandLetterKmsKeyAlias` is declared with the correct type, stage-interpolated alias name, and reference to `DemandLetterKmsKey`.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-006: VpcId parameter declared with correct type

- **File**: `template.yaml`
- **Description**: Verifies that `VpcId` is present in `Parameters` with type `AWS::EC2::VPC::Id`.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Parameters:`, locate `VpcId`.
  3. Confirm `Type: AWS::EC2::VPC::Id` is set.
- **Expected Result**: `VpcId:\n    Type: AWS::EC2::VPC::Id` appears in the `Parameters` block.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-007: PrivateSubnet1 and PrivateSubnet2 parameters declared

- **File**: `template.yaml`
- **Description**: Verifies that both private subnet parameters are declared as `AWS::EC2::Subnet::Id` — required for the DB subnet group.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Parameters:`, locate `PrivateSubnet1` and `PrivateSubnet2`.
  3. Confirm both have `Type: AWS::EC2::Subnet::Id`.
- **Expected Result**: Both `PrivateSubnet1` and `PrivateSubnet2` are declared with `Type: AWS::EC2::Subnet::Id`.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-008: RDS security group declared with empty ingress and correct VPC reference

- **File**: `template.yaml`
- **Description**: Verifies that `RdsSecurityGroup` is declared as `AWS::EC2::SecurityGroup`, references `VpcId`, and has `SecurityGroupIngress: []` (no inbound rules — Lambda SGs wired in Phase 3).
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Resources:`, locate `RdsSecurityGroup`.
  3. Confirm `Type: AWS::EC2::SecurityGroup`, `VpcId: !Ref VpcId`, and `SecurityGroupIngress: []`.
- **Expected Result**: `RdsSecurityGroup` has the correct type, VPC reference, and an empty ingress list.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-009: RDS DB subnet group declared with both private subnets

- **File**: `template.yaml`
- **Description**: Verifies that `RdsSubnetGroup` is declared as `AWS::RDS::DBSubnetGroup` referencing both `PrivateSubnet1` and `PrivateSubnet2`.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Resources:`, locate `RdsSubnetGroup`.
  3. Confirm `Type: AWS::RDS::DBSubnetGroup` and `SubnetIds` contains `!Ref PrivateSubnet1` and `!Ref PrivateSubnet2`.
- **Expected Result**: `RdsSubnetGroup` lists both private subnet references in `SubnetIds`.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-010: RDS instance declared with correct engine and instance class

- **File**: `template.yaml`
- **Description**: Verifies that `DemandLetterDb` is `AWS::RDS::DBInstance` with `Engine: postgres`, `EngineVersion: '16.3'`, and `DBInstanceClass: db.t4g.micro`.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Resources:`, locate `DemandLetterDb`.
  3. Confirm `Type: AWS::RDS::DBInstance`, `Engine: postgres`, `EngineVersion: '16.3'`, and `DBInstanceClass: db.t4g.micro`.
- **Expected Result**: All three properties match exactly.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-011: RDS instance has StorageEncrypted true and KmsKeyId referencing the CMK

- **File**: `template.yaml`
- **Description**: Verifies that `StorageEncrypted: true` and `KmsKeyId: !Ref DemandLetterKmsKey` are set on the RDS instance — the core CMK encryption requirement of TASK-003.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DemandLetterDb` → `Properties`, confirm `StorageEncrypted: true` and `KmsKeyId: !Ref DemandLetterKmsKey`.
- **Expected Result**: Both `StorageEncrypted: true` and `KmsKeyId: !Ref DemandLetterKmsKey` are present.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-012: RDS instance credentials sourced from SSM Parameter Store

- **File**: `template.yaml`
- **Description**: Verifies that `MasterUsername` and `MasterUserPassword` use `{{resolve:ssm:...}}` dynamic references — no plaintext credentials in the template.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DemandLetterDb` → `Properties`, confirm:
     - `MasterUsername: !Sub '{{resolve:ssm:/${Stage}/demand-letter/db/username}}'`
     - `MasterUserPassword: !Sub '{{resolve:ssm:/${Stage}/demand-letter/db/password:1}}'`
- **Expected Result**: Both credential fields use SSM dynamic resolution with the `/${Stage}/demand-letter/db/` path prefix.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-013: RDS instance is not publicly accessible and not MultiAZ

- **File**: `template.yaml`
- **Description**: Verifies that `PubliclyAccessible: false` and `MultiAZ: false` are set — keeps the instance private and in skeleton/dev configuration.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DemandLetterDb` → `Properties`, confirm `PubliclyAccessible: false` and `MultiAZ: false`.
- **Expected Result**: Both properties are present and set to `false`.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-014: RDS instance has DeletionPolicy and UpdateReplacePolicy set to Retain

- **File**: `template.yaml`
- **Description**: Verifies that `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain` are set on `DemandLetterDb` — required to protect the database from accidental deletion on stack updates.
- **Steps**:
  1. Open `template.yaml`.
  2. On the `DemandLetterDb` resource (not under `Properties`), confirm `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain`.
- **Expected Result**: Both policies are set to `Retain` at the resource level.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-015: RDS instance references RdsSubnetGroup and RdsSecurityGroup

- **File**: `template.yaml`
- **Description**: Verifies that `DemandLetterDb` is placed in the declared subnet group and security group.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DemandLetterDb` → `Properties`, confirm `DBSubnetGroupName: !Ref RdsSubnetGroup` and `VPCSecurityGroups` contains `!Ref RdsSecurityGroup`.
- **Expected Result**: Both references are present.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-016: RDS instance has backup retention of 7 days and Performance Insights enabled

- **File**: `template.yaml`
- **Description**: Verifies `BackupRetentionPeriod: 7` and `EnablePerformanceInsights: true` are set.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DemandLetterDb` → `Properties`, confirm `BackupRetentionPeriod: 7` and `EnablePerformanceInsights: true`.
- **Expected Result**: Both properties are present with the specified values.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-017: DbInstanceEndpoint output declared and exported

- **File**: `template.yaml`
- **Description**: Verifies that the `DbInstanceEndpoint` output exists, sources from `!GetAtt DemandLetterDb.Endpoint.Address`, and exports as `${Stage}-demand-letter-db-endpoint`.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Outputs:`, locate `DbInstanceEndpoint`.
  3. Confirm `Value: !GetAtt DemandLetterDb.Endpoint.Address` and `Export.Name: !Sub '${Stage}-demand-letter-db-endpoint'`.
- **Expected Result**: Both `Value` and `Export.Name` match exactly.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-018: DbInstancePort output declared and exported

- **File**: `template.yaml`
- **Description**: Verifies that the `DbInstancePort` output exists, sources from `!GetAtt DemandLetterDb.Endpoint.Port`, and exports as `${Stage}-demand-letter-db-port`.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Outputs:`, locate `DbInstancePort`.
  3. Confirm `Value: !GetAtt DemandLetterDb.Endpoint.Port` and `Export.Name: !Sub '${Stage}-demand-letter-db-port'`.
- **Expected Result**: Both `Value` and `Export.Name` match exactly.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-FS-019: KmsKeyArn output declared and exported

- **File**: `template.yaml`
- **Description**: Verifies that the `KmsKeyArn` output exists, sources from `!GetAtt DemandLetterKmsKey.Arn`, and exports as `${Stage}-demand-letter-kms-key-arn`.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `Outputs:`, locate `KmsKeyArn`.
  3. Confirm `Value: !GetAtt DemandLetterKmsKey.Arn` and `Export.Name: !Sub '${Stage}-demand-letter-kms-key-arn'`.
- **Expected Result**: Both `Value` and `Export.Name` match exactly.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-EDGE-001: StorageEncrypted cannot be omitted or false when KmsKeyId is set

- **File**: `template.yaml`
- **Description**: Verifies the compliance guard: `StorageEncrypted: true` must co-exist with `KmsKeyId`. If `StorageEncrypted` were absent or false, CloudFormation would ignore the KMS key entirely and create an unencrypted instance — which cannot be remediated without replacement.
- **Steps**:
  1. Open `template.yaml`.
  2. Confirm that both `StorageEncrypted: true` AND `KmsKeyId: !Ref DemandLetterKmsKey` are present in `DemandLetterDb.Properties` — neither is absent.
- **Expected Result**: Both properties co-exist. Neither is missing.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-EDGE-002: Template contains no plaintext DB credentials

- **File**: `template.yaml`
- **Description**: Verifies that no literal username or password strings appear in the template — all credentials must be resolved from SSM at deploy time.
- **Steps**:
  1. Open `template.yaml`.
  2. Search for any string that looks like a password or username literal (e.g. `admin`, `password`, `secret`, any alphanumeric string as a value for `MasterUsername` or `MasterUserPassword` not wrapped in `{{resolve:ssm:`).
- **Expected Result**: No plaintext credential values are found. Both `MasterUsername` and `MasterUserPassword` values contain `{{resolve:ssm:` as their resolution mechanism.
- [x] Pass <!-- 2026-06-23 -->
