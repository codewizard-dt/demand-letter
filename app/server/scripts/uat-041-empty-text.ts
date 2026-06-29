const CITATION_RE = /\[block-([^\]]+)\]/g;

let warnCalled = false;
const originalWarn = console.warn;
console.warn = () => { warnCalled = true; };

function runGrounding(text: string, allBlockIds: Set<string>) {
  const cited = new Set<string>();
  for (const match of text.matchAll(CITATION_RE)) cited.add(match[1]);
  const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
  const validCitations = cited.size - unknownCitations.length;
  if (unknownCitations.length > 0) {
    console.warn(
      `[medical-narrative] grounding violation — ${unknownCitations.length} unknown citation(s): ${unknownCitations.join(', ')}`,
    );
  }
  return { validCitations, unknownCitations };
}

const allBlockIds = new Set(['abc', 'def']);
const report = runGrounding('', allBlockIds);
console.warn = originalWarn;

let pass = 0; let fail = 0;

if (report.validCitations === 0) { console.log('PASS: validCitations=0'); pass++; }
else { console.error(`FAIL: expected validCitations=0, got ${report.validCitations}`); fail++; }

if (report.unknownCitations.length === 0) { console.log('PASS: unknownCitations=[]'); pass++; }
else { console.error(`FAIL: expected unknownCitations=[], got ${JSON.stringify(report.unknownCitations)}`); fail++; }

if (!warnCalled) { console.log('PASS: no console.warn on empty text'); pass++; }
else { console.error('FAIL: console.warn should not be called for empty text'); fail++; }

console.log(`${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
