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

// Same block ID cited 3 times; one unknown cited twice
const allBlockIds = new Set(['abc123']);
const text = '[block-abc123] First mention. [block-abc123] Second mention. [block-abc123] Third. [block-FAKE] First unknown. [block-FAKE] Second unknown.';

const report = computeGroundingReport(text, allBlockIds);

let pass = 0; let fail = 0;

if (report.validCitations === 1) { console.log('PASS: validCitations=1 (deduped)'); pass++; }
else { console.error(`FAIL: expected validCitations=1, got ${report.validCitations}`); fail++; }

if (report.unknownCitations.length === 1 && report.unknownCitations[0] === 'FAKE') {
  console.log('PASS: unknownCitations=[FAKE] (deduped)'); pass++;
} else {
  console.error(`FAIL: expected unknownCitations=['FAKE'], got ${JSON.stringify(report.unknownCitations)}`); fail++;
}

console.log(`${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
