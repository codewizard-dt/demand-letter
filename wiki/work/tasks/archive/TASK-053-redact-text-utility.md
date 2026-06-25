---
id: TASK-053
title: "redactText utility: replace PHI/PII entity spans with typed tokens"
status: done
created: 2026-06-25
updated: 2026-06-25
completed: 2026-06-25
depends_on: []
blocks: [TASK-054, TASK-055]
parallel_safe_with: [TASK-051, TASK-056, TASK-058]
uat: "[[UAT-053]]"
tags: [compliance, hipaa, redaction, utility]
---

# TASK-053 — redactText utility: replace PHI/PII entity spans with typed tokens

implements::[[ROADMAP-005]]

## Objective

Create a pure `redactText(text, entities)` function that replaces detected PHI/PII offset spans with typed tokens (`[PATIENT_NAME]`, `[DATE_OF_BIRTH]`, `[SSN]`, `[PHONE]`, `[ADDRESS]`, `[PROVIDER]`, etc.). Used by TASK-054 (log scrubbing) and TASK-055 (developer-facing API response redaction).

## Approach

Sort entities by `startOffset` descending so replacements don't shift later offsets. Slice out each span and replace with the appropriate token from a type→token map. A catch-all `[PHI_ENTITY]` handles unmapped types. Export from `lib/index.ts`.

## Steps

### 1. Create redact-text.ts  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/redact-text.ts` with the following: <!-- Completed: 2026-06-25 -->

  ```typescript
  export interface RedactableEntity {
    type: string;
    startOffset: number;
    endOffset: number;
  }

  const TOKEN_MAP: Record<string, string> = {
    PATIENT: '[PATIENT_NAME]',
    PERSON: '[PATIENT_NAME]',
    NAME: '[PATIENT_NAME]',
    DATE: '[DATE_OF_BIRTH]',
    DATE_TIME: '[DATE_OF_BIRTH]',
    AGE: '[AGE]',
    SSN: '[SSN]',
    PHONE_NUMBER: '[PHONE]',
    PHONE: '[PHONE]',
    EMAIL: '[EMAIL]',
    ADDRESS: '[ADDRESS]',
    LOCATION: '[ADDRESS]',
    DOCTOR: '[PROVIDER]',
    PROVIDER: '[PROVIDER]',
    HOSPITAL: '[PROVIDER]',
    ORGANIZATION: '[PROVIDER]',
    ID: '[ID]',
    MEDICAL_CONDITION: '[MEDICAL_CONDITION]',
    DIAGNOSIS: '[MEDICAL_CONDITION]',
  };

  export function redactText(text: string, entities: RedactableEntity[]): string {
    if (!entities.length) return text;
    // Sort descending so replacements don't shift subsequent offsets
    const sorted = [...entities].sort((a, b) => b.startOffset - a.startOffset);
    let result = text;
    for (const entity of sorted) {
      const token = TOKEN_MAP[entity.type] ?? '[PHI_ENTITY]';
      result = result.slice(0, entity.startOffset) + token + result.slice(entity.endOffset);
    }
    return result;
  }
  ```

### 2. Export from lib/index.ts  <!-- agent: general-purpose -->

- [x] In `packages/api/src/lib/index.ts`, add: <!-- Completed: 2026-06-25 -->
  ```typescript
  export { redactText, type RedactableEntity } from './redact-text';
  ```

### 3. TypeScript verification  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api typecheck` <!-- Completed: 2026-06-25 -->
- [x] Confirm zero errors <!-- Completed: 2026-06-25 -->
