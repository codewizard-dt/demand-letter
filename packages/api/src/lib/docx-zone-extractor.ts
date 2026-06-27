import PizZip from 'pizzip';
import { XMLParser } from 'fast-xml-parser';

const PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['w:p', 'w:r', 'w:t', 'w:body', 'w:document'].includes(name),
  preserveOrder: true,
});

export interface ParagraphZone {
  zoneIndex: number;
  textContent: string;
}

function extractText(nodes: Array<Record<string, unknown>>): string {
  const parts: string[] = [];
  for (const node of nodes) {
    for (const key of Object.keys(node)) {
      if (key === ':@') continue;
      if (key === 'w:t') {
        const children = node[key] as Array<Record<string, unknown>>;
        for (const child of children) {
          if ('#text' in child) parts.push(String(child['#text']));
        }
      } else {
        const children = node[key];
        if (Array.isArray(children)) {
          parts.push(extractText(children as Array<Record<string, unknown>>));
        }
      }
    }
  }
  return parts.join('');
}

function traverseExtract(
  nodes: Array<Record<string, unknown>>,
  paraIndex: { value: number },
  zones: ParagraphZone[],
): void {
  for (const node of nodes) {
    for (const key of Object.keys(node)) {
      if (key === ':@') continue;
      if (key === 'w:p') {
        const idx = paraIndex.value++;
        const children = node[key] as Array<Record<string, unknown>>;
        const text = extractText(children).trim();
        zones.push({ zoneIndex: idx, textContent: text });
      } else {
        const children = node[key];
        if (Array.isArray(children)) {
          traverseExtract(children as Array<Record<string, unknown>>, paraIndex, zones);
        }
      }
    }
  }
}

export function extractParagraphZones(buffer: Buffer): ParagraphZone[] {
  const zip = new PizZip(buffer);
  const docXml = zip.file('word/document.xml')?.asText();
  if (!docXml) throw new Error('word/document.xml not found');
  const parsed = PARSER.parse(docXml) as Array<Record<string, unknown>>;
  const zones: ParagraphZone[] = [];
  traverseExtract(parsed, { value: 0 }, zones);
  return zones;
}
