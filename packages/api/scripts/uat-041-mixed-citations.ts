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

const allBlockIds = new Set(['a1', 'b2', 'c3']);
// cited: a1 (valid), b2 (valid), GHOST1 (unknown), GHOST2 (unknown)
const text = 'Finding A [block-a1]. Finding B [block-b2]. Finding C [block-GHOST1]. Finding D [block-GHOST2].';

const report = computeGroundingReport(text, allBlockIds);

let pass = 0; let fail = 0;

if (report.validCitations === 2) { console.log('PASS: validCitations=2'); pass++; }
else { console.error(`FAIL: expected validCitations=2, got ${report.validCitations}`); fail++; }

if (report.unknownCitations.length === 2) { console.log('PASS: unknownCitations.length=2'); pass++; }
else { console.error(`FAIL: expected 2 unknowns, got ${report.unknownCitations.length}`); fail++; }

const unknownSet = new Set(report.unknownCitations);
if (unknownSet.has('GHOST1') && unknownSet.has('GHOST2')) {
  console.log('PASS: unknownCitations contains GHOST1 and GHOST2'); pass++;
} else {
  console.error(`FAIL: expected GHOST1+GHOST2, got ${JSON.stringify(report.unknownCitations)}`); fail++;
}

console.log(`${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
