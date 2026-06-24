---
id: TASK-003
title: 'RDS Instance with KMS CMK Encryption'
status: done
created: 2026-06-23
updated: 2026-06-23
depends_on: [TASK-001]
blocks: []
parallel_safe_with: [TASK-002, TASK-004, TASK-006, TASK-007]
uat: '[[UAT-003]]'
tags: [infra, rds, kms, postgresql, sam]
---

# TASK-003 — RDS Instance with KMS CMK Encryption

## Objective

Provision a PostgreSQL RDS instance with a KMS customer-managed key (CMK) for encryption at rest, declared in the SAM/CloudFormation template. KMS CMK encryption must be enabled at creation — it cannot be retrofitted onto an existing unencrypted instance.

## Approach

- Declare a KMS CMK, an RDS DB Subnet Group, a VPC Security Group, and an RDS DB Instance in `template.yaml`
- Use `AWS::RDS::DBInstance` (not Aurora) — simpler for the skeleton phase
- The KMS key is a CMK (`EnableKeyRotation: true`) to satisfy the compliance requirement documented in the PRD
- Credentials are injected via SSM Parameter Store (set up by TASK-006); the SAM template references them with `{{resolve:ssm:...}}`
- A DB Subnet Group is required; add two private subnets via parameters (to be filled in at deploy time or from an existing VPC)
- Security Group allows inbound port 5432 only from Lambda SGs (to be wired in Phase 3)

## Steps

### 1. Add KMS CMK resource to `template.yaml` <!-- agent: general-purpose -->

- [x] Open `template.yaml` and add under `Resources:`: <!-- Completed: 2026-06-23 -->

  ```yaml
  DemandLetterKmsKey:
    Type: AWS::KMS::Key
    Properties:
      Description: CMK for RDS encryption — Demand Letter Generator
      EnableKeyRotation: true
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'
          - Effect: Allow
            Principal:
              Service: rds.amazonaws.com
            Action:
              - kms:Decrypt
              - kms:GenerateDataKey
            Resource: '*'

  DemandLetterKmsKeyAlias:
    Type: AWS::KMS::Alias
    Properties:
      AliasName: !Sub 'alias/${Stage}-demand-letter-rds'
      TargetKeyId: !Ref DemandLetterKmsKey
  ```

### 2. Add VPC networking parameters <!-- agent: general-purpose -->

- [x] Add VPC parameters to the `Parameters:` section of `template.yaml`: <!-- Completed: 2026-06-23 -->

  ```yaml
  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: VPC to deploy RDS into

  PrivateSubnet1:
    Type: AWS::EC2::Subnet::Id
    Description: First private subnet for RDS subnet group

  PrivateSubnet2:
    Type: AWS::EC2::Subnet::Id
    Description: Second private subnet for RDS subnet group
  ```

### 3. Add RDS security group, subnet group, and instance <!-- agent: general-purpose -->

- [x] Add under `Resources:`: <!-- Completed: 2026-06-23 -->

  ```yaml
  RdsSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: RDS PostgreSQL access — Demand Letter Generator
      VpcId: !Ref VpcId
      SecurityGroupIngress: []

  RdsSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Private subnets for Demand Letter RDS
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2

  DemandLetterDb:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Retain
    UpdateReplacePolicy: Retain
    Properties:
      DBInstanceIdentifier: !Sub '${Stage}-demand-letter-db'
      DBInstanceClass: db.t4g.micro
      Engine: postgres
      EngineVersion: '16.3'
      AllocatedStorage: '20'
      StorageType: gp3
      StorageEncrypted: true
      KmsKeyId: !Ref DemandLetterKmsKey
      MasterUsername: !Sub '{{resolve:ssm:/${Stage}/demand-letter/db/username}}'
      MasterUserPassword: !Sub '{{resolve:ssm:/${Stage}/demand-letter/db/password:1}}'
      DBSubnetGroupName: !Ref RdsSubnetGroup
      VPCSecurityGroups:
        - !Ref RdsSecurityGroup
      BackupRetentionPeriod: 7
      MultiAZ: false
      PubliclyAccessible: false
      EnablePerformanceInsights: true
  ```

### 4. Add RDS outputs <!-- agent: general-purpose -->

- [x] Add to the `Outputs:` section: <!-- Completed: 2026-06-23 -->

  ```yaml
  DbInstanceEndpoint:
    Value: !GetAtt DemandLetterDb.Endpoint.Address
    Export:
      Name: !Sub '${Stage}-demand-letter-db-endpoint'

  DbInstancePort:
    Value: !GetAtt DemandLetterDb.Endpoint.Port
    Export:
      Name: !Sub '${Stage}-demand-letter-db-port'

  KmsKeyArn:
    Value: !GetAtt DemandLetterKmsKey.Arn
    Export:
      Name: !Sub '${Stage}-demand-letter-kms-key-arn'
  ```

### 5. Validate the SAM template <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Run `sam validate --template template.yaml` and confirm no errors (`sam` CLI not installed in this environment — requires human intervention)
- [DEFERRED-TO-UAT] Run `sam build --template template.yaml` (will skip Lambda build if no functions yet — that's expected) and confirm the template renders without CloudFormation errors (`sam` CLI not installed in this environment — requires human intervention)
