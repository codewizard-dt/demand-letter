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
      // Check if PDF has text layer: if text content is non-empty, it's native
      if (result.text && result.text.trim().length > 0) {
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
