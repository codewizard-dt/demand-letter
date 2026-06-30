import PizZip from 'pizzip';
import { XMLParser } from 'fast-xml-parser';
import { OoxmlZone, OoxmlRun } from './docx-types';
import { repairMissingSpaces } from './text-normalization';

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['w:p', 'w:r'].includes(name),
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

      return { runIndex, runPath: { paragraphIndex: zoneIndex, runIndex }, text, bold, italic, font, fontSize };
    });

    const textContent = repairMissingSpaces(runs.map((r) => r.text).join(''));
    return { zoneIndex, paragraphStyle: pStyle, runs, textContent };
  });
}

export function parseDocxHeaderFooter(buffer: Buffer): string {
  const zip = new PizZip(buffer);
  const parts: string[] = [];

  for (const filename of Object.keys(zip.files)) {
    if (!/^word\/(header|footer)\d*\.xml$/.test(filename)) continue;
    const xml = zip.file(filename)?.asText();
    if (!xml) continue;
    const parsed = XML_PARSER.parse(xml);
    const hdrFtr =
      parsed['w:hdr'] ?? parsed['w:ftr'] ??
      parsed['w:header'] ?? parsed['w:footer'];
    if (!hdrFtr) continue;

    const paragraphs: unknown[] = Array.isArray(hdrFtr['w:p'])
      ? hdrFtr['w:p']
      : hdrFtr['w:p']
      ? [hdrFtr['w:p']]
      : [];

    for (const para of paragraphs) {
      const p = para as Record<string, unknown>;
      const rawRuns: unknown[] = Array.isArray(p['w:r'])
        ? p['w:r']
        : p['w:r']
        ? [p['w:r']]
        : [];
      const line = rawRuns
        .map((run) => {
          const r = run as Record<string, unknown>;
          const tNode = r['w:t'];
          return typeof tNode === 'string'
            ? tNode
            : (tNode as Record<string, unknown> | undefined)?.['#text'] as string ?? '';
        })
        .join('');
      if (line.trim()) parts.push(line.trim());
    }
  }

  return parts.join('\n');
}
