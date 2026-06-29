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
const text = 'Patient sustained injuries. Treatment was administered. No citations present in this narrative.';

const report = computeGroundingReport(text, allBlockIds);

let pass = 0; let fail = 0;

if (report.validCitations === 0) { console.log('PASS: validCitations=0'); pass++; }
else { console.error(`FAIL: expected validCitations=0, got ${report.validCitations}`); fail++; }

if (report.unknownCitations.length === 0) { console.log('PASS: unknownCitations=[]'); pass++; }
else { console.error(`FAIL: expected unknownCitations=[], got ${JSON.stringify(report.unknownCitations)}`); fail++; }

console.log(`${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
