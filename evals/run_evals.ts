// NOTE: This runner validates eval case structure (schema + static assertions).
// To run evals against a live system, integrate your system's invoke() function
// at the TODO: INTEGRATE comment below.

import { parse } from 'yaml';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface EvalCase {
  id: string;
  description: string;
  query: string;
  tested_files: string[];
  expected_tools: string[];
  must_contain: string[];
  must_not_contain: string[];
}

interface CheckResult {
  tool_selection: 'pass' | 'fail' | 'n/a';
  source_citation: 'pass' | 'fail' | 'n/a';
  must_contain: 'pass' | 'fail' | 'n/a';
  must_not_contain: 'pass' | 'fail' | 'n/a';
  schema_valid: 'pass' | 'fail';
}

interface CaseResult {
  case_id: string;
  stage: 'golden';
  status: 'PASS' | 'FAIL' | 'ERROR' | 'SKIP';
  checks: CheckResult;
  failure_detail?: string;
}

const REQUIRED_FIELDS = [
  'id', 'description', 'query', 'tested_files',
  'expected_tools', 'must_contain', 'must_not_contain',
] as const;

const N_A_CHECKS: Omit<CheckResult, 'schema_valid'> = {
  tool_selection: 'n/a',
  source_citation: 'n/a',
  must_contain: 'n/a',
  must_not_contain: 'n/a',
};

function validateCase(raw: Record<string, unknown>, filename: string): CaseResult {
  const expectedId = basename(filename, '.yaml');

  // Schema: required fields present
  const missing = REQUIRED_FIELDS.filter(f => !(f in raw));
  if (missing.length > 0) {
    return {
      case_id: (raw.id as string) ?? expectedId,
      stage: 'golden',
      status: 'FAIL',
      checks: { ...N_A_CHECKS, schema_valid: 'fail' },
      failure_detail: `Missing required fields: ${missing.join(', ')}`,
    };
  }

  const failures: string[] = [];

  if (raw.id !== expectedId) {
    failures.push(`id "${raw.id}" does not match filename "${expectedId}"`);
  }
  for (const field of ['tested_files', 'expected_tools', 'must_contain', 'must_not_contain'] as const) {
    if (!Array.isArray(raw[field]) || (raw[field] as unknown[]).length === 0) {
      failures.push(`${field} must be a non-empty array`);
    }
  }
  if (typeof raw.description !== 'string' || !raw.description.trim()) {
    failures.push('description must be a non-empty string');
  }
  if (typeof raw.query !== 'string' || !raw.query.trim()) {
    failures.push('query must be a non-empty string');
  }

  // TODO: INTEGRATE — replace the block below with a live system call
  // const output = await invokeModel(raw.query);
  // const mustContainFail = (raw.must_contain as string[]).find(s => !output.includes(s));
  // const mustNotContainFail = (raw.must_not_contain as string[]).find(s => output.includes(s));
  // if (mustContainFail) failures.push(`must_contain not found: ${mustContainFail}`);
  // if (mustNotContainFail) failures.push(`must_not_contain present: ${mustNotContainFail}`);

  if (failures.length > 0) {
    return {
      case_id: raw.id as string,
      stage: 'golden',
      status: 'FAIL',
      checks: { ...N_A_CHECKS, schema_valid: 'fail' },
      failure_detail: failures.join('; '),
    };
  }

  return {
    case_id: raw.id as string,
    stage: 'golden',
    status: 'PASS',
    checks: { ...N_A_CHECKS, schema_valid: 'pass' },
  };
}

// ── Inventory ────────────────────────────────────────────────────────────────

const goldenDir = join(__dirname, 'golden');
const goldenFiles = readdirSync(goldenDir).filter(f => f.endsWith('.yaml')).sort();

const results: CaseResult[] = [];

for (const file of goldenFiles) {
  const filepath = join(goldenDir, file);
  try {
    const content = readFileSync(filepath, 'utf-8');
    const parsed = parse(content) as unknown;
    const cases: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const c of cases) {
      results.push(validateCase(c as Record<string, unknown>, file));
    }
  } catch (err: unknown) {
    results.push({
      case_id: basename(file, '.yaml'),
      stage: 'golden',
      status: 'ERROR',
      checks: { ...N_A_CHECKS, schema_valid: 'fail' },
      failure_detail: `Parse error: ${(err as Error).message}`,
    });
  }
}

// ── Report ───────────────────────────────────────────────────────────────────

const passed  = results.filter(r => r.status === 'PASS').length;
const failed  = results.filter(r => r.status === 'FAIL').length;
const errors  = results.filter(r => r.status === 'ERROR').length;
const skipped = results.filter(r => r.status === 'SKIP').length;
const total   = results.length;
const pct     = Math.round((passed / total) * 100);

console.log('\n=== EVAL RESULTS ===\n');
console.log(`Stage 1 — Golden Sets`);
console.log(`Total: ${total}  Passed: ${passed}  Failed: ${failed}  Errors: ${errors}  Skipped: ${skipped}`);
console.log(`Pass rate: ${pct}%\n`);

const nonPassing = results.filter(r => r.status !== 'PASS');
if (nonPassing.length > 0) {
  console.log('--- Failures ---');
  for (const r of nonPassing) {
    console.log(`  [${r.status}] ${r.case_id}: ${r.failure_detail ?? ''}`);
  }
  console.log('');
}

// ── Diff vs baseline ─────────────────────────────────────────────────────────

const resultsDir = join(__dirname, 'results');
mkdirSync(resultsDir, { recursive: true });

const latestPath   = join(resultsDir, 'latest.json');
const baselinePath = join(resultsDir, 'baseline.json');

let regressions: CaseResult[] = [];
let fixes: CaseResult[] = [];

if (existsSync(baselinePath)) {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf-8')) as { cases: CaseResult[] };
  const baselineById = new Map(baseline.cases.map(c => [c.case_id, c]));

  for (const r of results) {
    const b = baselineById.get(r.case_id);
    if (b?.status === 'PASS' && r.status !== 'PASS') regressions.push(r);
    if (b?.status !== 'PASS' && r.status === 'PASS') fixes.push(r);
  }

  if (regressions.length > 0) {
    console.log('⚠️  REGRESSIONS vs baseline:');
    for (const r of regressions) {
      console.log(`  [REGRESSION] ${r.case_id}: ${r.failure_detail ?? ''}`);
    }
    console.log('');
  }
  if (fixes.length > 0) {
    console.log('✅ Fixed vs baseline:');
    for (const r of fixes) console.log(`  [FIXED] ${r.case_id}`);
    console.log('');
  }
}

// Archive previous latest → baseline before overwriting
if (existsSync(latestPath)) {
  copyFileSync(latestPath, baselinePath);
}

const payload = {
  summary: { total, passed, failed, errors, skipped, regressions: regressions.length, fixes: fixes.length },
  cases: results,
};
writeFileSync(latestPath, JSON.stringify(payload, null, 2));
console.log('Results written to evals/results/latest.json');

// ── Gate ─────────────────────────────────────────────────────────────────────

let gate: 'GREEN' | 'YELLOW' | 'RED';
if (failed > 0 || errors > 0 || regressions.length > 0) {
  gate = 'RED';
} else if (pct < 100) {
  gate = 'YELLOW';
} else {
  gate = 'GREEN';
}

const gateLabel = { GREEN: '🟢 GREEN', YELLOW: '🟡 YELLOW', RED: '🔴 RED' }[gate];
console.log(`\nGate: ${gateLabel}`);

if (gate === 'GREEN') {
  console.log('All golden cases pass — safe to ship.');
} else if (gate === 'YELLOW') {
  console.log('Golden cases pass but some cases skipped — review before shipping.');
} else {
  console.log('One or more golden cases failed or regressions detected — do not ship.');
  console.log('\nNext steps:');
  console.log('  • Investigate failing cases above.');
  console.log('  • Use /eval-gap to check if new coverage is needed.');
  console.log('  • Add Stage 4 rubrics with /eval-create rubric for quality scoring.');
}

process.exit(gate === 'RED' ? 1 : 0);
