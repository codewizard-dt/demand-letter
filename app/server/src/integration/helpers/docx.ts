import PizZip from 'pizzip'

export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// Minimal OOXML components required for a valid DOCX
const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`

const WORD_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`

function documentXml(paragraphs: string[]): string {
  const paras = paragraphs
    .map((t) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`)
    .join('\n    ')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paras}
  </w:body>
</w:document>`
}

/**
 * Create a minimal valid DOCX buffer from an array of paragraph strings.
 * Mammoth reads these as PARAGRAPH blocks during document ingestion.
 */
export function makeDocxBuffer(paragraphs: string[]): Buffer {
  const zip = new PizZip()
  zip.file('[Content_Types].xml', CONTENT_TYPES_XML)
  zip.file('_rels/.rels', ROOT_RELS_XML)
  zip.file('word/_rels/document.xml.rels', WORD_RELS_XML)
  zip.file('word/document.xml', documentXml(paragraphs))
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer
}

/**
 * Plain DOCX for upload + ingest tests — no template tags.
 * Mammoth will extract two paragraph blocks from this.
 */
export const plainDocxBuffer = makeDocxBuffer([
  'Medical records and case documentation for a personal injury claim.',
  'Claimant was treated following an incident on the date of loss.',
])

/**
 * Tagged DOCX for the generate test.
 * docxtemplater single-brace syntax: {tagName}
 * Only uses {claimantName} and {medicalNarrative} — both guaranteed to be
 * present in the data object assembled by buildDataObject + the handler.
 */
export const taggedDocxBuffer = makeDocxBuffer([
  'DEMAND LETTER',
  'Claimant: {claimantName}',
  '{medicalNarrative}',
])
