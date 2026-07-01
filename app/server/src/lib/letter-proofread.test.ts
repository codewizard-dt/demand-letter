import { describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import { extractBodyParagraphs, applyProofreadEdits, parseProofreadEdits } from './letter-proofread';

function docx(paragraphs: string[]): Buffer {
  const body = paragraphs.map((t) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`).join('');
  const zip = new PizZip();
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`,
  );
  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

describe('letter-proofread', () => {
  it('extracts body paragraphs with stable indices', () => {
    const buf = docx(['First paragraph.', 'Second paragraph.', 'Third.']);
    expect(extractBodyParagraphs(buf)).toEqual([
      { index: 0, text: 'First paragraph.' },
      { index: 1, text: 'Second paragraph.' },
      { index: 2, text: 'Third.' },
    ]);
  });

  it('deletes a detached-fragment paragraph and rewrites another', () => {
    const buf = docx([
      'Only releases the settling parties from any and all liability.',
      'executors, and administrators, and not third-parties or other persons, entities, or',
      'parties, including any insurance carrier or attorneys.',
    ]);

    const out = applyProofreadEdits(buf, [
      { index: 0, action: 'rewrite', text: 'Only releases the settling parties, their executors and administrators, and not third parties, from any and all liability.' },
      { index: 1, action: 'delete' },
      { index: 2, action: 'delete' },
    ]);

    const remaining = extractBodyParagraphs(out);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.text).toBe(
      'Only releases the settling parties, their executors and administrators, and not third parties, from any and all liability.',
    );
  });

  it('parses edits from arrays and from stringified JSON (Bedrock quirk)', () => {
    expect(parseProofreadEdits({ delete: [1, 3], fix: [{ index: 2, text: 'ok' }] })).toEqual([
      { index: 1, action: 'delete' },
      { index: 3, action: 'delete' },
      { index: 2, action: 'rewrite', text: 'ok' },
    ]);
    expect(parseProofreadEdits({ delete: '[4, 5]', fix: '[]' })).toEqual([
      { index: 4, action: 'delete' },
      { index: 5, action: 'delete' },
    ]);
    expect(parseProofreadEdits({})).toEqual([]);
    expect(parseProofreadEdits({ delete: 'garbage', fix: null })).toEqual([]);
  });

  it('leaves the document unchanged when there are no edits', () => {
    const buf = docx(['A.', 'B.']);
    const out = applyProofreadEdits(buf, []);
    expect(extractBodyParagraphs(out)).toHaveLength(2);
  });

  it('preserves paragraph formatting (rPr) on rewrite', () => {
    const zip = new PizZip();
    zip.file(
      'word/document.xml',
      `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
        `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>bold text here</w:t></w:r></w:p></w:body></w:document>`,
    );
    const buf = Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
    const out = applyProofreadEdits(buf, [{ index: 0, action: 'rewrite', text: 'corrected bold text' }]);
    const xml = new PizZip(out).file('word/document.xml')?.asText() ?? '';
    expect(xml).toContain('<w:b');
    expect(xml).toContain('corrected bold text');
  });
});
