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
          // Replace all children of this paragraph that are w:r nodes
          // with a single tag run: <w:r><w:t>{fieldName}</w:t></w:r>
          const pChildren = node[key] as Array<Record<string, unknown>>;
          const tagRun: Record<string, unknown> = {
            'w:r': [
              {
                'w:t': [
                  { '#text': `{${fieldName}}` },
                ],
              },
            ],
          };
          // Keep pPr (paragraph properties) if present, replace rest with tag run
          const newChildren: Array<Record<string, unknown>> = [];
          for (const child of pChildren) {
            if ('w:pPr' in child) {
              newChildren.push(child);
            }
          }
          newChildren.push(tagRun);
          node[key] = newChildren;
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
