import PizZip from 'pizzip';

// Add/list/swap images that live in the body (word/document.xml) of a DOCX.
// Header/footer images are intentionally excluded: they have their own rels
// parts, so filtering to document.xml.rels yields exactly the body images.

const IMAGE_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
const EMU_PER_PIXEL = 9525; // 96 dpi
const MAX_WIDTH_EMU = 5486400; // 6 inches — keep an added image within the text column

export interface BodyImage {
  target: string; // e.g. "word/media/image3.png"
  dataUrl: string;
}

interface Relationship {
  id: string;
  target: string;
  type?: string;
}

function parseRelationships(xml: string): Relationship[] {
  const rels: Relationship[] = [];
  const relRegex = /<Relationship\b([^>]*)\/>/g;
  const attrRegex = /([a-zA-Z0-9_:-]+)=(?:"([^"]*)"|'([^']*)')/g;
  for (const match of xml.matchAll(relRegex)) {
    const attrs = Object.fromEntries(
      [...(match[1] ?? '').matchAll(attrRegex)].map((m) => [m[1], m[2] ?? m[3]]),
    );
    if (attrs.Id && attrs.Target) rels.push({ id: attrs.Id, target: attrs.Target, type: attrs.Type });
  }
  return rels;
}

function normalizeMediaTarget(target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  if (target.startsWith('word/')) return target;
  return `word/${target}`.replace(/\/\.\//g, '/');
}

function imageMime(target: string): string {
  const ext = target.toLowerCase().split('.').pop();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg') return 'image/svg+xml';
  return 'image/png';
}

// List the images referenced by the document body.
export function listBodyImages(buffer: Buffer): BodyImage[] {
  const zip = new PizZip(buffer);
  const relsXml = zip.file('word/_rels/document.xml.rels')?.asText();
  if (!relsXml) return [];
  const seen = new Set<string>();
  const images: BodyImage[] = [];
  for (const rel of parseRelationships(relsXml)) {
    if (rel.type !== IMAGE_REL_TYPE) continue;
    const target = normalizeMediaTarget(rel.target);
    if (seen.has(target)) continue;
    const file = zip.file(target);
    if (!file) continue;
    seen.add(target);
    const bytes = Buffer.from(file.asUint8Array());
    images.push({ target, dataUrl: `data:${imageMime(target)};base64,${bytes.toString('base64')}` });
  }
  return images;
}

// Swap the bytes of an existing body image in place.
export function replaceBodyImage(buffer: Buffer, target: string, content: Buffer): Buffer {
  if (!target.startsWith('word/media/') || target.includes('..')) {
    throw new Error('invalid_target');
  }
  const zip = new PizZip(buffer);
  if (!zip.file(target)) throw new Error('image_not_found');
  zip.file(target, content);
  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

function extFromContentType(contentType: string): 'png' | 'jpeg' | 'gif' {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpeg';
  if (contentType.includes('gif')) return 'gif';
  return 'png';
}

// Best-effort intrinsic dimensions so the inserted image keeps its aspect ratio.
export function readImageSize(content: Buffer): { width: number; height: number } {
  // PNG: IHDR width/height are big-endian uint32 at offsets 16/20.
  if (content.length >= 24 && content[0] === 0x89 && content[1] === 0x50) {
    return { width: content.readUInt32BE(16), height: content.readUInt32BE(20) };
  }
  // GIF: logical screen width/height are little-endian uint16 at offsets 6/8.
  if (content.length >= 10 && content[0] === 0x47 && content[1] === 0x49) {
    return { width: content.readUInt16LE(6), height: content.readUInt16LE(8) };
  }
  // JPEG: scan segments for a Start-Of-Frame marker carrying the dimensions.
  if (content.length >= 4 && content[0] === 0xff && content[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < content.length) {
      if (content[offset] !== 0xff) { offset++; continue; }
      const marker = content[offset + 1] ?? 0;
      const isSof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
      if (isSof) {
        return { height: content.readUInt16BE(offset + 5), width: content.readUInt16BE(offset + 7) };
      }
      const segLen = content.readUInt16BE(offset + 2);
      offset += 2 + segLen;
    }
  }
  return { width: 400, height: 300 };
}

function scaledExtent(content: Buffer): { cx: number; cy: number } {
  const { width, height } = readImageSize(content);
  const w = width > 0 ? width : 400;
  const h = height > 0 ? height : 300;
  let cx = w * EMU_PER_PIXEL;
  let cy = h * EMU_PER_PIXEL;
  if (cx > MAX_WIDTH_EMU) {
    cy = Math.round(cy * (MAX_WIDTH_EMU / cx));
    cx = MAX_WIDTH_EMU;
  }
  return { cx, cy };
}

function nextMediaName(zip: PizZip, ext: string): string {
  let n = 1;
  while (zip.file(`word/media/added-image-${n}.${ext}`)) n++;
  return `word/media/added-image-${n}.${ext}`;
}

function nextRelId(relsXml: string): string {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  return `rId${max + 1}`;
}

function nextDrawingId(documentXml: string): number {
  const ids = [...documentXml.matchAll(/(?:wp:docPr|pic:cNvPr)\s+id="(\d+)"/g)].map((m) => Number(m[1]));
  return (ids.length > 0 ? Math.max(...ids) : 0) + 1;
}

function ensureContentTypeDefault(zip: PizZip, ext: string): void {
  const path = '[Content_Types].xml';
  const xml = zip.file(path)?.asText();
  if (!xml) return;
  if (new RegExp(`Extension="${ext}"`, 'i').test(xml)) return;
  const def = `<Default Extension="${ext}" ContentType="${imageMime(`x.${ext}`)}"/>`;
  zip.file(path, xml.replace(/<Types(\b[^>]*)>/, `<Types$1>${def}`));
}

function drawingParagraph(relId: string, cx: number, cy: number, drawingId: number): string {
  return (
    '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing>' +
    `<wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
    `<wp:docPr id="${drawingId}" name="Added Image ${drawingId}"/>` +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    `<pic:nvPicPr><pic:cNvPr id="${drawingId}" name="Added Image ${drawingId}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    '</pic:pic></a:graphicData></a:graphic>' +
    '</wp:inline></w:drawing></w:r></w:p>'
  );
}

// Append a centered image paragraph to the end of the body (before the trailing
// section properties, which must remain the final child of <w:body>).
export function addBodyImage(buffer: Buffer, content: Buffer, contentType: string): Buffer {
  const zip = new PizZip(buffer);
  const documentXml = zip.file('word/document.xml')?.asText();
  if (!documentXml) throw new Error('document_not_found');
  const relsPath = 'word/_rels/document.xml.rels';
  let relsXml = zip.file(relsPath)?.asText();
  if (!relsXml) {
    relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  }

  const ext = extFromContentType(contentType);
  const mediaPath = nextMediaName(zip, ext);
  zip.file(mediaPath, content);
  ensureContentTypeDefault(zip, ext);

  const relId = nextRelId(relsXml);
  const relTarget = mediaPath.replace(/^word\//, '');
  const newRel = `<Relationship Id="${relId}" Type="${IMAGE_REL_TYPE}" Target="${relTarget}"/>`;
  zip.file(relsPath, relsXml.replace(/<\/Relationships>\s*$/, `${newRel}</Relationships>`));

  const { cx, cy } = scaledExtent(content);
  const paragraph = drawingParagraph(relId, cx, cy, nextDrawingId(documentXml));

  // Insert before the last <w:sectPr …> (final section props) when present,
  // otherwise just before </w:body>.
  const sectIdx = documentXml.lastIndexOf('<w:sectPr');
  const updatedDoc = sectIdx >= 0
    ? documentXml.slice(0, sectIdx) + paragraph + documentXml.slice(sectIdx)
    : documentXml.replace(/<\/w:body>/, `${paragraph}</w:body>`);
  zip.file('word/document.xml', updatedDoc);

  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}
