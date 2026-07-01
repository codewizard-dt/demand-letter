import { describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import { extractParagraphZones } from './docx-zone-extractor';

function bodyDocx(paragraphs: string[]): Buffer {
  const body = paragraphs.map((t) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`).join('');
  const zip = new PizZip();
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>${body}</w:body>
</w:document>`,
  );
  zip.file('word/_rels/document.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');
  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

describe('extractParagraphZones — mid-sentence merge', () => {
  it('merges a sentence hard-broken across two body paragraphs into one zone', () => {
    const input = bodyDocx([
      'The settlement checks or drafts must be made payable to only our client, Stalwart Law ',
      'Group and no other person or entity, unless we give you written permission before expiration.',
    ]);

    const zones = extractParagraphZones(input);

    expect(zones).toHaveLength(1);
    expect(zones[0]?.textContent).toBe(
      'The settlement checks or drafts must be made payable to only our client, Stalwart Law Group and no other person or entity, unless we give you written permission before expiration.',
    );
    expect(zones[0]?.runPath.paragraphSpan).toBe(2);
    expect(zones[0]?.zoneIndex).toBe(0);
  });

  it('does not merge when the first paragraph ends with terminal punctuation', () => {
    const input = bodyDocx([
      'This paragraph is a complete sentence on its own here.',
      'This is a separate following sentence that stands alone.',
    ]);

    const zones = extractParagraphZones(input);

    expect(zones).toHaveLength(2);
    expect(zones[0]?.runPath.paragraphSpan ?? 1).toBe(1);
  });

  it('does not merge short label-like paragraphs (e.g. address lines)', () => {
    const input = bodyDocx(['P.O. Box 25210', 'Santa Ana, CA 92799']);

    const zones = extractParagraphZones(input);

    expect(zones).toHaveLength(2);
  });
});
