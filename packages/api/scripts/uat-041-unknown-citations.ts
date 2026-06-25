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

const allBlockIds = new Set(['abc123', 'def456']);
const text = 'Diagnosis noted. [block-abc123] See also. [block-HALLUCINATED_ID] Further treatment. [block-def456]';

const report = computeGroundingReport(text, allBlockIds);

let pass = 0; let fail = 0;

if (report.validCitations === 2) { console.log('PASS: validCitations=2'); pass++; }
else { console.error(`FAIL: expected validCitations=2, got ${report.validCitations}`); fail++; }

if (report.unknownCitations.length === 1 && report.unknownCitations[0] === 'HALLUCINATED_ID') {
  console.log('PASS: unknownCitations=[HALLUCINATED_ID]'); pass++;
} else {
  console.error(`FAIL: expected unknownCitations=['HALLUCINATED_ID'], got ${JSON.stringify(report.unknownCitations)}`); fail++;
}

console.log(`${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
