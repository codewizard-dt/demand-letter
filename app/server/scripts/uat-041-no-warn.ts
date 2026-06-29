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

const allBlockIds = new Set(['id-1', 'id-2']);
const text = '[block-id-1] Finding one. [block-id-2] Finding two.';

runGrounding(text, allBlockIds);
console.warn = originalWarn;

let pass = 0; let fail = 0;

if (!warnCalled) { console.log('PASS: console.warn was NOT called'); pass++; }
else { console.error('FAIL: console.warn should not have been called when all citations are valid'); fail++; }

console.log(`${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
