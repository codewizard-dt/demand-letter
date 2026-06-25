---
id: TASK-025
title: "Template Ingestion Service — Parse DOCX to OOXML Zone Spans"
status: done
created: 2026-06-24
updated: 2026-06-24
depends_on: []
blocks: []
parallel_safe_with: []
uat: "[[UAT-025]]"
tags: [docx, ooxml, parsing, template, zone-detection]
---

# TASK-025 — Template Ingestion Service — Parse DOCX to OOXML Zone Spans

## Objective

Implement a TypeScript utility that reads a `.docx` file buffer and extracts all paragraphs and their constituent runs as structured OOXML zone objects. Each zone captures: paragraph style name, per-run formatting (bold, italic, font, fontSize), OOXML run path (paragraphIndex + runIndex), and raw text per run. The utility must never flatten the document to plain text — the full OOXML span structure must be preserved so downstream tasks can inject `{field_name}` delimiters into the correct OOXML nodes.

## Approach

A `.docx` file is a ZIP archive. The main document body lives in `word/document.xml` as OOXML XML. Use `pizzip` to unzip the buffer, parse `word/document.xml` with `fast-xml-parser`, and walk the `<w:body>` → `<w:p>` → `<w:r>` element tree. Extract `<w:pPr><w:pStyle>` for paragraph style and `<w:rPr>` child elements (`<w:b>`, `<w:i>`, `<w:rFonts>`, `<w:sz>`) for run-level formatting. Return a typed `OoxmlZone[]` array — one zone per paragraph, with a `runs` sub-array.

No DB writes happen in this task — persistence is handled in TASK-026 and TASK-027 (zones and templates DB tables). This task delivers only the in-memory parsing layer.

## Steps

### 1. Install parsing dependencies  <!-- agent: general-purpose -->

- [x] Add `pizzip` and `fast-xml-parser` to `packages/api/package.json` `dependencies`. <!-- Completed: 2026-06-24 -->
  - Run `pnpm add pizzip fast-xml-parser --filter @demand-letter/api` from the monorepo root.
  - Add `@types/pizzip` to `devDependencies` if available; otherwise declare a module shim if needed.
  - Verify `pnpm-lock.yaml` is updated.

### 2. Define OOXML type interfaces  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/docx-types.ts` with the following exported interfaces: <!-- Completed: 2026-06-24 -->

```typescript
export interface OoxmlRun {
  runIndex: number;         // 0-based index within the paragraph
  text: string;             // raw text from <w:t>
  bold: boolean;            // true when <w:b/> present in <w:rPr>
  italic: boolean;          // true when <w:i/> present in <w:rPr>
  font?: string;            // <w:rFonts w:ascii="..."> value
  fontSize?: number;        // <w:sz w:val="N"> / 2 (half-points → points)
}

export interface OoxmlZone {
  zoneIndex: number;        // 0-based paragraph index in document order
  paragraphStyle?: string;  // <w:pStyle w:val="..."> e.g. "Heading1", "Normal"
  runs: OoxmlRun[];
  textContent: string;      // concatenation of all run texts (read-only convenience)
}
```

### 3. Implement the DOCX parser utility  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/docx-parser.ts`: <!-- Completed: 2026-06-24 -->

```typescript
import PizZip from 'pizzip';
import { XMLParser } from 'fast-xml-parser';
import { OoxmlZone, OoxmlRun } from './docx-types';

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['w:p', 'w:r', 'w:t'].includes(name),
});

export function parseDocxToZones(buffer: Buffer): OoxmlZone[] {
  const zip = new PizZip(buffer);
  const documentXml = zip.file('word/document.xml')?.asText();
  if (!documentXml) throw new Error('word/document.xml not found in DOCX');

  const parsed = XML_PARSER.parse(documentXml);
  const body = parsed['w:document']?.['w:body'];
  if (!body) throw new Error('No w:body element in document.xml');

  const paragraphs: unknown[] = Array.isArray(body['w:p'])
    ? body['w:p']
    : body['w:p']
    ? [body['w:p']]
    : [];

  return paragraphs.map((para: unknown, zoneIndex: number) => {
    const p = para as Record<string, unknown>;
    const pPr = p['w:pPr'] as Record<string, unknown> | undefined;
    const pStyle = (pPr?.['w:pStyle'] as Record<string, string> | undefined)?.['@_w:val'];

    const rawRuns: unknown[] = Array.isArray(p['w:r'])
      ? p['w:r']
      : p['w:r']
      ? [p['w:r']]
      : [];

    const runs: OoxmlRun[] = rawRuns.map((run: unknown, runIndex: number) => {
      const r = run as Record<string, unknown>;
      const rPr = r['w:rPr'] as Record<string, unknown> | undefined;

      const tNode = r['w:t'];
      const text = typeof tNode === 'string'
        ? tNode
        : (tNode as Record<string, unknown> | undefined)?.['#text'] as string ?? '';

      const bold = rPr?.['w:b'] !== undefined;
      const italic = rPr?.['w:i'] !== undefined;
      const rFonts = rPr?.['w:rFonts'] as Record<string, string> | undefined;
      const font = rFonts?.['@_w:ascii'] ?? rFonts?.['@_w:hAnsi'];
      const szNode = rPr?.['w:sz'] as Record<string, string> | undefined;
      const fontSize = szNode ? Number(szNode['@_w:val']) / 2 : undefined;

      return { runIndex, text, bold, italic, font, fontSize };
    });

    const textContent = runs.map((r) => r.text).join('');
    return { zoneIndex, paragraphStyle: pStyle, runs, textContent };
  });
}
```

- [x] The `isArray` callback ensures single `<w:p>`, `<w:r>`, or `<w:t>` elements are still returned as arrays, preventing shape differences between 1-element and multi-element documents. <!-- Completed: 2026-06-24 -->

### 4. Export from lib barrel  <!-- agent: general-purpose -->

- [x] Open `packages/api/src/lib/ai-provider.ts` (or whichever file serves as the lib barrel, or create `packages/api/src/lib/index.ts` if absent) and add: <!-- Completed: 2026-06-24 -->
  ```typescript
  export { parseDocxToZones } from './docx-parser';
  export type { OoxmlZone, OoxmlRun } from './docx-types';
  ```
- [x] Verify: `packages/api/src/index.ts` re-exports from `./lib/index` if a barrel exists, or leave direct imports for now. <!-- Completed: 2026-06-24 — index.ts exports handler only; leaving direct imports per task spec -->

### 5. TypeScript typecheck  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api typecheck` from the monorepo root. <!-- Completed: 2026-06-24 -->
- [x] Fix any type errors (common: `unknown` indexing, missing `@types/pizzip` shim). <!-- Completed: 2026-06-24 — zero errors, no fixes needed -->
  - If `@types/pizzip` is not available, add `declare module 'pizzip'` to `packages/api/src/types.d.ts`.
- [x] Confirm zero type errors. <!-- Completed: 2026-06-24 -->
