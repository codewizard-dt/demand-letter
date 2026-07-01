import PizZip from 'pizzip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { getSystemFieldCode, isSystemTemplateFieldName } from './docx-system-fields';
import { suffixedTemplateSlotName } from './template-slot-names';
import { isClauseProseField } from './field-schema';

const PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['w:p', 'w:r', 'w:t', 'w:body', 'w:document'].includes(name),
  preserveOrder: true,
  // Do not trim run text: the whole document is parsed and rebuilt here, so
  // trimming would drop the spaces that sit at run boundaries and merge words
  // ("to accept" → "toaccept") throughout the document, not just injected zones.
  trimValues: false,
});

const BUILDER = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  format: false,
});

const TAG_TOKEN_RE = /\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g;

/**
 * A "pure variable" zone is a single {field} placeholder with no surrounding
 * literal text (e.g. an address line that is just {insurer_address}). Only these
 * are collapsed when a field repeats across adjacent paragraphs — mixed zones
 * like "Attn.: {adjuster_name}" carry real text and must always render.
 */
function isPureVariableTemplate(templateText: string | null | undefined, fieldName: string): boolean {
  if (templateText == null) return Boolean(fieldName);
  const tokens = [...templateText.matchAll(TAG_TOKEN_RE)];
  const stripped = templateText.replace(TAG_TOKEN_RE, '').trim();
  return tokens.length === 1 && stripped.length === 0;
}

function isAddressField(fieldName: string): boolean {
  return fieldName.endsWith('_address');
}

export function injectDelimiters(
  buffer: Buffer,
  confirmedZones: Array<{ zoneIndex: number; suggestedFieldName: string; templateText?: string | null; paragraphSpan?: number }>,
): Buffer {
  const zip = new PizZip(buffer);
  const docXml = zip.file('word/document.xml')?.asText();
  if (!docXml) throw new Error('word/document.xml not found');

  if (confirmedZones.length === 0) {
    return buffer;
  }

  // Keep the template's own clause text for "mixed" zones whose variable is a
  // standard legal clause (e.g. "…and not {release_scope}"): a full clause value
  // injected mid-sentence reads as broken grammar, so leave the paragraph as
  // authored boilerplate rather than inject it.
  const injectableZones = confirmedZones.filter(
    (z) => !(isClauseProseField(z.suggestedFieldName) && !isPureVariableTemplate(z.templateText, z.suggestedFieldName)),
  );
  if (injectableZones.length === 0) {
    return buffer;
  }

  // Sort by paragraph index, then group runs of adjacent (within 3 paragraphs)
  // *pure-variable* zones that share a field. Such a run is a single value the
  // template author split across paragraphs. How we resolve it depends on the field:
  //   • address fields → render as distinct lines: {insurer_address_1},
  //     {insurer_address_2}, … so a multi-line address fills each line (form style).
  //   • any other field → keep the first, clear the rest so the value doesn't
  //     render twice (e.g. a repeated email).
  // Mixed zones (a variable with surrounding literal text), system fields, and
  // far-apart repeats are always left as-is.
  const sorted = [...injectableZones].sort((a, b) => a.zoneIndex - b.zoneIndex);
  const confirmedSet = new Map<number, { fieldName: string; templateText?: string | null }>();
  const clearSet = new Set<number>();

  const isGroupable = (zone: (typeof sorted)[number]): boolean =>
    isPureVariableTemplate(zone.templateText, zone.suggestedFieldName) &&
    !isSystemTemplateFieldName(zone.suggestedFieldName);

  let i = 0;
  while (i < sorted.length) {
    const zone = sorted[i];
    if (!zone) { i++; continue; }
    const field = zone.suggestedFieldName;

    // Extend a run of consecutive same-field pure zones within 3 paragraphs.
    const group = [zone];
    let j = i + 1;
    while (j < sorted.length) {
      const next = sorted[j];
      const last = group[group.length - 1];
      if (!next || !last) break;
      if (
        isGroupable(zone) &&
        next.suggestedFieldName === field &&
        isPureVariableTemplate(next.templateText, field) &&
        next.zoneIndex - last.zoneIndex <= 3
      ) {
        group.push(next);
        j++;
      } else break;
    }

    if (group.length > 1 && isAddressField(field)) {
      group.forEach((z, index) => {
        const lineField = suffixedTemplateSlotName(field, index + 1);
        confirmedSet.set(z.zoneIndex, { fieldName: lineField, templateText: `{${lineField}}` });
      });
    } else if (group.length > 1) {
      confirmedSet.set(zone.zoneIndex, { fieldName: field, templateText: zone.templateText });
      for (let k = 1; k < group.length; k++) {
        const dup = group[k];
        if (dup) clearSet.add(dup.zoneIndex);
      }
    } else {
      confirmedSet.set(zone.zoneIndex, { fieldName: field, templateText: zone.templateText });
    }

    i = j > i ? j : i + 1;
  }

  // A zone may cover several source paragraphs (a sentence hard-broken across
  // paragraphs and merged into one zone). We inject the full template into the
  // first paragraph, so clear the absorbed continuation paragraphs.
  for (const zone of injectableZones) {
    const span = zone.paragraphSpan ?? 1;
    for (let k = 1; k < span; k++) clearSet.add(zone.zoneIndex + k);
  }

  const documentRels = parseRelationships(zip.file('word/_rels/document.xml.rels')?.asText() ?? '');

  const paraIndex = { value: 0 };
  for (const headerPath of referencedPartPaths(docXml, documentRels, 'header')) {
    injectPart(zip, headerPath, confirmedSet, clearSet, paraIndex);
  }
  injectPart(zip, 'word/document.xml', confirmedSet, clearSet, paraIndex);
  for (const footerPath of referencedPartPaths(docXml, documentRels, 'footer')) {
    injectPart(zip, footerPath, confirmedSet, clearSet, paraIndex);
  }
  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

interface Relationship {
  id: string;
  target: string;
}

function parseRelationships(xml: string): Record<string, Relationship> {
  const relationships: Record<string, Relationship> = {};
  const relRegex = /<Relationship\b([^>]*)\/>/g;
  const attrsRegex = /([a-zA-Z0-9_:-]+)=(?:"([^"]*)"|'([^']*)')/g;

  for (const relMatch of xml.matchAll(relRegex)) {
    const relAttrs = relMatch[1] ?? '';
    const attrMap = Object.fromEntries([...relAttrs.matchAll(attrsRegex)].map((m) => [m[1], m[2] ?? m[3]]));
    const id = attrMap.Id;
    const target = attrMap.Target;
    if (!id || !target) continue;
    relationships[id] = { id, target };
  }

  return relationships;
}

function normalizeTarget(sourcePath: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  if (target.startsWith('word/')) return target;
  const sourceDir = sourcePath.includes('/') ? sourcePath.slice(0, sourcePath.lastIndexOf('/')) : '';
  const parts = `${sourceDir}/${target}`.split('/');
  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') normalized.pop();
    else normalized.push(part);
  }
  return normalized.join('/');
}

// Header parts must be visited in the SAME order the zone extractor used, or the
// global paragraph counter drifts and confirmed zones land in the wrong part —
// e.g. a "Claim Number" zone from the default header injected into the first-page
// header's logo paragraph. The extractor sorts headers first → default → even
// (docx-zone-extractor.ts), so mirror that here.
const HEADER_VARIANT_ORDER: Record<string, number> = { first: 0, default: 1, even: 2 };

function referencedPartPaths(
  documentXml: string,
  documentRels: Record<string, Relationship>,
  slot: 'header' | 'footer',
): string[] {
  const parts: Array<{ path: string; variant: 'default' | 'first' | 'even' }> = [];
  // Accept both self-closing and expanded open/close reference tags.
  const pattern = new RegExp(`<w:${slot}Reference\\b([^>]*?)\\s*/?>`, 'g');
  for (const match of documentXml.matchAll(pattern)) {
    const attrs = match[1] ?? '';
    const relId = /r:id=("|')([^"']*)\1/.exec(attrs)?.[2];
    if (!relId) continue;
    const rel = documentRels[relId];
    if (!rel) continue;
    const path = normalizeTarget('word/document.xml', rel.target);
    const rawType = /w:type=("|')([^"']*)\1/.exec(attrs)?.[2];
    const variant: 'default' | 'first' | 'even' =
      rawType === 'first' ? 'first' : rawType === 'even' ? 'even' : 'default';
    if (!parts.find((p) => p.path === path && p.variant === variant)) {
      parts.push({ path, variant });
    }
  }
  if (slot === 'header') {
    parts.sort((a, b) => (HEADER_VARIANT_ORDER[a.variant] ?? 1) - (HEADER_VARIANT_ORDER[b.variant] ?? 1));
  }
  return parts.map((p) => p.path);
}

function injectPart(
  zip: PizZip,
  path: string,
  confirmedSet: Map<number, { fieldName: string; templateText?: string | null }>,
  clearSet: Set<number>,
  paraIndex: { value: number },
): void {
  const xml = zip.file(path)?.asText();
  if (!xml) return;
  const parsed = PARSER.parse(xml) as Array<Record<string, unknown>>;
  traverseAndInject(parsed, confirmedSet, clearSet, paraIndex);
  zip.file(path, BUILDER.build(parsed) as string);
}

function cloneNode<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectRunProperties(runChildren: Array<Record<string, unknown>>): Array<Record<string, unknown>> | undefined {
  const runPr = runChildren.find((child) => 'w:rPr' in child);
  if (!runPr || !Array.isArray((runPr as Record<string, unknown>)['w:rPr'])) return undefined;
  return cloneNode((runPr as Record<string, unknown>)['w:rPr'] as Array<Record<string, unknown>>);
}

function hasImageOrNonTextContent(runChildren: Array<Record<string, unknown>>): boolean {
  return runChildren.some((child) =>
    'w:drawing' in child ||
    'w:pict' in child ||
    'v:imagedata' in child ||
    'w:object' in child ||
    'mc:AlternateContent' in child ||
    'w:objectEmbed' in child
  );
}

function isTextOnlyRun(runChildren: Array<Record<string, unknown>>): boolean {
  const hasText = runChildren.some((child) => 'w:t' in child);
  return hasText && !hasImageOrNonTextContent(runChildren);
}

const IMAGE_KEYS = ['w:drawing', 'w:pict', 'v:imagedata', 'w:object', 'mc:AlternateContent', 'w:objectEmbed'];

function subtreeHasKey(value: unknown, keys: string[]): boolean {
  if (Array.isArray(value)) return value.some((v) => subtreeHasKey(v, keys));
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === ':@') continue;
      if (keys.includes(k)) return true;
      if (subtreeHasKey(v, keys)) return true;
    }
  }
  return false;
}

/**
 * A paragraph child that is not a run but carries only text — most commonly a
 * <w:hyperlink> wrapping the original email/URL — must be dropped when we inject
 * a zone's template, otherwise its text renders alongside the injected value
 * (e.g. "Sent Via E-Mail Only: {email}" plus the leftover mailto link). Paragraph
 * properties (w:pPr) and anything containing an image are always preserved.
 */
function isDroppableTextContainer(child: Record<string, unknown>): boolean {
  if ('w:pPr' in child) return false;
  if (subtreeHasKey(child, IMAGE_KEYS)) return false;
  return subtreeHasKey(child, ['w:t']);
}

function createTagRun(text: string, runProperties?: Array<Record<string, unknown>>): Record<string, unknown> {
  const children: Array<Record<string, unknown>> = [];
  if (runProperties) children.push({ 'w:rPr': cloneNode(runProperties) });
  // Mark leading/trailing whitespace as significant so Word doesn't collapse the
  // space that separates a placeholder from the surrounding text.
  const textNode: Record<string, unknown> = { 'w:t': [{ '#text': text }] };
  if (/^\s|\s$/.test(text)) textNode[':@'] = { '@_xml:space': 'preserve' };
  children.push(textNode);
  return { 'w:r': children };
}

function normalizeTemplateText(templateText: string): string {
  return templateText.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g, '{$1}');
}

function createFieldRun(
  tagName: string,
  runProperties?: Array<Record<string, unknown>>,
): Record<string, unknown>[] {
  if (!isSystemTemplateFieldName(tagName)) return [createTagRun(`{${tagName}}`, runProperties)];
  const fieldCode = getSystemFieldCode(tagName);
  const result = tagName === 'pageCount' ? '1' : '1';
  const withRunProperties = (children: Array<Record<string, unknown>>): Record<string, unknown> => {
    const runChildren: Array<Record<string, unknown>> = [];
    if (runProperties) runChildren.push({ 'w:rPr': cloneNode(runProperties) });
    runChildren.push(...children);
    return { 'w:r': runChildren };
  };

  return [
    withRunProperties([{ 'w:fldChar': [], ':@': { '@_w:fldCharType': 'begin', '@_w:dirty': 'true' } }]),
    withRunProperties([
      { 'w:instrText': [{ '#text': ` ${fieldCode} ` }], ':@': { '@_xml:space': 'preserve' } },
    ]),
    withRunProperties([{ 'w:fldChar': [], ':@': { '@_w:fldCharType': 'separate' } }]),
    createTagRun(result, runProperties),
    withRunProperties([{ 'w:fldChar': [], ':@': { '@_w:fldCharType': 'end' } }]),
  ];
}

function createTemplateRuns(
  templateText: string,
  runProperties?: Array<Record<string, unknown>>,
): Record<string, unknown>[] {
  const runs: Record<string, unknown>[] = [];
  const normalizedTemplateText = normalizeTemplateText(templateText);
  const tagPattern = /\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g;
  let cursor = 0;

  for (const match of normalizedTemplateText.matchAll(tagPattern)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      runs.push(createTagRun(normalizedTemplateText.slice(cursor, matchIndex), runProperties));
    }
    const fieldName = match[1];
    if (!fieldName) continue; // should not happen: regex group 1 always captures
    runs.push(...createFieldRun(fieldName, runProperties));
    cursor = matchIndex + match[0].length;
  }

  if (cursor < normalizedTemplateText.length) {
    runs.push(createTagRun(normalizedTemplateText.slice(cursor), runProperties));
  }

  return runs.length > 0 ? runs : [createTagRun(normalizedTemplateText, runProperties)];
}

/**
 * Recursively walk the preserveOrder tree.
 * Each node in the array is an object like:
 *   { "w:p": [...children], ":@": { "@_attr": "val" } }
 *
 * When we encounter a paragraph (w:p), increment the global paragraph counter
 * and optionally replace its runs with a tag run.
 */
function traverseAndInject(
  nodes: Array<Record<string, unknown>>,
  confirmedSet: Map<number, { fieldName: string; templateText?: string | null }>,
  clearSet: Set<number>,
  paraIndex: { value: number },
): void {
  for (const node of nodes) {
    for (const key of Object.keys(node)) {
      if (key === ':@') continue;

      if (key === 'w:p') {
        const idx = paraIndex.value++;
        if (clearSet.has(idx)) {
          // Collapsed duplicate (e.g. a repeated list item) — strip the text runs
          // so the value doesn't render again, and drop any list numbering so the
          // now-empty paragraph doesn't show up as an empty numbered <li>.
          const pChildren = node[key] as Array<Record<string, unknown>>;
          const stripped = pChildren.filter((child) => !('w:r' in child));
          for (const child of stripped) {
            if ('w:pPr' in child && Array.isArray(child['w:pPr'])) {
              child['w:pPr'] = (child['w:pPr'] as Array<Record<string, unknown>>).filter(
                (pr) => !('w:numPr' in pr),
              );
            }
          }
          node[key] = stripped;
          continue;
        }
        const zoneInfo = confirmedSet.get(idx);
        if (zoneInfo) {
          const runText = zoneInfo.templateText ?? `{${zoneInfo.fieldName}}`;
          const pChildren = node[key] as Array<Record<string, unknown>>;
          const transformedChildren: Array<Record<string, unknown>> = [];
          let styleSample: Array<Record<string, unknown>> | undefined;
          let inserted = false;

          for (const child of pChildren) {
            if ('w:r' in child) {
              const runChildren = child['w:r'] as Array<Record<string, unknown>>;
              if (Array.isArray(runChildren) && isTextOnlyRun(runChildren)) {
                styleSample ??= collectRunProperties(runChildren);
                if (!inserted) {
                  transformedChildren.push(...createTemplateRuns(runText, styleSample));
                  inserted = true;
                }
                continue;
              }
              transformedChildren.push(child);
              continue;
            }
            if (isDroppableTextContainer(child)) {
              // Replace the first text-bearing container (e.g. a hyperlink) with
              // the template; drop any further ones so their original text does
              // not render alongside the injected value.
              if (!inserted) {
                transformedChildren.push(...createTemplateRuns(runText, styleSample));
                inserted = true;
              }
              continue;
            }
            transformedChildren.push(child);
          }

          if (!inserted) {
            transformedChildren.push(...createTemplateRuns(runText, styleSample));
          }

          node[key] = transformedChildren;
        }
      } else {
        // Recurse into any other element that has children
        const children = node[key];
        if (Array.isArray(children)) {
          traverseAndInject(children as Array<Record<string, unknown>>, confirmedSet, clearSet, paraIndex);
        }
      }
    }
  }
}
