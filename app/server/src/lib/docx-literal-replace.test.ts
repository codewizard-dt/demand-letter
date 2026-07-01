import { describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import { applyLiteralReplacements, buildLiteralReplacements } from './docx-literal-replace';

function createDocx(documentXml: string): Buffer {
  const zip = new PizZip();
  zip.file('word/document.xml', documentXml);
  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

function body(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${inner}</w:body>
</w:document>`;
}

function documentText(buffer: Buffer): string {
  const xml = new PizZip(buffer).file('word/document.xml')?.asText() ?? '';
  return [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('');
}

describe('applyLiteralReplacements', () => {
  it('replaces a literal value contained in a single run', () => {
    const input = createDocx(body('<w:p><w:r><w:t>Our client Patrick Donahue was injured.</w:t></w:r></w:p>'));
    const output = applyLiteralReplacements(input, [{ from: 'Patrick Donahue', to: 'Jane Smith' }]);
    expect(documentText(output)).toBe('Our client Jane Smith was injured.');
  });

  it('replaces a value split across multiple runs', () => {
    const input = createDocx(body(
      '<w:p><w:r><w:t>Our client </w:t></w:r><w:r><w:t>Patrick </w:t></w:r><w:r><w:t>Donahue</w:t></w:r><w:r><w:t> was injured.</w:t></w:r></w:p>',
    ));
    const output = applyLiteralReplacements(input, [{ from: 'Patrick Donahue', to: 'Jane Smith' }]);
    expect(documentText(output)).toBe('Our client Jane Smith was injured.');
  });

  it('does not replace short or common values', () => {
    const input = createDocx(body('<w:p><w:r><w:t>Only the best.</w:t></w:r></w:p>'));
    const output = applyLiteralReplacements(input, [{ from: 'Only', to: 'REPLACED' }]);
    expect(documentText(output)).toBe('Only the best.');
  });

  it('leaves text untouched when there is no match', () => {
    const input = createDocx(body('<w:p><w:r><w:t>Nothing to change here.</w:t></w:r></w:p>'));
    const output = applyLiteralReplacements(input, [{ from: 'Patrick Donahue', to: 'Jane Smith' }]);
    expect(documentText(output)).toBe('Nothing to change here.');
  });
});

describe('buildLiteralReplacements', () => {
  it('derives the original value from a mixed single-variable zone', () => {
    const replacements = buildLiteralReplacements(
      [
        {
          type: 'variable_populated',
          confirmed: true,
          textContent: 'Re: Our Client: Patrick Donahue',
          templateText: 'Re: Our Client: {claimant_name}',
          suggestedFieldName: 'claimant_name',
        },
      ],
      { claimant_name: 'Jane Smith' },
    );
    expect(replacements).toEqual([{ from: 'Patrick Donahue', to: 'Jane Smith' }]);
  });

  it('uses the whole text for a pure-variable zone', () => {
    const replacements = buildLiteralReplacements(
      [
        {
          type: 'variable_populated',
          confirmed: true,
          textContent: 'Patrick Donahue',
          templateText: '{claimant_name}',
          suggestedFieldName: 'claimant_name',
        },
      ],
      { claimant_name: 'Jane Smith' },
    );
    expect(replacements).toEqual([{ from: 'Patrick Donahue', to: 'Jane Smith' }]);
  });

  it('skips multi-variable zones and unchanged values', () => {
    const replacements = buildLiteralReplacements(
      [
        {
          type: 'variable_populated',
          confirmed: true,
          textContent: 'John Doe and Jane Roe',
          templateText: '{claimant_name} and {defendant_name}',
          suggestedFieldName: 'claimant_name',
        },
        {
          type: 'variable_populated',
          confirmed: true,
          textContent: 'Same Value',
          templateText: '{firm_name}',
          suggestedFieldName: 'firm_name',
        },
      ],
      { claimant_name: 'X', defendant_name: 'Y', firm_name: 'Same Value' },
    );
    expect(replacements).toEqual([]);
  });

  it('skips fields outside the safe allowlist (e.g. amounts) and over-long values', () => {
    const replacements = buildLiteralReplacements(
      [
        {
          type: 'variable_populated',
          confirmed: true,
          textContent: '$100,000.00',
          templateText: '{general_damages_figure}',
          suggestedFieldName: 'general_damages_figure',
        },
        {
          type: 'variable_populated',
          confirmed: true,
          textContent: 'A very long mis-classified narrative sentence that clearly is not a party name at all here',
          templateText: '{claimant_name}',
          suggestedFieldName: 'claimant_name',
        },
      ],
      { general_damages_figure: '$50,000', claimant_name: 'Jane Smith' },
    );
    expect(replacements).toEqual([]);
  });

  it('skips when the new value contains the old value', () => {
    const replacements = buildLiteralReplacements(
      [
        {
          type: 'variable_populated',
          confirmed: true,
          textContent: 'Donahue',
          templateText: '{claimant_name}',
          suggestedFieldName: 'claimant_name',
        },
      ],
      { claimant_name: 'Patrick Donahue' },
    );
    expect(replacements).toEqual([]);
  });
});
