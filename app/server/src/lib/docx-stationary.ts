import { Buffer } from 'buffer';
import PizZip from 'pizzip';

export interface DocxStationary {
  slot: 'header' | 'footer';
  variant: 'default' | 'first' | 'even';
  text: string;
  imageDataUrl?: string;
  imageWidthPx?: number;
  imageHeightPx?: number;
}

const HEADER_FOOTER_SECTION_TYPES = ['default', 'first', 'even'] as const;

interface SectionReferences {
  default: string | undefined;
  first: string | undefined;
  even: string | undefined;
}

interface Relationship {
  id: string;
  target: string;
  type?: string;
}

function asDocumentText(zip: PizZip, path: string): string | undefined {
  return zip.file(path)?.asText();
}

function asArrayBuffer(zip: PizZip, path: string): Buffer | undefined {
  const image = zip.file(path);
  if (!image) return undefined;
  return Buffer.from(image.asUint8Array());
}

function normalizeTarget(target: string): string {
  const noTraversal = target.replace(/^(\.\/|\.{2}\/)+/, '').replace(/^\//, '');
  return noTraversal.startsWith('word/') ? noTraversal : `word/${noTraversal}`;
}

function getAttrValue(xml: string, name: string): string | undefined {
  const regex = new RegExp(`${name}=("|')([^"']*)\\1`);
  const match = regex.exec(xml);
  return match?.[2];
}

function parseXmlReferences(xml: string, slot: 'header' | 'footer'): SectionReferences {
  const refs: SectionReferences = {
    default: undefined,
    first: undefined,
    even: undefined,
  };

  const sectPrs = [...xml.matchAll(/<w:sectPr\b[^>]*>([\s\S]*?)<\/w:sectPr>/g)];
  const sectionXml = sectPrs.length > 0 ? sectPrs[sectPrs.length - 1]?.[0] : xml;

  const pattern = new RegExp(`<w:${slot}Reference\\b([^>]*)/>`, 'g');
  for (const match of sectionXml.matchAll(pattern)) {
    const attrs = match[1] ?? '';
    const slotType = getAttrValue(attrs, 'w:type');
    const relId = getAttrValue(attrs, 'r:id');
    if (!slotType || !relId) continue;
    if (slotType !== 'default' && slotType !== 'first' && slotType !== 'even') continue;
    refs[slotType] = relId;
  }

  return refs;
}

function parseRelationships(xml: string): Record<string, Relationship> {
  const relationships: Record<string, Relationship> = {};
  const relRegex = /<Relationship\b([^>]*)\/>/g;
  const attrsRegex = /([a-zA-Z0-9_:-]+)=(?:"([^"]*)"|'([^']*)')/g;

  for (const relMatch of xml.matchAll(relRegex)) {
    const attrs = relMatch[1] ?? '';
    const attrsMap = Object.fromEntries([...attrs.matchAll(attrsRegex)].map((m) => [m[1], m[2] ?? m[3]]));
    const id = attrsMap.Id;
    const target = attrsMap.Target;
    if (!id || !target) continue;
    relationships[id] = {
      id,
      target,
      type: attrsMap.Type,
    };
  }

  return relationships;
}

function decodeXmlText(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractTextFromXml(xml: string): string {
  const withoutTabs = xml.replace(/<w:tab\/?>/g, ' ');
  const paragraphs: string[] = [];
  const seen = new Set<string>();
  const paraRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;

  for (const paraMatch of withoutTabs.matchAll(paraRegex)) {
    const paraBody = paraMatch[1] ?? '';
    const textChunks = [...paraBody.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => decodeXmlText(m[1] ?? ''));
    const text = textChunks.join('');
    const trimmed = text.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      paragraphs.push(text);
    }
  }

  return paragraphs.join('\n');
}

function extractImageSizeFromDrawingXml(xml: string, fromIndex: number): { widthPx: number; heightPx: number } | undefined {
  const before = xml.slice(0, fromIndex);
  const extentMatches = [
    ...before.matchAll(/<wp:extent\s+[^>]*cx=("|')(\d+)\1[^>]*cy=("|')(\d+)\3[^>]*>/g),
    ...before.matchAll(/<a:ext\s+[^>]*cx=("|')(\d+)\1[^>]*cy=("|')(\d+)\3[^>]*>/g),
  ];
  const match = extentMatches.at(-1);
  if (!match) return undefined;
  return {
    widthPx: Math.round(Number.parseInt(match[2], 10) / 914400 * 96),
    heightPx: Math.round(Number.parseInt(match[4], 10) / 914400 * 96),
  };
}

function buildImageDataUrl(buffer: Buffer, target: string): string {
  const lowered = target.toLowerCase();
  const ext = lowered.split('.').pop() ?? '';
  const mime = ext === 'png'
    ? 'image/png'
    : ext === 'jpg' || ext === 'jpeg'
      ? 'image/jpeg'
      : ext === 'gif'
        ? 'image/gif'
        : ext === 'svg'
          ? 'image/svg+xml'
          : 'image/png';

  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function createStationaryAsset(
  zip: PizZip,
  xml: string,
  rels: Record<string, Relationship>,
  slot: 'header' | 'footer',
  variant: 'default' | 'first' | 'even',
): DocxStationary | undefined {
  const text = extractTextFromXml(xml);
  const usedImageRels = new Set<string>();
  let imageDataUrl: string | undefined;
  let imageWidthPx: number | undefined;
  let imageHeightPx: number | undefined;

  const drawingRefs = [
    ...xml.matchAll(/<a:blip\b[^>]*r:embed=("|')(rId\d+)\1[^>]*>/g),
    ...xml.matchAll(/<v:imagedata\b[^>]*r:id=("|')(rId\d+)\1[^>]*>/g),
  ];

  for (const match of drawingRefs) {
    const relId = match[2];
    if (!relId || usedImageRels.has(relId)) continue;
    usedImageRels.add(relId);
    const rel = rels[relId];
    if (!rel || rel.type?.includes('/image') !== true) continue;
    const imagePath = normalizeTarget(rel.target);
    const imageBuffer = asArrayBuffer(zip, imagePath);
    if (!imageBuffer) continue;

    imageDataUrl = buildImageDataUrl(imageBuffer, rel.target);
    const size = extractImageSizeFromDrawingXml(xml, match.index ?? 0);
    imageWidthPx = size?.widthPx;
    imageHeightPx = size?.heightPx;
    break;
  }

  if (!imageDataUrl && text.trim().length === 0) return undefined;

  return {
    slot,
    variant,
    text: text.trim(),
    imageDataUrl,
    imageWidthPx,
    imageHeightPx,
  };
}

export function extractDocxStationaries(buffer: Buffer): DocxStationary[] {
  try {
    const zip = new PizZip(buffer);
    const documentXml = asDocumentText(zip, 'word/document.xml');
    if (!documentXml) return [];

    const relationshipsXml = asDocumentText(zip, 'word/_rels/document.xml.rels') ?? '';
    const documentRels = parseRelationships(relationshipsXml);
    const refs = {
      header: parseXmlReferences(documentXml, 'header'),
      footer: parseXmlReferences(documentXml, 'footer'),
    };

    const stationaries: DocxStationary[] = [];

    (['default', 'first', 'even'] as const).forEach((variant) => {
      const headerRelId = refs.header[variant];
      if (headerRelId) {
        const headerRel = documentRels[headerRelId];
        if (headerRel) {
          const headerPath = normalizeTarget(headerRel.target);
          const headerRelPath = headerPath.replace(/^word\//, 'word/_rels/').replace(/\.xml$/, '.xml.rels');
          const headerXml = asDocumentText(zip, headerPath);
          const headerRelXml = asDocumentText(zip, headerRelPath) ?? '';
          if (headerXml) {
            const headerRelMap = parseRelationships(headerRelXml);
            const stationary = createStationaryAsset(zip, headerXml, headerRelMap, 'header', variant);
            if (stationary) stationaries.push(stationary);
          }
        }
      }

      const footerRelId = refs.footer[variant];
      if (footerRelId) {
        const footerRel = documentRels[footerRelId];
        if (footerRel) {
          const footerPath = normalizeTarget(footerRel.target);
          const footerRelPath = footerPath.replace(/^word\//, 'word/_rels/').replace(/\.xml$/, '.xml.rels');
          const footerXml = asDocumentText(zip, footerPath);
          const footerRelXml = asDocumentText(zip, footerRelPath) ?? '';
          if (footerXml) {
            const footerRelMap = parseRelationships(footerRelXml);
            const stationary = createStationaryAsset(zip, footerXml, footerRelMap, 'footer', variant);
            if (stationary) stationaries.push(stationary);
          }
        }
      }
    });

    return stationaries;
  } catch {
    return [];
  }
}

export function pickStationary(
  stationaries: DocxStationary[] | undefined,
  slot: 'header' | 'footer',
): DocxStationary | undefined {
  if (!stationaries) return undefined;
  for (const variant of HEADER_FOOTER_SECTION_TYPES) {
    const found = stationaries.find((item) => item.slot === slot && item.variant === variant);
    if (found) return found;
  }
  return stationaries.find((item) => item.slot === slot);
}
