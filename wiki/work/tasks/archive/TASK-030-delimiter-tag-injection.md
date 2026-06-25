---
id: TASK-030
title: "Delimiter Tag Injection — Inject {field_name} Tags, Save to S3, and Enumerate Slots via InspectModule"
status: done
created: 2026-06-24
updated: 2026-06-24
depends_on: [TASK-029]
blocks: []
parallel_safe_with: []
uat: "[[UAT-030]]"
tags: [docx, ooxml, docxtemplater, delimiter, s3, slots, template]
---

# TASK-030 — Delimiter Tag Injection — Inject {field_name} Tags, Save to S3, and Enumerate Slots via InspectModule

implements::[[DEC-0002#D1]]

## Objective

After the attorney confirms the zone annotation (TASK-029), inject `{field_name}` docxtemplater delimiter tags into the `.docx` OOXML at each confirmed `variable_populated` zone. Each tag is written as a clean single-run `<w:r><w:t>{field_name}</w:t></w:r>` node replacing the zone's existing run content. Boilerplate zones are left byte-exact and untouched. The modified DOCX is saved to S3 (`templates.s3KeyTagged`). Then `docxtemplater`'s `InspectModule` is run on the tagged DOCX to enumerate all `{tag}` slots, storing the slot list in `templates.slotCount` and a new `template_slots` join table. A `GET /jobs/:id/templates/:templateId/slots` endpoint returns the slot list for the sufficiency gate in ROADMAP-003.

## Approach

Injection uses `PizZip` to unzip the DOCX, modifies `word/document.xml` via `fast-xml-parser` + serialization back to XML (the same stack as the parser in TASK-025), then rezips and uploads to S3. The key constraint is that only confirmed `variable_populated` zones get replaced — boilerplate zones are left untouched. After injection, `docxtemplater` with `InspectModule` runs on the tagged buffer to extract the slot list. A new Prisma model `TemplateSlot` stores `(templateId, slotName, required)`. The Lambda handler `POST /jobs/:id/templates/:templateId/inject` orchestrates the full flow.

## Steps

### 1. Add TemplateSlot Prisma model  <!-- agent: general-purpose -->

- [x] Open `packages/db/prisma/schema.prisma`.
- [x] Add the `TemplateSlot` model after the `Zone` model:
  ```prisma
  model TemplateSlot {
    id         String   @id @default(cuid())
    templateId String
    template   Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
    slotName   String
    required   Boolean  @default(true)

    @@unique([templateId, slotName])
    @@index([templateId])
    @@map("template_slots")
  }
  ```
- [x] Add `slots TemplateSlot[]` reverse relation to `Template` model.
- [x] Run `prisma migrate dev --name add-template-slots` (or write migration SQL manually if no live DB).
- [x] Run `prisma generate` to regenerate the client.
- [x] Rebuild `@demand-letter/db`: `pnpm --filter @demand-letter/db build`.
- [x] Export `TemplateSlot` type from `packages/db/src/index.ts`. <!-- Completed: 2026-06-24 -->

### 2. Install docxtemplater and XMLBuilder  <!-- agent: general-purpose -->

- [x] Run from monorepo root:
  ```bash
  pnpm add docxtemplater --filter @demand-letter/api
  pnpm add fast-xml-parser --filter @demand-letter/api
  ```
  (fast-xml-parser is already installed from TASK-025; confirm it's present, do not re-add if already listed.)
- [x] Verify `pnpm-lock.yaml` updated. <!-- Completed: 2026-06-24 -->

### 3. Implement the delimiter injection utility  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/docx-injector.ts`: <!-- Completed: 2026-06-24 -->

```typescript
import PizZip from 'pizzip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { OoxmlZone } from './docx-types';

const PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['w:p', 'w:r', 'w:t', 'w:body'].includes(name),
  preserveOrder: true,
});

const BUILDER = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  format: false,
});

export function injectDelimiters(
  buffer: Buffer,
  confirmedZones: Array<{ zoneIndex: number; suggestedFieldName: string }>,
): Buffer {
  const zip = new PizZip(buffer);
  const docXml = zip.file('word/document.xml')?.asText();
  if (!docXml) throw new Error('word/document.xml not found');

  const confirmedSet = new Map(confirmedZones.map(z => [z.zoneIndex, z.suggestedFieldName]));

  // Parse → modify → serialize
  const parsed = PARSER.parse(docXml);
  // Walk w:document > w:body > w:p elements
  // For each paragraph at zoneIndex that is in confirmedSet:
  //   Replace all w:r children with a single w:r containing w:t {fieldName}
  // For boilerplate zones: leave untouched

  // Implementation: traverse the preserved-order array structure
  // (The exact traversal depends on fast-xml-parser's preserveOrder output shape)
  // See: https://github.com/NaturalIntelligence/fast-xml-parser

  traverseAndInject(parsed, confirmedSet);

  const modifiedXml = BUILDER.build(parsed);
  zip.file('word/document.xml', modifiedXml);
  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

function traverseAndInject(
  nodes: unknown[],
  confirmedSet: Map<number, string>,
  paraIndex = { value: 0 },
): void {
  for (const node of nodes as Record<string, unknown>[]) {
    if ('w:body' in node) {
      traverseAndInject(node['w:body'] as unknown[], confirmedSet, paraIndex);
    } else if ('w:p' in node) {
      const pArr = node['w:p'] as Record<string, unknown>[];
      for (const p of pArr) {
        const idx = paraIndex.value++;
        const fieldName = confirmedSet.get(idx);
        if (fieldName) {
          // Replace all runs with a single tag run
          const tagRun = { 'w:r': [{ 'w:t': [{ '#text': `{${fieldName}}` }] }] };
          // Remove existing w:r keys, add tag run
          const keys = Object.keys(p).filter(k => k !== ':@' && k !== 'w:pPr');
          for (const k of keys) delete p[k];
          Object.assign(p, tagRun);
        }
      }
    }
  }
}
```

Note: The `preserveOrder: true` mode of fast-xml-parser returns a different array-of-objects structure. Read the fast-xml-parser docs on `preserveOrder` before implementing — use `mcp__context7__query-docs` if needed to get the exact traversal API. The above is a skeleton; adjust traversal to match the actual output shape.

### 4. Implement InspectModule slot enumeration utility  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/docx-inspect.ts`: <!-- Completed: 2026-06-24 -->

```typescript
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import InspectModule from 'docxtemplater/js/inspect-module';

export function enumerateSlots(buffer: Buffer): string[] {
  const zip = new PizZip(buffer);
  const iModule = new InspectModule();
  const doc = new Docxtemplater(zip, {
    modules: [iModule],
    paragraphLoop: true,
    linebreaks: true,
  });
  doc.render();
  const tags: Record<string, unknown> = iModule.getAllTags();
  return Object.keys(tags);
}
```

### 5. Create the Lambda handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/post-jobs-templates-inject.ts`:
  - Parse `jobId` and `templateId` from path parameters.
  - Fetch the template: `prisma.template.findUnique({ where: { id: templateId }, include: { zones: true } })`.
  - Filter confirmed `variable_populated` zones: `zones.filter(z => z.confirmed && z.type === 'variable_populated' && z.suggestedFieldName)`.
  - Download original DOCX from S3 (`template.s3KeyOriginal`).
  - Call `injectDelimiters(buffer, confirmedZones)` → `taggedBuffer`.
  - Upload `taggedBuffer` to S3 key `templates/${templateId}/tagged.docx` → store as `s3KeyTagged`.
  - Call `enumerateSlots(taggedBuffer)` → `slots: string[]`.
  - Update template: `prisma.template.update({ where: { id: templateId }, data: { s3KeyTagged, slotCount: slots.length } })`.
  - Upsert slot rows: `Promise.all(slots.map(slotName => prisma.templateSlot.upsert({ where: { templateId_slotName: { templateId, slotName } }, update: {}, create: { templateId, slotName, required: true } })))`.
  - Return `200` with `{ s3KeyTagged, slotCount: slots.length, slots }`.
- [x] Register as `PostJobsTemplatesInjectFunction` in `template.yaml` on `POST /jobs/{id}/templates/{templateId}/inject`. <!-- Completed: 2026-06-24 -->

### 6. Create the GET /jobs/:id/templates/:templateId/slots handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/get-jobs-template-slots.ts`:
  - Query: `prisma.templateSlot.findMany({ where: { templateId }, orderBy: { slotName: 'asc' } })`.
  - Return `200` with `{ slotCount, slots: [{ slotName, required }] }`.
- [x] Register as `GetJobsTemplateSlotsFunction` in `template.yaml` on `GET /jobs/{id}/templates/{templateId}/slots`. <!-- Completed: 2026-06-24 -->

### 7. TypeScript typecheck  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from the monorepo root.
- [x] Fix any type errors (common: `InspectModule` import, PizZip `generate` return type, JSON traversal).
- [x] Confirm zero errors. <!-- Completed: 2026-06-24 -->
