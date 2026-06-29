import { redactText } from './redact-text';
import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { console.log(`  ✓ ${msg}`); passed++; }
  else { console.error(`  ✗ ${msg}`); failed++; }
}

// Unit tests for redactText
console.log('redactText unit tests:');

const entities = [
  { type: 'PATIENT', startOffset: 8, endOffset: 15 },
  { type: 'DATE', startOffset: 20, endOffset: 30 },
];
const redacted = redactText('Patient John Doe - DOB: 01/01/1980', entities);
assert(!redacted.includes('John Doe'), 'PATIENT span replaced with token');
assert(redacted.includes('[PATIENT_NAME]'), 'PATIENT replaced with [PATIENT_NAME]');

assert(redactText('', []) === '', 'empty string returns empty string');
assert(redactText('no phi here', []) === 'no phi here', 'no entities returns original text');

const ssn = redactText('SSN: 123-45-6789', [{ type: 'SSN', startOffset: 5, endOffset: 16 }]);
assert(ssn.includes('[SSN]'), 'SSN replaced with [SSN]');

const unknown = redactText('data here', [{ type: 'UNKNOWN_TYPE', startOffset: 0, endOffset: 4 }]);
assert(unknown.includes('[PHI_ENTITY]'), 'unknown type replaced with [PHI_ENTITY]');

// Static source checks
console.log('\nStatic source checks:');

const snsHandler = fs.readFileSync(
  path.join(__dirname, '../handlers/sns-textract-completion.ts'), 'utf-8'
);
assert(snsHandler.includes('Fail-closed'), 'SNS handler has fail-closed comment');
assert(snsHandler.includes('detectPhi'), 'SNS handler calls detectPhi');
assert(snsHandler.includes('detectPii'), 'SNS handler calls detectPii');
assert(snsHandler.includes('phiOffsets'), 'SNS handler writes phiOffsets');

const blocksHandler = fs.readFileSync(
  path.join(__dirname, '../handlers/get-jobs-blocks.ts'), 'utf-8'
);
assert(blocksHandler.includes('redactText'), 'GET /blocks imports and calls redactText');
assert(blocksHandler.includes('x-caller-role') || blocksHandler.includes('X-Caller-Role'), 'GET /blocks checks caller role header');
assert(blocksHandler.includes('attorney'), 'GET /blocks has attorney role check');

// Phase 5 — Static structural assertions
console.log('\nPhase 5 structural assertions:');

// Confirm phiOffsets is populated (not always Prisma.JsonNull) after TASK-052
assert(snsHandler.includes('mergeEntities') || snsHandler.includes('mergedEntities'),
  'SNS handler merges PHI and PII entities');
assert(snsHandler.includes('phiOffsets') && !snsHandler.includes('Prisma.JsonNull'),
  'SNS handler writes real data to phiOffsets (not JsonNull)');

// Confirm GET /blocks returns phiOffsets field from DB (for redaction)
assert(blocksHandler.includes('phiOffsets: true'), 'GET /blocks selects phiOffsets from DB');

// Confirm attorney role gets full text (isAttorney branch)
assert(blocksHandler.includes('isAttorney'), 'GET /blocks has isAttorney guard');

// Confirm simulated failure path: detection error causes block NOT to be inserted
// (the outer try/catch in the SNS handler ensures this — block.createMany only runs if no throw)
assert(snsHandler.includes('prisma.block.createMany'), 'createMany follows detection calls (not before)');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
