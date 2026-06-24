---
id: UAT-002
title: "UAT: PostgreSQL Schema Bootstrap — jobs and files tables"
status: passed
task: TASK-002
created: 2026-06-23
updated: 2026-06-23
---

# UAT-002 — UAT: PostgreSQL Schema Bootstrap — jobs and files tables

implements::[[TASK-002]]

> **Source task**: [[TASK-002]]
> **Generated**: 2026-06-23

---

## Prerequisites

- [ ] Repo is checked out and `pnpm install` has been run at the workspace root
- [ ] `pnpm --filter @demand-letter/db db:generate` has been run (Prisma Client generated)
- [ ] Working directory is the repo root (`/path/to/demand-letter`)

---

## Test Cases

### UAT-FS-001: schema.prisma exists at the expected path
- **Description**: Verifies the Prisma schema file was created at `packages/db/prisma/schema.prisma`
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  test -f packages/db/prisma/schema.prisma && echo "PASS: schema.prisma exists" || echo "FAIL: schema.prisma not found"
  ```
- **Expected Result**: Output is `PASS: schema.prisma exists`
- [x] Pass <!-- 2026-06-23 -->

### UAT-FS-002: schema.prisma declares the Job model
- **Description**: Verifies the `Job` model is present in the schema
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  grep -c 'model Job {' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output is `1`
- [x] Pass <!-- 2026-06-23 -->

### UAT-FS-003: Job model has all required fields and directives
- **Description**: Verifies the Job model contains `id`, `status`, `createdAt`, `updatedAt`, `files`, the two indexes, and maps to the `jobs` table
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  python3 -c "
import re, sys
schema = open('packages/db/prisma/schema.prisma').read()
checks = [
  ('id field with cuid',       r'id\s+String\s+@id\s+@default\(cuid\(\)\)'),
  ('status with default',      r'status\s+String\s+@default\(\"pending\"\)'),
  ('createdAt with now()',     r'createdAt\s+DateTime\s+@default\(now\(\)\)'),
  ('updatedAt with @updatedAt',r'updatedAt\s+DateTime\s+@updatedAt'),
  ('files relation',           r'files\s+File\[\]'),
  ('index on status',          r'@@index\(\[status\]\)'),
  ('index on createdAt',       r'@@index\(\[createdAt\]\)'),
  ('map to jobs table',        r'@@map\(\"jobs\"\)'),
]
fails = [name for name, pat in checks if not re.search(pat, schema)]
print('FAIL: ' + ', '.join(fails) if fails else 'PASS: all Job fields/directives present')
"
  ```
- **Expected Result**: Output is `PASS: all Job fields/directives present`
- [x] Pass <!-- 2026-06-23 -->

### UAT-FS-004: schema.prisma declares the File model
- **Description**: Verifies the `File` model is present in the schema
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  grep -c 'model File {' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output is `1`
- [x] Pass <!-- 2026-06-23 -->

### UAT-FS-005: File model has all required fields and directives
- **Description**: Verifies the File model contains `id`, `jobId`, `job` (FK relation with CASCADE), `s3Key`, `type`, `name`, `createdAt`, the jobId index, and maps to the `files` table
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  python3 -c "
import re, sys
schema = open('packages/db/prisma/schema.prisma').read()
checks = [
  ('id field with cuid',         r'id\s+String\s+@id\s+@default\(cuid\(\)\)'),
  ('jobId field',                r'jobId\s+String'),
  ('job relation with cascade',  r'job\s+Job\s+@relation\(fields: \[jobId\], references: \[id\], onDelete: Cascade\)'),
  ('s3Key field',                r's3Key\s+String'),
  ('type field',                 r'type\s+String'),
  ('name field',                 r'name\s+String'),
  ('createdAt with now()',       r'createdAt\s+DateTime\s+@default\(now\(\)\)'),
  ('index on jobId',             r'@@index\(\[jobId\]\)'),
  ('map to files table',         r'@@map\(\"files\"\)'),
]
fails = [name for name, pat in checks if not re.search(pat, schema)]
print('FAIL: ' + ', '.join(fails) if fails else 'PASS: all File fields/directives present')
"
  ```
- **Expected Result**: Output is `PASS: all File fields/directives present`
- [x] Pass <!-- 2026-06-23 -->

### UAT-FS-006: migration SQL file exists under migrations directory
- **Description**: Verifies that at least one `.sql` migration file was created under `packages/db/prisma/migrations/`
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  find packages/db/prisma/migrations -name '*.sql' | head -1 | grep -q '.' && echo "PASS: migration SQL file found" || echo "FAIL: no migration SQL file found"
  ```
- **Expected Result**: Output is `PASS: migration SQL file found`
- [x] Pass <!-- 2026-06-23 -->

### UAT-FS-007: migration SQL creates the jobs table with correct columns
- **Description**: Verifies the migration SQL contains `CREATE TABLE "jobs"` with the correct column definitions including the `pending` default for `status`
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  python3 -c "
import re, glob
sql_files = glob.glob('packages/db/prisma/migrations/**/*.sql', recursive=True)
sql = ''.join(open(f).read() for f in sql_files)
checks = [
  ('CREATE TABLE jobs',       r'CREATE TABLE \"jobs\"'),
  ('id column',               r'\"id\" TEXT NOT NULL'),
  ('status with pending default', r'\"status\" TEXT NOT NULL DEFAULT .pending.'),
  ('createdAt column',        r'\"createdAt\" TIMESTAMP'),
  ('updatedAt column',        r'\"updatedAt\" TIMESTAMP'),
  ('jobs primary key',        r'CONSTRAINT \"jobs_pkey\" PRIMARY KEY'),
]
fails = [name for name, pat in checks if not re.search(pat, sql)]
print('FAIL: ' + ', '.join(fails) if fails else 'PASS: jobs table SQL correct')
"
  ```
- **Expected Result**: Output is `PASS: jobs table SQL correct`
- [x] Pass <!-- 2026-06-23 -->

### UAT-FS-008: migration SQL creates the files table with correct columns
- **Description**: Verifies the migration SQL contains `CREATE TABLE "files"` with all required columns
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  python3 -c "
import re, glob
sql_files = glob.glob('packages/db/prisma/migrations/**/*.sql', recursive=True)
sql = ''.join(open(f).read() for f in sql_files)
checks = [
  ('CREATE TABLE files',    r'CREATE TABLE \"files\"'),
  ('id column',             r'\"id\" TEXT NOT NULL'),
  ('jobId column',          r'\"jobId\" TEXT NOT NULL'),
  ('s3Key column',          r'\"s3Key\" TEXT NOT NULL'),
  ('type column',           r'\"type\" TEXT NOT NULL'),
  ('name column',           r'\"name\" TEXT NOT NULL'),
  ('createdAt column',      r'\"createdAt\" TIMESTAMP'),
  ('files primary key',     r'CONSTRAINT \"files_pkey\" PRIMARY KEY'),
]
fails = [name for name, pat in checks if not re.search(pat, sql)]
print('FAIL: ' + ', '.join(fails) if fails else 'PASS: files table SQL correct')
"
  ```
- **Expected Result**: Output is `PASS: files table SQL correct`
- [x] Pass <!-- 2026-06-23 -->

### UAT-FS-009: migration SQL creates all required indexes
- **Description**: Verifies the migration SQL creates indexes on `jobs.status`, `jobs.createdAt`, and `files.jobId`
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  python3 -c "
import re, glob
sql_files = glob.glob('packages/db/prisma/migrations/**/*.sql', recursive=True)
sql = ''.join(open(f).read() for f in sql_files)
checks = [
  ('jobs_status_idx',   r'CREATE INDEX \"jobs_status_idx\" ON \"jobs\"\(\"status\"\)'),
  ('jobs_createdAt_idx',r'CREATE INDEX \"jobs_createdAt_idx\" ON \"jobs\"\(\"createdAt\"\)'),
  ('files_jobId_idx',   r'CREATE INDEX \"files_jobId_idx\" ON \"files\"\(\"jobId\"\)'),
]
fails = [name for name, pat in checks if not re.search(pat, sql)]
print('FAIL: ' + ', '.join(fails) if fails else 'PASS: all indexes present')
"
  ```
- **Expected Result**: Output is `PASS: all indexes present`
- [x] Pass <!-- 2026-06-23 -->

### UAT-FS-010: migration SQL has CASCADE foreign key from files to jobs
- **Description**: Verifies the migration SQL adds the FK constraint from `files.jobId` to `jobs.id` with `ON DELETE CASCADE`
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  python3 -c "
import re, glob
sql_files = glob.glob('packages/db/prisma/migrations/**/*.sql', recursive=True)
sql = ''.join(open(f).read() for f in sql_files)
pat = r'ALTER TABLE \"files\" ADD CONSTRAINT \"files_jobId_fkey\" FOREIGN KEY \(\"jobId\"\) REFERENCES \"jobs\"\(\"id\"\) ON DELETE CASCADE'
print('PASS: CASCADE FK present' if re.search(pat, sql) else 'FAIL: CASCADE FK not found')
"
  ```
- **Expected Result**: Output is `PASS: CASCADE FK present`
- [x] Pass <!-- 2026-06-23 -->

### UAT-FS-011: db/src/index.ts exports the prisma singleton
- **Description**: Verifies `packages/db/src/index.ts` exports `prisma` as a `PrismaClient` singleton with the `globalThis.__prisma` hot-reload guard
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  python3 -c "
import re
src = open('packages/db/src/index.ts').read()
checks = [
  ('PrismaClient import',         r\"from '@prisma/client'\"),
  ('globalThis.__prisma guard',    r'globalThis\.__prisma'),
  ('prisma export',               r'export const prisma\s*='),
  ('NODE_ENV production guard',   r'process\.env\.NODE_ENV.*!==.*production'),
  ('Prisma type re-export',       r\"export type \{ Prisma \} from '@prisma/client'\"),
  ('PrismaClient re-export',      r\"export \{ PrismaClient \} from '@prisma/client'\"),
]
fails = [name for name, pat in checks if not re.search(pat, src)]
print('FAIL: ' + ', '.join(fails) if fails else 'PASS: all singleton exports present')
"
  ```
- **Expected Result**: Output is `PASS: all singleton exports present`
- [x] Pass <!-- 2026-06-23 -->

### UAT-CLI-001: typecheck passes for the db package
- **Description**: Verifies `pnpm --filter @demand-letter/db typecheck` exits with code 0 (no TypeScript errors)
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  pnpm --filter @demand-letter/db typecheck && echo "PASS: typecheck clean" || echo "FAIL: typecheck errors"
  ```
- **Expected Result**: Output ends with `PASS: typecheck clean` and exit code is 0
- [x] Pass <!-- 2026-06-23 -->

### UAT-EDGE-001: schema.prisma has no Prisma enum types (plain strings only)
- **Description**: Verifies that `Job.status` and `File.type` are stored as plain `String` (not Prisma `enum`), per the task requirement to allow future additions without schema migrations
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  python3 -c "
schema = open('packages/db/prisma/schema.prisma').read()
import re
enum_count = len(re.findall(r'^enum\s+\w+\s*\{', schema, re.MULTILINE))
print(f'FAIL: {enum_count} enum(s) found — expected 0' if enum_count else 'PASS: no Prisma enums (plain strings used)')
"
  ```
- **Expected Result**: Output is `PASS: no Prisma enums (plain strings used)`
- [x] Pass <!-- 2026-06-23 -->

### UAT-EDGE-002: datasource provider is postgresql and uses DATABASE_URL env var
- **Description**: Verifies the datasource block is configured for PostgreSQL and reads the connection string from the environment (not a hard-coded value)
- **Steps**:
  1. From the repo root, run the command below
- **Command**:
  ```bash
  python3 -c "
import re
schema = open('packages/db/prisma/schema.prisma').read()
checks = [
  ('provider postgresql', r'provider\s*=\s*\"postgresql\"'),
  ('url from env',        r'url\s*=\s*env\(\"DATABASE_URL\"\)'),
]
fails = [name for name, pat in checks if not re.search(pat, schema)]
print('FAIL: ' + ', '.join(fails) if fails else 'PASS: datasource configured correctly')
"
  ```
- **Expected Result**: Output is `PASS: datasource configured correctly`
- [x] Pass <!-- 2026-06-23 -->
