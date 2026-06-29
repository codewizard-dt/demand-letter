/**
 * One-time fixture generator for Playwright E2E tests.
 * Run: node app/frontend/scripts/create-fixtures.mjs
 * Commit the generated e2e/fixtures/ files — they're stable, <20 KB each.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dir, '../e2e/fixtures');
mkdirSync(fixturesDir, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// DOCX: Demand letter template
// Zones are deliberately varied so Bedrock's classifier correctly labels
// boilerplate sections (static legal language) vs variable sections (blanks).
// The backend's classify+inject steps add {{tag}} placeholders automatically.
// ─────────────────────────────────────────────────────────────────────────────

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        // Firm header — variable zone (populated from attorney/firm fields)
        new Paragraph({
          text: 'LAW OFFICES OF SMITH & ASSOCIATES',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('123 Legal Boulevard, Suite 400')] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('Los Angeles, California 90001')] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('Tel: (213) 555-0100 | Fax: (213) 555-0101')] }),
        new Paragraph({}),

        // Date and delivery — variable zone
        new Paragraph({ children: [new TextRun({ text: 'Date: ', bold: true }), new TextRun('__________________')] }),
        new Paragraph({ children: [new TextRun({ text: 'Via: ', bold: true }), new TextRun('Certified Mail, Return Receipt Requested')] }),
        new Paragraph({}),

        // Recipient block — variable zone
        new Paragraph({ children: [new TextRun({ text: 'Claims Adjuster Name', italics: true })] }),
        new Paragraph({ children: [new TextRun({ text: 'Adjuster Title', italics: true })] }),
        new Paragraph({ children: [new TextRun({ text: 'Insurance Company Name', italics: true })] }),
        new Paragraph({ children: [new TextRun({ text: 'Insurance Company Address', italics: true })] }),
        new Paragraph({}),

        // Re: line — variable zone
        new Paragraph({
          children: [
            new TextRun({ text: 'Re:\t', bold: true }),
            new TextRun('Claimant Name'),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '\tClaim No.: ', bold: true }),
            new TextRun('Claim Number'),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '\tDate of Loss: ', bold: true }),
            new TextRun('Date of Loss'),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '\tInsured: ', bold: true }),
            new TextRun('Insured Name'),
          ],
        }),
        new Paragraph({}),

        // Salutation — variable
        new Paragraph({ children: [new TextRun('Dear Claims Adjuster:')] }),
        new Paragraph({}),

        // Opening — boilerplate
        new Paragraph({
          children: [
            new TextRun(
              'This office represents the above-named claimant in connection with the bodily injuries sustained as a result of the above-referenced incident. We write to present our demand for the full and fair settlement of all claims arising from this matter.',
            ),
          ],
        }),
        new Paragraph({}),

        // Section I: Liability — boilerplate
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('I. LIABILITY')] }),
        new Paragraph({
          children: [
            new TextRun(
              'The facts clearly establish liability on the part of your insured. At the time, date, and location referenced above, the at-fault party operated their vehicle in a negligent and careless manner, directly causing a collision with our client. The at-fault party\'s negligent conduct was the direct, proximate, and legal cause of our client\'s resulting injuries and damages.',
            ),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun(
              'Liability in this matter is clear and not subject to reasonable dispute. We anticipate no contention on the question of fault.',
            ),
          ],
        }),
        new Paragraph({}),

        // Section II: Injuries — variable + boilerplate mix
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('II. INJURIES AND MEDICAL TREATMENT')] }),
        new Paragraph({
          children: [
            new TextRun(
              'As a direct and proximate result of the negligent conduct of your insured, our client sustained significant physical injuries requiring immediate and ongoing medical attention. Our client sought prompt and appropriate medical treatment from qualified medical providers.',
            ),
          ],
        }),
        new Paragraph({ children: [new TextRun({ text: 'Diagnoses: ', bold: true }), new TextRun('__________________')] }),
        new Paragraph({ children: [new TextRun({ text: 'Treating Providers: ', bold: true }), new TextRun('__________________')] }),
        new Paragraph({ children: [new TextRun({ text: 'First Treatment Date: ', bold: true }), new TextRun('__________________')] }),
        new Paragraph({ children: [new TextRun({ text: 'Last Treatment Date: ', bold: true }), new TextRun('__________________')] }),
        new Paragraph({
          children: [
            new TextRun(
              'Our client\'s treating physicians have documented the nature and extent of the injuries sustained. Medical records and bills are available upon request and will be provided as part of this demand package.',
            ),
          ],
        }),
        new Paragraph({}),

        // Section III: Special Damages — variable amounts
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('III. SPECIAL DAMAGES')] }),
        new Paragraph({ children: [new TextRun('Our client has incurred the following documented special damages:')] }),
        new Paragraph({ children: [new TextRun({ text: 'Medical Specials (to date): $', bold: true }), new TextRun('__________________')] }),
        new Paragraph({ children: [new TextRun({ text: 'Future Medical Reserve: $', bold: true }), new TextRun('__________________')] }),
        new Paragraph({ children: [new TextRun({ text: 'Total Special Damages: $', bold: true }), new TextRun('__________________')] }),
        new Paragraph({}),

        // Section IV: General Damages — boilerplate + variable figure
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('IV. GENERAL DAMAGES')] }),
        new Paragraph({
          children: [
            new TextRun(
              'In addition to the special damages outlined above, our client has suffered significant non-economic damages, including but not limited to pain and suffering, emotional distress, loss of enjoyment of life, and loss of consortium. These general damages are compensable under California law.',
            ),
          ],
        }),
        new Paragraph({ children: [new TextRun({ text: 'General Damages: $', bold: true }), new TextRun('__________________')] }),
        new Paragraph({}),

        // Section V: Demand — variable
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('V. SETTLEMENT DEMAND')] }),
        new Paragraph({
          children: [
            new TextRun(
              'Based upon the foregoing, we hereby demand the sum of $',
            ),
            new TextRun({ text: '__________________', bold: true }),
            new TextRun(
              ' in full and final settlement of all claims, including all known and unknown claims, arising from the above-referenced incident.',
            ),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun(
              'We understand that your insured\'s applicable policy limits are $',
            ),
            new TextRun({ text: '__________________', bold: true }),
            new TextRun('. This demand is made within policy limits.'),
          ],
        }),
        new Paragraph({}),

        // Section VI: Release terms — boilerplate
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('VI. TERMS OF ACCEPTANCE AND RELEASE')] }),
        new Paragraph({
          children: [
            new TextRun(
              'This demand shall remain open for thirty (30) days from the date of this letter. Acceptance of this demand shall constitute full and final settlement of all claims, known and unknown, arising from the above-referenced incident. Pursuant to California Civil Code §1542, this release shall include a waiver of any and all claims, demands, actions, and causes of action, whether known or unknown, fixed or contingent, which arise out of or relate to the above-referenced incident.',
            ),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun(
              'Settlement proceeds should be made payable to our client and this firm as attorneys of record. Please remit payment to our office address listed above.',
            ),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun(
              'Failure to accept this demand within the time specified above will result in the filing of a lawsuit and the pursuit of all available legal remedies, including a claim for punitive damages where appropriate.',
            ),
          ],
        }),
        new Paragraph({}),

        // Closing — boilerplate
        new Paragraph({
          children: [
            new TextRun(
              'Please confirm receipt of this demand and advise us of your client\'s position within the time period specified. We look forward to resolving this matter amicably.',
            ),
          ],
        }),
        new Paragraph({}),
        new Paragraph({ children: [new TextRun('Very truly yours,')] }),
        new Paragraph({}),
        new Paragraph({ children: [new TextRun({ text: 'Attorney Name', bold: true })] }),
        new Paragraph({ children: [new TextRun('State Bar No. __________')] }),
        new Paragraph({ children: [new TextRun('SMITH & ASSOCIATES') ] }),
      ],
    },
  ],
});

const docxBuffer = await Packer.toBuffer(doc);
writeFileSync(join(fixturesDir, 'template.docx'), docxBuffer);
console.log('✓ template.docx created');

// ─────────────────────────────────────────────────────────────────────────────
// PDF: Case document with extractable case information
// Content covers all required FIELD_SCHEMA fields so Bedrock can populate them.
// Uses Type1/Helvetica (no embedding needed) for broad compatibility.
// ─────────────────────────────────────────────────────────────────────────────

function buildPdf(lines) {
  // Build the content stream text
  const contentLines = lines.map((line, i) => {
    if (i === 0) return `50 742 Td (${line}) Tj`;
    return `0 -16 Td (${line}) Tj`;
  });
  const contentStream = `BT\n/F1 11 Tf\n${contentLines.join('\n')}\nET`;
  const contentBytes = Buffer.from(contentStream, 'latin1');

  // Object positions
  const objs = {};
  const parts = [];

  function addLine(s) { parts.push(s + '\n'); }

  addLine('%PDF-1.4');

  // obj 1: Catalog
  objs[1] = parts.reduce((n, p) => n + Buffer.byteLength(p, 'latin1'), 0);
  addLine('1 0 obj');
  addLine('<< /Type /Catalog /Pages 2 0 R >>');
  addLine('endobj');

  // obj 2: Pages
  objs[2] = parts.reduce((n, p) => n + Buffer.byteLength(p, 'latin1'), 0);
  addLine('2 0 obj');
  addLine('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addLine('endobj');

  // obj 3: Page
  objs[3] = parts.reduce((n, p) => n + Buffer.byteLength(p, 'latin1'), 0);
  addLine('3 0 obj');
  addLine('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]');
  addLine('   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  addLine('endobj');

  // obj 4: Content stream
  objs[4] = parts.reduce((n, p) => n + Buffer.byteLength(p, 'latin1'), 0);
  addLine('4 0 obj');
  addLine(`<< /Length ${contentBytes.length} >>`);
  addLine('stream');
  parts.push(contentStream + '\n');
  addLine('endstream');
  addLine('endobj');

  // obj 5: Font
  objs[5] = parts.reduce((n, p) => n + Buffer.byteLength(p, 'latin1'), 0);
  addLine('5 0 obj');
  addLine('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  addLine('endobj');

  // xref
  const xrefOffset = parts.reduce((n, p) => n + Buffer.byteLength(p, 'latin1'), 0);
  addLine('xref');
  addLine('0 6');
  addLine('0000000000 65535 f ');
  for (let i = 1; i <= 5; i++) {
    addLine(String(objs[i]).padStart(10, '0') + ' 00000 n ');
  }

  addLine('trailer');
  addLine('<< /Size 6 /Root 1 0 R >>');
  addLine('startxref');
  addLine(String(xrefOffset));
  addLine('%%EOF');

  return Buffer.concat(parts.map((p) => Buffer.from(p, 'latin1')));
}

// PDF text — all fields covered so Bedrock extraction produces minimal gaps.
// Parentheses in PDF strings must be escaped as \( \)
const caseDocLines = [
  'CASE SUMMARY AND MEDICAL RECORDS',
  '',
  'PATIENT AND CLAIMANT INFORMATION',
  'Patient Name: Sarah Johnson',
  'Date of Birth: March 12, 1985',
  'Address: 456 Oak Street, Los Angeles, California 90012',
  'Phone: \\(213\\) 555-0202',
  'Email: sarah.johnson@email.com',
  '',
  'INCIDENT AND CLAIM INFORMATION',
  'Date of Loss: June 15, 2023',
  'Time of Incident: 2:45 PM',
  'Location of Incident: Intersection of Wilshire Blvd and Vermont Ave, Los Angeles, CA',
  'Claim Number: PGI-2023-447821',
  'Policy Number: PGI-AUTO-992156',
  'Policy Limits: $100,000 per person / $300,000 per occurrence',
  '',
  'INSURANCE AND DEFENDANT INFORMATION',
  'Insurance Company: Pacific General Insurance Company',
  'Adjuster Name: Robert Martinez',
  'Adjuster Title: Senior Claims Adjuster',
  'Insurer Address: 789 Corporate Pkwy, Suite 500, Los Angeles, CA 90025',
  'Adjuster Phone: \\(213\\) 555-0303',
  'Adjuster Email: rmartinez@pacificgeneral.com',
  'Insured Name: Michael Thompson',
  'At-Fault Party: Michael Thompson \\(driver of the striking vehicle\\)',
  'Defendant Address: 321 Pine Ave, Glendale, CA 91201',
  'Defendant Conduct: Ran red light at high speed, T-boning claimants vehicle',
  '',
  'LIABILITY NOTES',
  'Police Report Number: LAPD-2023-78542',
  'Traffic Conditions: Clear, dry, daytime conditions',
  'Liability Admission Status: Disputed \\(police cited defendant for red-light violation\\)',
  'Claimant Conduct: Claimant had green light and right of way',
  '',
  'MEDICAL PROVIDERS AND TREATMENT',
  'Emergency Department: Cedars-Sinai Medical Center, Emergency Room',
  'Treating Physician: Dr. Amanda Chen, MD \\(Orthopedic Surgery\\)',
  'Treating Facility: Los Angeles Spine & Orthopedic Center',
  'Physical Therapist: Robert Kim, DPT at LA Physical Therapy Associates',
  'First Treatment Date: June 15, 2023 \\(Emergency Department\\)',
  'Last Treatment Date: December 10, 2023',
  'Future Treatment: Continued physical therapy recommended x 6 months',
  '',
  'DIAGNOSES AND CLINICAL FINDINGS',
  'Diagnoses: Cervical disc herniation at C4-C5 and C5-C6',
  'Lumbar strain and sprain, L3-L4',
  'Right shoulder rotator cuff partial tear',
  'Post-traumatic headaches',
  'Acute stress reaction',
  'Imaging Results: MRI cervical spine shows disc herniation with nerve impingement',
  'X-ray right shoulder: soft tissue swelling, no fracture identified',
  'Examination Findings: Limited ROM cervical spine, positive Spurlings test bilaterally',
  'Palpable tenderness right shoulder, muscle guarding lumbar spine',
  'ICD-10 Codes: M50.121, M54.5, S40.011A, G44.309, F43.0',
  '',
  'MEDICAL BILLS AND SPECIAL DAMAGES',
  'Cedars-Sinai Emergency Department: $8,450.00',
  'Los Angeles Spine & Orthopedic Center \\(12 visits\\): $18,600.00',
  'LA Physical Therapy Associates \\(24 sessions\\): $9,600.00',
  'Diagnostic Imaging \\(MRI, X-rays\\): $6,200.00',
  'Prescription Medications: $340.00',
  'Total Medical Bills to Date: $43,190.00',
  'Future Medical Estimate: $12,000.00 \\(continued PT + specialist follow-up\\)',
  '',
  'OCCUPATIONAL IMPACT',
  'Employer: Johnson Graphic Design LLC',
  'Lost Wages Amount: $14,500.00',
  'Lost Wages Period: June 15 - September 30, 2023 \\(3.5 months\\)',
  'Return to Work Date: October 1, 2023 \\(light duty only\\)',
  'Occupational Impact: Unable to perform design work; limited computer use due to cervical pain',
];

const pdfBuffer = buildPdf(caseDocLines);
writeFileSync(join(fixturesDir, 'case-doc.pdf'), pdfBuffer);
console.log('✓ case-doc.pdf created');
console.log(`\nFixtures written to: ${fixturesDir}`);
