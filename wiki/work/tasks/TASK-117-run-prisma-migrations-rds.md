---
id: TASK-117
title: "Run Prisma migrations against RDS"
status: done
created: 2026-07-01
updated: 2026-07-01
depends_on: [TASK-116]
blocks: []
parallel_safe_with: [TASK-118]
uat: ""
tags: [database, prisma, rds]
---

# TASK-117 — Run Prisma migrations against RDS

## Objective

Apply the Prisma schema migrations to the live RDS PostgreSQL database so the deployed API can persist jobs, files, templates, extracted fields, refinements, collaboration changes, and audit records.

## Approach

Use Prisma's deploy migration path against the live `DATABASE_URL` supplied through SSM or a secure shell environment. Check the known migration risk around required `files` fields before running against any non-empty database.

## Steps

### 1. Prepare migration execution  <!-- agent: general-purpose -->

- [x] Confirm the live RDS database is reachable from the chosen migration runner
- [x] Confirm `DATABASE_URL` is sourced securely without reading or committing any `.env` file
- [x] Review `app/db/prisma/migrations/20260624192824_add_jobs_output_column/migration.sql` for non-empty database risk

<!-- Updated: 2026-07-01 20:16 -->

## Notes

### 2026-07-01 — Step 1 preparation

No `.env` file was read or sourced. The live database URL was fetched from AWS SSM parameter `/prod/demand-letter/db/url` into process memory for inspection/probing, and the full URL/password were not printed.

Reachability from this local runner is blocked:

- RDS instance `prod-demand-letter-db` is `available`.
- RDS endpoint resolves to private IP `172.31.113.67`.
- RDS is not publicly accessible.
- `psql` reachability probe using the SSM-fetched URL timed out.
- No SSM-managed EC2 instances were found.
- No ECS clusters were found.

Migration risk review for `app/db/prisma/migrations/20260624192824_add_jobs_output_column/migration.sql`:

- `jobs.output TEXT` is nullable and low risk.
- The migration drops `files.name` and `files.type`, which would lose data if `files` is non-empty.
- The migration adds required `files.fileName`, `files.mimeType`, and `files.role` without defaults, which Prisma correctly warns cannot run against a non-empty `files` table.
- Because this live database is newly created and not yet migrated, the risk is acceptable only if the target database has no existing `files` rows.

### 2026-07-01 — Step 1 private migration runner

Created a temporary in-VPC SSM-managed EC2 migration runner and confirmed it can reach the private RDS endpoint. No migrations were applied during this check, and no database password or full `DATABASE_URL` was printed.

- Runner instance: `i-025c4b122de7c3d66`
- Runner subnet: `subnet-05925fc8ff290a62c`
- Runner security group: `sg-0973a0b44c91ea3d0`
- Runner private IP: `172.31.111.171`
- Runner public IP: none
- Runner IAM profile: `TASK-117-TemporaryMigrationRunnerProfile`
- Runner IAM role: `TASK-117-TemporaryMigrationRunnerRole`
- RDS security group: `sg-099827798bf28a284`
- Temporary RDS ingress rule: `sgr-09d332deccf51a9af`, TCP 5432 from runner SG `sg-0973a0b44c91ea3d0`
- Sanitized reachability proof: SSM command `833128a6-e242-4186-8b6e-adb6b252090d` returned `REACHABILITY=success`, host `prod-demand-letter-db.csviwg6kmv4c.us-east-1.rds.amazonaws.com`, port `5432`, DNS IP `172.31.113.67`, and `PASSWORD_PRINTED=no`.

Cleanup after migrations: terminate `i-025c4b122de7c3d66`, revoke `sgr-09d332deccf51a9af`, delete `sg-0973a0b44c91ea3d0`, then remove/delete the temporary instance profile and IAM role.

### 2026-07-01 — Runner replacement

The first temporary runner stopped accepting SSM commands after setup attempts; new commands remained `Pending`, so it was replaced.

- Stale runner terminated: `i-025c4b122de7c3d66`
- Replacement runner: `i-073e8cd7b50fc473a`
- Replacement runner security group: `sg-0973a0b44c91ea3d0`
- Replacement runner instance profile: `TASK-117-TemporaryMigrationRunnerProfile`
- SSM no-op proof: command `7d581f11-c282-4ec8-a42e-ade4a081181e` returned `SSM_OK`.
- Sanitized RDS reachability proof: command `652338d9-7812-4c74-8685-2fb6fa4bc3af` returned `REACHABILITY=success`, host `prod-demand-letter-db.csviwg6kmv4c.us-east-1.rds.amazonaws.com`, port `5432`, DNS IP `172.31.113.67`, and `PASSWORD_PRINTED=no`.

Updated cleanup after migrations: terminate `i-073e8cd7b50fc473a`, revoke `sgr-09d332deccf51a9af`, delete `sg-0973a0b44c91ea3d0`, then remove/delete the temporary instance profile and IAM role.

### 2. Apply migrations  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/db db:generate`
- [x] Run `pnpm --filter @demand-letter/db db:migrate` against the live RDS database
- [x] Confirm Prisma reports the database schema is up to date

<!-- Updated: 2026-07-01 20:48 -->

### 3. Verify database readiness  <!-- agent: general-purpose -->

- [x] Confirm core tables exist for jobs, files, templates, zones, source files, blocks, refinements, collaboration changes, and job logs
- [x] Record the migration result and any data-migration caveats

### 2026-07-01 — Step 2 migrations applied

Ran live Prisma migrations from replacement runner `i-073e8cd7b50fc473a` without reading `.env` and without printing the database URL or password.

- Uploaded a minimal DB migration bundle to `s3://aws-sam-cli-managed-default-samclisourcebucket-d7ee9663nisl/task117/task117-db-migration-bundle.tgz`.
- Temporarily granted the runner IAM role read access to that one object.
- Installed runner-side Node/npm, pnpm `9.0.0`, PostgreSQL client, and DB workspace dependencies.
- Fetched `/prod/demand-letter/db/url` from SSM into the runner process environment.
- Preflight result: `FILES_TABLE=absent`, so the known risky `files` migration had no existing data to drop.
- SSM migration command: `d1f75382-f3c4-4bc3-abb6-29c52dd579ef`.
- `pnpm --filter @demand-letter/db db:generate` completed successfully.
- `pnpm --filter @demand-letter/db db:migrate` completed successfully.
- Runner Node warning: Node `v18.20.8` does not satisfy the package engine `>=24 <25`, but Prisma Client generation and migration deploy completed.

### 2026-07-01 — Step 3 database readiness verified and cleanup completed

Prisma status check command `728eea16-0e8c-41a6-97ec-43f81e0cf1a6` reported:

- `16 migrations found in prisma/migrations`
- `Database schema is up to date!`
- `_prisma_migrations` rows: `16`
- Public base tables: `13`

Core table check command `06c00cfc-760e-449a-99af-87d0f22e6a5e` confirmed these public tables:

- `jobs`
- `files`
- `templates`
- `zones`
- `template_slots`
- `extracted_fields`
- `SourceFile`
- `Block`
- `refinements`
- `CollaborativeChange`
- `job_logs`
- `LlmAuditLog`
- `_prisma_migrations`

Temporary resource cleanup completed:

- Terminated runner `i-073e8cd7b50fc473a`
- Revoked RDS ingress rule `sgr-09d332deccf51a9af`
- Deleted runner security group `sg-0973a0b44c91ea3d0`
- Deleted S3 migration bundle
- Deleted temporary IAM inline policies, instance profile, and role
