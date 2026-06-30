import { describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import { injectDelimiters } from './docx-injector';
import { enumerateSlots, enumerateSlotsWithContext } from './docx-inspect';

function createDocx(parts: Record<string, string>): Buffer {
  const zip = new PizZip();
  for (const [path, content] of Object.entries(parts)) {
    zip.file(path, content);
  }
  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

function bodyDocumentXml(paragraphText: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:t>${paragraphText}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
}

describe('DOCX system fields', () => {
  it('injects pageNumber and pageCount as Word field codes instead of docxtemplater tags', () => {
    const input = createDocx({
      'word/document.xml': bodyDocumentXml('Page 2 of 9'),
    });

    const output = injectDelimiters(input, [{
      zoneIndex: 0,
      suggestedFieldName: 'pageCount',
      templateText: 'Page {pageNumber} of {pageCount}',
    }]);
    const xml = new PizZip(output).file('word/document.xml')?.asText() ?? '';

    expect(xml).toContain('<w:instrText xml:space="preserve"> PAGE </w:instrText>');
    expect(xml).toContain('<w:instrText xml:space="preserve"> NUMPAGES </w:instrText>');
    expect(xml).not.toContain('{pageNumber}');
    expect(xml).not.toContain('{pageCount}');
    expect(xml).toContain('<w:t>Page </w:t>');
    expect(xml).toContain('<w:t> of </w:t>');
  });

  it('still injects regular template variables as docxtemplater tags', () => {
    const input = createDocx({
      'word/document.xml': bodyDocumentXml('Claimant'),
    });

    const output = injectDelimiters(input, [{
      zoneIndex: 0,
      suggestedFieldName: 'claimantName',
    }]);
    const xml = new PizZip(output).file('word/document.xml')?.asText() ?? '';

    expect(xml).toContain('{claimantName}');
    expect(xml).not.toContain('instrText');
  });

  it('normalizes double-brace placeholders in mixed template text to docxtemplater single-brace tags', () => {
    const input = createDocx({
      'word/document.xml': bodyDocumentXml('Claimant'),
    });

    const output = injectDelimiters(input, [{
      zoneIndex: 0,
      suggestedFieldName: 'claimantName',
      templateText: 'Claimant: {{claimantName}}',
    }]);
    const xml = new PizZip(output).file('word/document.xml')?.asText() ?? '';

    expect(xml).toContain('<w:t>Claimant: </w:t>');
    expect(xml).toContain('{claimantName}');
    expect(xml).not.toContain('{{claimantName}}');
  });

  it('does not clear repeated adjacent page fields as duplicate variables', () => {
    const input = createDocx({
      'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:t>Page 1 of 9</w:t></w:r></w:p>
    <w:p><w:r><w:t>Page 2 of 9</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    });

    const output = injectDelimiters(input, [
      { zoneIndex: 0, suggestedFieldName: 'pageCount', templateText: 'Page {pageNumber} of {pageCount}' },
      { zoneIndex: 1, suggestedFieldName: 'pageCount', templateText: 'Page {pageNumber} of {pageCount}' },
    ]);
    const xml = new PizZip(output).file('word/document.xml')?.asText() ?? '';

    expect(xml.match(/NUMPAGES/g)).toHaveLength(2);
    expect(xml.match(/PAGE/g)).toHaveLength(4);
  });

  it('excludes reserved page fields from template slot enumeration', () => {
    const input = createDocx({
      'word/document.xml': bodyDocumentXml('{claimantName} Page {pageNumber} of {pageCount}'),
    });

    expect(enumerateSlots(input)).toEqual(['claimantName']);
    expect(enumerateSlotsWithContext(input).map((slot) => slot.slotName)).toEqual(['claimantName']);
  });
});
