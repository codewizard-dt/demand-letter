import mammoth from 'mammoth';
import { normalizeExtractedText } from './text-normalization';

export interface ParsedBlock {
  type: string;
  text: string;
  page: number;
  confidence?: number;
  bbox?: { left: number; top: number; width: number; height: number };
}

export async function parsePdfNative(buffer: Buffer): Promise<ParsedBlock[]> {
  // Dynamically import pdf-parse v2 class-based API (ESM build exports named PDFParse, not default)
  const { PDFParse } = await import('pdf-parse') as any;
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  const blocks: ParsedBlock[] = [];

  // result.text is the full text; result.pages is an array of page objects
  if (result.pages && Array.isArray(result.pages)) {
    result.pages.forEach((pageData: any, pageIdx: number) => {
      const pageNum = pageIdx + 1;
      const pageText: string = pageData.text || '';
      // Split by newlines to create line-level blocks
      pageText.split('\n').forEach((line: string) => {
        const trimmed = normalizeExtractedText(line);
        if (trimmed) {
          blocks.push({
            type: 'LINE',
            text: trimmed,
            page: pageNum,
            confidence: 0.95,
            bbox: { left: 0, top: 0, width: 0, height: 0 },
          });
        }
      });
    });
  } else if (result.text) {
    // Fallback: treat the full text as a single page
    result.text.split('\n').forEach((line: string) => {
      const trimmed = normalizeExtractedText(line);
      if (trimmed) {
        blocks.push({
          type: 'LINE',
          text: trimmed,
          page: 1,
          confidence: 0.95,
          bbox: { left: 0, top: 0, width: 0, height: 0 },
        });
      }
    });
  }

  return blocks;
}

export async function parseDocx(buffer: Buffer): Promise<ParsedBlock[]> {
  const { value: text } = await mammoth.extractRawText({ buffer });
  const blocks: ParsedBlock[] = [];
  // DOCX doesn't have page boundaries; treat as single page
  text.split('\n').forEach((line: string) => {
    const trimmed = normalizeExtractedText(line);
    if (trimmed) {
      blocks.push({
        type: 'PARAGRAPH',
        text: trimmed,
        page: 1,
        confidence: 0.99,
        bbox: { left: 0, top: 0, width: 0, height: 0 },
      });
    }
  });
  return blocks;
}
