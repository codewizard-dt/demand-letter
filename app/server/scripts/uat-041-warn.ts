const CITATION_RE = /\[block-([^\]]+)\]/g;

let warnMessage: string | null = null;
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => { warnMessage = String(args[0]); };

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

const allBlockIds = new Set(['real-id']);
const text = '[block-real-id] Good citation. [block-FAKE-A] [block-FAKE-B] Bad citations.';

runGrounding(text, allBlockIds);
console.warn = originalWarn;

let pass = 0; let fail = 0;

if (warnMessage !== null) { console.log(`PASS: console.warn was called`); pass++; }
else { console.error('FAIL: console.warn was NOT called'); fail++; }

const expectedMsg = '[medical-narrative] grounding violation — 2 unknown citation(s): FAKE-A, FAKE-B';
if (warnMessage === expectedMsg) { console.log('PASS: warn message matches exactly'); pass++; }
else { console.error(`FAIL: expected:\n  ${expectedMsg}\ngot:\n  ${warnMessage}`); fail++; }

console.log(`${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
