const CITATION_RE = /\[block-([^\]]+)\]/g;

function computeGroundingReport(text: string, allBlockIds: Set<string>) {
  const cited = new Set<string>();
  for (const match of text.matchAll(CITATION_RE)) {
    cited.add(match[1]);
  }
  const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
  const validCitations = cited.size - unknownCitations.length;
  return { validCitations, unknownCitations, citedSize: cited.size };
}

const cases = [
  { allBlockIds: new Set(['x']), text: '[block-x] [block-y] [block-z]', expectedValid: 1, expectedUnknown: 2 },
  { allBlockIds: new Set<string>(), text: '[block-anything]', expectedValid: 0, expectedUnknown: 1 },
  { allBlockIds: new Set(['p', 'q', 'r']), text: '[block-p] [block-q] [block-r]', expectedValid: 3, expectedUnknown: 0 },
];

let pass = 0; let fail = 0;

for (const c of cases) {
  const r = computeGroundingReport(c.text, c.allBlockIds);
  const arithmeticOk = r.validCitations === r.citedSize - r.unknownCitations.length;
  if (!arithmeticOk) { console.error(`FAIL arithmetic: ${JSON.stringify(r)}`); fail++; continue; }
  if (r.validCitations !== c.expectedValid) { console.error(`FAIL valid: expected ${c.expectedValid} got ${r.validCitations}`); fail++; continue; }
  if (r.unknownCitations.length !== c.expectedUnknown) { console.error(`FAIL unknown: expected ${c.expectedUnknown} got ${r.unknownCitations.length}`); fail++; continue; }
  console.log(`PASS: valid=${r.validCitations} unknown=${r.unknownCitations.length}`); pass++;
}

console.log(`${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
