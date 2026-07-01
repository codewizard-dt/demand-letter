import { describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import { injectDelimiters } from './docx-injector';
import { extractParagraphZones } from './docx-zone-extractor';
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
    expect(xml).toContain('<w:t xml:space="preserve">Page </w:t>');
    expect(xml).toContain('<w:t xml:space="preserve"> of </w:t>');
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

    expect(xml).toContain('<w:t xml:space="preserve">Claimant: </w:t>');
    expect(xml).toContain('{claimantName}');
    expect(xml).not.toContain('{{claimantName}}');
  });

  it('injects both zones independently when the same page field appears in adjacent zones', () => {
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

  it('splits adjacent address paragraphs into distinct line fields', () => {
    const input = createDocx({
      'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:t>P.O. Box 25210</w:t></w:r></w:p>
    <w:p><w:r><w:t>Santa Ana, CA 92799</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    });

    const output = injectDelimiters(input, [
      { zoneIndex: 0, suggestedFieldName: 'insurer_address', templateText: '{insurer_address}' },
      { zoneIndex: 1, suggestedFieldName: 'insurer_address', templateText: '{insurer_address}' },
    ]);
    const xml = new PizZip(output).file('word/document.xml')?.asText() ?? '';

    // Each address paragraph becomes its own line field so the value fills both lines.
    expect(xml).toContain('{insurer_address_1}');
    expect(xml).toContain('{insurer_address_2}');
    expect(xml).not.toContain('{insurer_address}');
  });

  it('collapses an adjacent pure-variable duplicate of a non-address field', () => {
    const input = createDocx({
      'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:t>555-1212</w:t></w:r></w:p>
    <w:p><w:r><w:t>555-1212</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    });

    const output = injectDelimiters(input, [
      { zoneIndex: 0, suggestedFieldName: 'claimant_phone', templateText: '{claimant_phone}' },
      { zoneIndex: 1, suggestedFieldName: 'claimant_phone', templateText: '{claimant_phone}' },
    ]);
    const xml = new PizZip(output).file('word/document.xml')?.asText() ?? '';

    expect(xml.match(/\{claimant_phone\}/g)).toHaveLength(1);
  });

  it('does not collapse a mixed zone that shares a field with an adjacent pure zone', () => {
    const input = createDocx({
      'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:t>email</w:t></w:r></w:p>
    <w:p><w:r><w:t>Sent to email</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    });

    const output = injectDelimiters(input, [
      { zoneIndex: 0, suggestedFieldName: 'adjuster_email', templateText: '{adjuster_email}' },
      { zoneIndex: 1, suggestedFieldName: 'adjuster_email', templateText: 'Sent to {adjuster_email}' },
    ]);
    const xml = new PizZip(output).file('word/document.xml')?.asText() ?? '';

    // Both render: the pure zone's tag plus the mixed zone's literal text + tag.
    expect(xml.match(/\{adjuster_email\}/g)).toHaveLength(2);
    expect(xml).toContain('<w:t xml:space="preserve">Sent to </w:t>');
  });

  it('drops a leftover hyperlink so an injected variable does not render twice', () => {
    const input = createDocx({
      'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:t>Sent Via E-Mail Only: </w:t></w:r><w:hyperlink r:id="rId9"><w:r><w:t>collins.elaine@ace.aaa.com</w:t></w:r></w:hyperlink></w:p>
  </w:body>
</w:document>`,
    });

    const output = injectDelimiters(input, [
      { zoneIndex: 0, suggestedFieldName: 'adjuster_email', templateText: 'Sent Via E-Mail Only: {adjuster_email}' },
    ]);
    const xml = new PizZip(output).file('word/document.xml')?.asText() ?? '';

    expect(xml.match(/\{adjuster_email\}/g)).toHaveLength(1);
    expect(xml).not.toContain('collins.elaine@ace.aaa.com');
    expect(xml).toContain('<w:t xml:space="preserve">Sent Via E-Mail Only: </w:t>');
  });

  it('clears absorbed continuation paragraphs for a multi-paragraph zone', () => {
    const input = createDocx({
      'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:t>The payee is Stalwart Law</w:t></w:r></w:p>
    <w:p><w:r><w:t>Group and no other entity.</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    });

    const output = injectDelimiters(input, [
      { zoneIndex: 0, suggestedFieldName: 'payee_name', templateText: 'The payee is {payee_name} and no other entity.', paragraphSpan: 2 },
    ]);
    const xml = new PizZip(output).file('word/document.xml')?.asText() ?? '';

    expect(xml).toContain('{payee_name}');
    // The absorbed second paragraph's original text is cleared.
    expect(xml).not.toContain('Group and no other entity.');
  });

  it('keeps a mixed clause-prose zone as boilerplate instead of injecting it', () => {
    const input = createDocx({
      'word/document.xml': bodyDocumentXml('Only releases the settling parties and not third-parties or other persons.'),
    });

    const output = injectDelimiters(input, [
      { zoneIndex: 0, suggestedFieldName: 'release_scope', templateText: 'Only releases the settling parties and not {release_scope}' },
    ]);
    const xml = new PizZip(output).file('word/document.xml')?.asText() ?? '';

    // The clause is left as the template authored it — no {release_scope} injected.
    expect(xml).not.toContain('{release_scope}');
    expect(xml).toContain('and not third-parties or other persons.');
  });

  it('still injects a mixed non-clause field (e.g. a name label)', () => {
    const input = createDocx({ 'word/document.xml': bodyDocumentXml('Attn.: placeholder') });
    const output = injectDelimiters(input, [
      { zoneIndex: 0, suggestedFieldName: 'adjuster_name', templateText: 'Attn.: {adjuster_name}' },
    ]);
    const xml = new PizZip(output).file('word/document.xml')?.asText() ?? '';
    expect(xml).toContain('{adjuster_name}');
  });

  it('still injects a pure clause-prose zone (whole paragraph is the variable)', () => {
    const input = createDocx({ 'word/document.xml': bodyDocumentXml('placeholder') });
    const output = injectDelimiters(input, [
      { zoneIndex: 0, suggestedFieldName: 'release_scope', templateText: '{release_scope}' },
    ]);
    const xml = new PizZip(output).file('word/document.xml')?.asText() ?? '';
    expect(xml).toContain('{release_scope}');
  });

  it('injects a default-header zone into the default header, not the first-page header logo', () => {
    // Word references headers default-then-first, but the zone extractor visits
    // them first-then-default. The injector must use the extractor's order or the
    // global paragraph counter drifts and a default-header "Claim Number" zone
    // lands in the first-page header's logo paragraph.
    const input = createDocx({
      'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:t>Body paragraph.</w:t></w:r></w:p>
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rIdD"/>
      <w:headerReference w:type="first" r:id="rIdF"/>
    </w:sectPr>
  </w:body>
</w:document>`,
      // First-page header: a logo paragraph (image, no text) then an email line.
      'word/header2.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:p><w:r><w:drawing/></w:r></w:p>
  <w:p><w:r><w:t>faby@stalwartlaw.com</w:t></w:r></w:p>
</w:hdr>`,
      // Default header: the Claim Number line that should receive the injection.
      'word/header1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:p><w:r><w:t>Claim Number: 12345</w:t></w:r></w:p>
</w:hdr>`,
      'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdD" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdF" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header2.xml"/>
</Relationships>`,
    });

    // Use the extractor's own zone index for the Claim Number zone so the test
    // exercises the extractor/injector ordering contract rather than a hard-coded index.
    const zones = extractParagraphZones(input);
    const claimZone = zones.find((z) => z.textContent.includes('Claim Number'));
    expect(claimZone).toBeDefined();

    const output = injectDelimiters(input, [
      { zoneIndex: claimZone!.zoneIndex, suggestedFieldName: 'insurer_claim_number', templateText: 'Claim Number: {insurer_claim_number}' },
    ]);
    const zip = new PizZip(output);
    const firstHeader = zip.file('word/header2.xml')?.asText() ?? '';
    const defaultHeader = zip.file('word/header1.xml')?.asText() ?? '';

    // The Claim Number tag goes into the default header...
    expect(defaultHeader).toContain('{insurer_claim_number}');
    // ...and the first-page header's logo paragraph is left untouched.
    expect(firstHeader).toContain('<w:drawing');
    expect(firstHeader).not.toContain('{insurer_claim_number}');
  });

  it('excludes reserved page fields from template slot enumeration', () => {
    const input = createDocx({
      'word/document.xml': bodyDocumentXml('{claimantName} Page {pageNumber} of {pageCount}'),
    });

    expect(enumerateSlots(input)).toEqual(['claimantName']);
    expect(enumerateSlotsWithContext(input).map((slot) => slot.slotName)).toEqual(['claimantName']);
  });
});
