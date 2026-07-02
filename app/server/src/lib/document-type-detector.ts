import { PDFParse } from 'pdf-parse';

export type DocumentType = 'pdf-native' | 'pdf-scanned' | 'docx';

export async function detectDocumentType(buffer: Buffer, filename: string): Promise<DocumentType> {
  if (filename.toLowerCase().endsWith('.docx')) {
    return 'docx';
  }
  if (filename.toLowerCase().endsWith('.pdf')) {
    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      // pdf-parse v2 injects a "-- N of M --" page-divider line into result.text
      // for every page, even when the page carries no real glyphs. Strip those
      // markers before deciding, otherwise a genuinely scanned (image-only) PDF
      // would be misclassified as pdf-native and skip OCR.
      const textLayer = (result.text ?? '')
        .replace(/--\s*\d+\s+of\s+\d+\s*--/g, '')
        .trim();
      if (textLayer.length > 0) {
        return 'pdf-native';
      } else {
        return 'pdf-scanned';
      }
    } catch (e) {
      console.error('[detectDocumentType] pdf-parse error:', e instanceof Error ? e.message : String(e));
      return 'pdf-scanned';
    }
  }
  throw new Error(`Unsupported file type: ${filename}`);
}
