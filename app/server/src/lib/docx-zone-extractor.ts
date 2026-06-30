import PizZip from 'pizzip';
import { XMLParser } from 'fast-xml-parser';
import { repairMissingSpaces } from './text-normalization';

const PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['w:p', 'w:r', 'w:t', 'w:body', 'w:document'].includes(name),
  preserveOrder: true,
});

export interface ParagraphZone {
  zoneIndex: number;
  textContent: string;
  runPath: {
    source?: {
      part: 'header' | 'body' | 'footer';
      path: string;
      variant?: 'default' | 'first' | 'even';
    };
    paragraph: {
      style?: string;
      alignment?: 'left' | 'center' | 'right' | 'both';
    };
    runs: Array<{
      runIndex: number;
      text: string;
      bold: boolean;
      italic: boolean;
      underline: boolean;
      font?: string;
      fontSize?: number;
      hasImage: boolean;
      images?: Array<EmbeddedImage>;
    }>;
    images?: Array<EmbeddedImage>;
  };
}

interface EmbeddedImage {
  relId: string;
  target: string;
  dataUrl: string;
}

interface Relationship {
  id: string;
  target: string;
  type?: string;
}

interface ExtractContext {
  zip: PizZip;
  source: NonNullable<ParagraphZone['runPath']['source']>;
  relationships: Record<string, Relationship>;
}

function attrs(node: Record<string, unknown>): Record<string, string> {
  return (node[':@'] as Record<string, string> | undefined) ?? {};
}

function firstElement(nodes: Array<Record<string, unknown>>, name: string): Record<string, unknown> | undefined {
  return nodes.find((node) => name in node);
}

function attrValue(node: Record<string, unknown> | undefined, name: string): string | undefined {
  return node ? attrs(node)[`@_${name}`] : undefined;
}

function extractParagraphFormatting(nodes: Array<Record<string, unknown>>): ParagraphZone['runPath']['paragraph'] {
  const pPr = firstElement(nodes, 'w:pPr')?.['w:pPr'];
  if (!Array.isArray(pPr)) return {};
  const pStyle = firstElement(pPr as Array<Record<string, unknown>>, 'w:pStyle');
  const jc = firstElement(pPr as Array<Record<string, unknown>>, 'w:jc');
  const alignment = attrValue(jc, 'w:val');
  return {
    style: attrValue(pStyle, 'w:val'),
    alignment: alignment === 'center' || alignment === 'right' || alignment === 'both' ? alignment : undefined,
  };
}

function hasElement(nodes: Array<Record<string, unknown>>, name: string): boolean {
  return nodes.some((node) => name in node);
}

function hasImage(nodes: Array<Record<string, unknown>>): boolean {
  return nodes.some((node) => {
    if ('w:drawing' in node || 'w:pict' in node || 'v:imagedata' in node) return true;
    return Object.values(node).some((value) => Array.isArray(value) && hasImage(value as Array<Record<string, unknown>>));
  });
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
    relationships[id] = { id, target, type: attrMap.Type };
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

function imageMime(target: string): string {
  const ext = target.toLowerCase().split('.').pop();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg') return 'image/svg+xml';
  return 'image/png';
}

function collectImageRelationshipIds(nodes: Array<Record<string, unknown>>, ids = new Set<string>()): Set<string> {
  for (const node of nodes) {
    const nodeAttrs = attrs(node);
    const relId = nodeAttrs['@_r:embed'] ?? nodeAttrs['@_r:id'];
    if (relId) ids.add(relId);
    for (const key of Object.keys(node)) {
      if (key === ':@') continue;
      const children = node[key];
      if (Array.isArray(children)) {
        collectImageRelationshipIds(children as Array<Record<string, unknown>>, ids);
      }
    }
  }
  return ids;
}

function resolveImages(nodes: Array<Record<string, unknown>>, context: ExtractContext): EmbeddedImage[] {
  const images: EmbeddedImage[] = [];
  for (const relId of collectImageRelationshipIds(nodes)) {
    const rel = context.relationships[relId];
    if (!rel || rel.type?.includes('/image') !== true) continue;
    const imagePath = normalizeTarget(context.source.path, rel.target);
    const image = context.zip.file(imagePath);
    if (!image) continue;
    const buffer = Buffer.from(image.asUint8Array());
    images.push({
      relId,
      target: imagePath,
      dataUrl: `data:${imageMime(imagePath)};base64,${buffer.toString('base64')}`,
    });
  }
  return images;
}

function extractRunFormatting(
  runChildren: Array<Record<string, unknown>>,
  runIndex: number,
  context: ExtractContext,
): ParagraphZone['runPath']['runs'][number] {
  const rPr = firstElement(runChildren, 'w:rPr')?.['w:rPr'];
  const rPrNodes = Array.isArray(rPr) ? rPr as Array<Record<string, unknown>> : [];
  const fonts = firstElement(rPrNodes, 'w:rFonts');
  const size = firstElement(rPrNodes, 'w:sz');
  const images = resolveImages(runChildren, context);
  return {
    runIndex,
    text: extractText(runChildren),
    bold: hasElement(rPrNodes, 'w:b'),
    italic: hasElement(rPrNodes, 'w:i'),
    underline: hasElement(rPrNodes, 'w:u'),
    font: attrValue(fonts, 'w:ascii') ?? attrValue(fonts, 'w:hAnsi'),
    fontSize: attrValue(size, 'w:val') ? Number(attrValue(size, 'w:val')) / 2 : undefined,
    hasImage: images.length > 0 || hasImage(runChildren),
    images,
  };
}

function extractRuns(nodes: Array<Record<string, unknown>>, context: ExtractContext): ParagraphZone['runPath']['runs'] {
  let runIndex = 0;
  const runs: ParagraphZone['runPath']['runs'] = [];
  for (const node of nodes) {
    if ('w:r' in node && Array.isArray(node['w:r'])) {
      runs.push(extractRunFormatting(node['w:r'] as Array<Record<string, unknown>>, runIndex++, context));
    }
  }
  return runs;
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
  return repairMissingSpaces(parts.join(''));
}

function traverseExtract(
  nodes: Array<Record<string, unknown>>,
  paraIndex: { value: number },
  zones: ParagraphZone[],
  context: ExtractContext,
): void {
  for (const node of nodes) {
    for (const key of Object.keys(node)) {
      if (key === ':@') continue;
      if (key === 'w:p') {
        const idx = paraIndex.value++;
        const children = node[key] as Array<Record<string, unknown>>;
        const text = extractText(children).trim();
        const images = resolveImages(children, context);
        zones.push({
          zoneIndex: idx,
          textContent: text || (images.length > 0 ? `${context.source.part === 'header' ? 'Header' : 'Document'} image` : ''),
          runPath: {
            source: context.source,
            paragraph: extractParagraphFormatting(children),
            runs: extractRuns(children, context),
            images,
          },
        });
      } else {
        const children = node[key];
        if (Array.isArray(children)) {
          traverseExtract(children as Array<Record<string, unknown>>, paraIndex, zones, context);
        }
      }
    }
  }
}

function relationshipPathForXml(path: string): string {
  return path.replace(/^word\//, 'word/_rels/').replace(/\.xml$/, '.xml.rels');
}

function referencedPartPaths(
  documentXml: string,
  documentRels: Record<string, Relationship>,
  slot: 'header' | 'footer',
): Array<{ path: string; variant: 'default' | 'first' | 'even' }> {
  const results: Array<{ path: string; variant: 'default' | 'first' | 'even' }> = [];
  const pattern = new RegExp(`<w:${slot}Reference\\b([^>]*)/>`, 'g');
  for (const match of documentXml.matchAll(pattern)) {
    const attrs = match[1] ?? '';
    const relId = /r:id=("|')([^"']*)(\1)/.exec(attrs)?.[2];
    if (!relId) continue;
    const rel = documentRels[relId];
    if (!rel) continue;
    const path = normalizeTarget('word/document.xml', rel.target);
    const rawType = /w:type=("|')([^"']*)(\1)/.exec(attrs)?.[2];
    const variant: 'default' | 'first' | 'even' =
      rawType === 'first' ? 'first' : rawType === 'even' ? 'even' : 'default';
    if (!results.find((r) => r.path === path && r.variant === variant)) {
      results.push({ path, variant });
    }
  }
  return results;
}

function extractPartZones(
  zip: PizZip,
  path: string,
  part: 'header' | 'body' | 'footer',
  paraIndex: { value: number },
  zones: ParagraphZone[],
  variant?: 'default' | 'first' | 'even',
): void {
  const xml = zip.file(path)?.asText();
  if (!xml) return;
  const parsed = PARSER.parse(xml) as Array<Record<string, unknown>>;
  const relationships = parseRelationships(zip.file(relationshipPathForXml(path))?.asText() ?? '');
  traverseExtract(parsed, paraIndex, zones, {
    zip,
    source: { part, path, ...(variant !== undefined ? { variant } : {}) },
    relationships,
  });
}

export function extractParagraphZones(buffer: Buffer): ParagraphZone[] {
  const zip = new PizZip(buffer);
  const docXml = zip.file('word/document.xml')?.asText();
  if (!docXml) throw new Error('word/document.xml not found');
  const zones: ParagraphZone[] = [];
  const paraIndex = { value: 0 };
  const documentRels = parseRelationships(zip.file('word/_rels/document.xml.rels')?.asText() ?? '');
  for (const { path, variant } of referencedPartPaths(docXml, documentRels, 'header')) {
    extractPartZones(zip, path, 'header', paraIndex, zones, variant);
  }
  extractPartZones(zip, 'word/document.xml', 'body', paraIndex, zones);
  for (const { path, variant } of referencedPartPaths(docXml, documentRels, 'footer')) {
    extractPartZones(zip, path, 'footer', paraIndex, zones, variant);
  }
  return zones;
}
