import PizZip from 'pizzip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['w:p', 'w:r', 'w:t', 'w:body', 'w:document'].includes(name),
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

  if (confirmedZones.length === 0) {
    // Nothing to inject — return original buffer unchanged
    return buffer;
  }

  const confirmedSet = new Map(confirmedZones.map(z => [z.zoneIndex, z.suggestedFieldName]));

  const parsed = PARSER.parse(docXml) as Array<Record<string, unknown>>;

  const paraIndex = { value: 0 };
  traverseAndInject(parsed, confirmedSet, paraIndex);

  const modifiedXml = BUILDER.build(parsed) as string;
  zip.file('word/document.xml', modifiedXml);
  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
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

function createTagRun(fieldName: string, runProperties?: Array<Record<string, unknown>>): Record<string, unknown> {
  const children: Array<Record<string, unknown>> = [];
  if (runProperties) children.push({ 'w:rPr': runProperties });
  children.push({ 'w:t': [{ '#text': `{${fieldName}}` }] });
  return { 'w:r': children };
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
  confirmedSet: Map<number, string>,
  paraIndex: { value: number },
): void {
  for (const node of nodes) {
    for (const key of Object.keys(node)) {
      if (key === ':@') continue;

      if (key === 'w:p') {
        const idx = paraIndex.value++;
        const fieldName = confirmedSet.get(idx);
        if (fieldName) {
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
                  transformedChildren.push(createTagRun(fieldName, styleSample));
                  inserted = true;
                }
                continue;
              }
              transformedChildren.push(child);
              continue;
            }
            transformedChildren.push(child);
          }

          if (!inserted) {
            transformedChildren.push(createTagRun(fieldName, styleSample));
          }

          node[key] = transformedChildren;
        }
      } else {
        // Recurse into any other element that has children
        const children = node[key];
        if (Array.isArray(children)) {
          traverseAndInject(children as Array<Record<string, unknown>>, confirmedSet, paraIndex);
        }
      }
    }
  }
}
