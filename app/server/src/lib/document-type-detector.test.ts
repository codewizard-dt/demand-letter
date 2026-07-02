import { describe, expect, it } from 'vitest';
import { detectDocumentType } from './document-type-detector';

/** Assemble a minimal, structurally valid PDF from raw object bodies, computing
 *  a correct xref table so pdf-parse parses it cleanly (no mocks). */
function buildPdf(objects: string[]): Buffer {
  const header = '%PDF-1.4\n';
  let body = header;
  const offsets: number[] = [];
  objects.forEach((content, i) => {
    offsets.push(Buffer.byteLength(body, 'latin1'));
    body += `${i + 1} 0 obj\n${content}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(body, 'latin1');
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  const trailer = `trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, 'latin1');
}

/** A single-page PDF whose only content stream draws a filled rectangle — no
 *  text operators, i.e. an "image-only"/scanned-style page with no text layer. */
function scannedStylePdf(): Buffer {
  const stream = '0 0 0 rg\n100 100 200 200 re\nf\n';
  return buildPdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
  ]);
}

/** A single-page PDF with a real text run ("Hello Claim") — a native text layer. */
function nativeTextPdf(): Buffer {
  const stream = 'BT /F1 24 Tf 72 700 Td (Hello Claim) Tj ET\n';
  return buildPdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]);
}

describe('detectDocumentType', () => {
  it('classifies a .docx filename as docx (extension-only, buffer ignored)', async () => {
    await expect(detectDocumentType(Buffer.from('arbitrary bytes'), 'medical_records.docx')).resolves.toBe(
      'docx',
    );
  });

  it('classifies a PDF with a real text layer as pdf-native', async () => {
    await expect(detectDocumentType(nativeTextPdf(), 'letter.pdf')).resolves.toBe('pdf-native');
  });

  it('classifies a text-less (scanned-style) PDF as pdf-scanned', async () => {
    // Regression guard: pdf-parse v2 injects a "-- N of M --" page divider into
    // result.text for every page. Without stripping it, this page would be
    // misclassified pdf-native even though it has no glyph text.
    await expect(detectDocumentType(scannedStylePdf(), 'police_report.pdf')).resolves.toBe('pdf-scanned');
  });

  it('throws on an unsupported file extension', async () => {
    await expect(detectDocumentType(Buffer.from('x'), 'notes.txt')).rejects.toThrow('Unsupported file type');
  });
});
