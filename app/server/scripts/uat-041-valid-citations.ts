// Inline grounding logic extracted from medical-narrative.ts for isolated testing
const CITATION_RE = /\[block-([^\]]+)\]/g;

function computeGroundingReport(text: string, allBlockIds: Set<string>) {
  const cited = new Set<string>();
  for (const match of text.matchAll(CITATION_RE)) {
    cited.add(match[1]);
  }
  const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
  const validCitations = cited.size - unknownCitations.length;
  return { validCitations, unknownCitations };
}

const allBlockIds = new Set(['abc123', 'def456', 'ghi789']);
const text = 'Patient sustained cervical strain. [block-abc123] Treatment was administered at the clinic. [block-def456] MRI revealed disc herniation at L4-L5. [block-ghi789]';

const report = computeGroundingReport(text, allBlockIds);

let pass = 0; let fail = 0;

if (report.validCitations === 3) { console.log('PASS: validCitations=3'); pass++; }
else { console.error(`FAIL: expected validCitations=3, got ${report.validCitations}`); fail++; }

if (report.unknownCitations.length === 0) { console.log('PASS: unknownCitations=[]'); pass++; }
else { console.error(`FAIL: expected unknownCitations=[], got ${JSON.stringify(report.unknownCitations)}`); fail++; }

console.log(`${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
