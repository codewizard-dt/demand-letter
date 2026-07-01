import PizZip from 'pizzip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['w:p', 'w:r', 'w:t', 'w:body', 'w:document'].includes(name),
  preserveOrder: true,
  // Keep run text exactly as authored — trimming would drop the spaces that sit at
  // run boundaries, so phrases split across runs would no longer match.
  trimValues: false,
});

const BUILDER = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  format: false,
});

export interface LiteralReplacement {
  from: string;
  to: string;
}

const TAG_RE = /\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g;

// Literal propagation is only safe for distinctive party names and case
// identifiers. Amounts, dates, narratives, loop items, and the sender's own
// letterhead (firm/attorney) are excluded — replacing those literally risks
// clobbering coincidental matches or overriding authoritative template text.
const LITERAL_REPLACE_FIELDS = new Set([
  'claimant_name',
  'insured_name',
  'at_fault_party',
  'defendant_name',
  'adjuster_name',
  'insurer_adjuster_name',
  'insurer_name',
  'claim_number',
  'insurer_claim_number',
  'policy_number',
]);

// Guard against mis-classified zones whose "value" is really a whole sentence.
const MAX_LITERAL_LENGTH = 60;

interface ReplacementZone {
  type: string | null;
  confirmed: boolean;
  textContent: string;
  templateText: string | null;
  suggestedFieldName: string | null;
}

/**
 * Derive literal replacements from the confirmed single-variable zones: the text
 * a placeholder stood in for (the zone's original text minus the template's fixed
 * prefix/suffix) → the generated value for that field. This lets the same value
 * update everywhere the author typed it literally, not only where it was tagged.
 */
export function buildLiteralReplacements(
  zones: ReplacementZone[],
  data: Record<string, unknown>,
): LiteralReplacement[] {
  const out: LiteralReplacement[] = [];
  const seen = new Set<string>();
  for (const zone of zones) {
    if (zone.type !== 'variable_populated' || !zone.confirmed) continue;
    const templateText = zone.templateText ?? (zone.suggestedFieldName ? `{${zone.suggestedFieldName}}` : null);
    if (!templateText) continue;
    const tokens = [...templateText.matchAll(TAG_RE)];
    if (tokens.length !== 1) continue; // only unambiguous single-variable zones
    const token = tokens[0];
    const field = token?.[1];
    if (!token || !field) continue;
    if (!LITERAL_REPLACE_FIELDS.has(field)) continue;
    const start = token.index ?? 0;
    const prefix = templateText.slice(0, start);
    const suffix = templateText.slice(start + token[0].length);
    let original = zone.textContent ?? '';
    if (prefix && original.startsWith(prefix)) original = original.slice(prefix.length);
    if (suffix && original.endsWith(suffix)) original = original.slice(0, original.length - suffix.length);
    original = original.trim();
    if (!original || original.length > MAX_LITERAL_LENGTH) continue;
    const raw = data[field];
    const to = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
    // Skip no-ops and the case where the new value contains the old value (would
    // corrupt already-tagged occurrences on the second, literal pass).
    if (!to || to === original || to.includes(original)) continue;
    const key = `${original} ${to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ from: original, to });
  }
  return out;
}

const PART_RE = /^word\/(document|header\d+|footer\d+)\.xml$/;
const NON_TEXT_RUN_KEYS = ['w:drawing', 'w:pict', 'w:object', 'w:fldChar', 'w:instrText', 'mc:AlternateContent'];

/**
 * Only replace values distinctive enough to be safe as a literal find/replace:
 * multi-word phrases, anything containing a digit, or a long single token. This
 * avoids clobbering short common words that happen to match a field's original text.
 */
function isReplaceable(from: string): boolean {
  const trimmed = from.trim();
  if (trimmed.length < 4) return false;
  return /\s/.test(trimmed) || /\d/.test(trimmed) || trimmed.length >= 8;
}

/**
 * Replace remaining literal occurrences of each `from` value with `to` across the
 * document body, headers and footers. Used to propagate a template's original
 * values (e.g. a claimant name the author left untagged in boilerplate) to the
 * generated value. Runs are edited in place so surrounding text keeps its
 * formatting; matches spanning multiple runs are handled.
 */
export function applyLiteralReplacements(buffer: Buffer, replacements: LiteralReplacement[]): Buffer {
  const active = replacements
    .filter((r) => r.from && r.to && r.from !== r.to && isReplaceable(r.from))
    // Longest first so a longer phrase wins over a contained shorter one.
    .sort((a, b) => b.from.length - a.from.length);
  if (active.length === 0) return buffer;

  const zip = new PizZip(buffer);
  for (const path of Object.keys(zip.files)) {
    if (!PART_RE.test(path)) continue;
    const xml = zip.file(path)?.asText();
    if (!xml) continue;
    const parsed = PARSER.parse(xml) as Array<Record<string, unknown>>;
    replaceInNodes(parsed, active);
    zip.file(path, BUILDER.build(parsed) as string);
  }
  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

function replaceInNodes(nodes: Array<Record<string, unknown>>, active: LiteralReplacement[]): void {
  for (const node of nodes) {
    for (const key of Object.keys(node)) {
      if (key === ':@') continue;
      if (key === 'w:p') {
        replaceInParagraph(node[key] as Array<Record<string, unknown>>, active);
      } else {
        const children = node[key];
        if (Array.isArray(children)) replaceInNodes(children as Array<Record<string, unknown>>, active);
      }
    }
  }
}

function isTextOnlyRun(run: Record<string, unknown>): boolean {
  const children = run['w:r'];
  if (!Array.isArray(children)) return false;
  let hasText = false;
  for (const child of children) {
    if ('w:t' in child) hasText = true;
    for (const key of NON_TEXT_RUN_KEYS) if (key in child) return false;
  }
  return hasText;
}

// Process each maximal run of consecutive text-only runs together so a phrase
// split across runs (Word does this constantly) can still be matched.
function replaceInParagraph(pChildren: Array<Record<string, unknown>>, active: LiteralReplacement[]): void {
  let group: Array<Record<string, unknown>> = [];
  const flush = () => {
    if (group.length > 0) replaceInRunGroup(group, active);
    group = [];
  };
  for (const child of pChildren) {
    if (child && typeof child === 'object' && 'w:r' in child && isTextOnlyRun(child)) {
      group.push(child);
    } else {
      flush();
    }
  }
  flush();
}

function getRunText(run: Record<string, unknown>): string {
  const children = run['w:r'] as Array<Record<string, unknown>>;
  for (const child of children) {
    if ('w:t' in child) {
      const t = child['w:t'];
      if (Array.isArray(t)) {
        const textNode = t.find((x) => '#text' in x);
        return textNode ? String(textNode['#text']) : '';
      }
    }
  }
  return '';
}

function setRunText(run: Record<string, unknown>, text: string): void {
  const children = run['w:r'] as Array<Record<string, unknown>>;
  for (const child of children) {
    if ('w:t' in child) {
      const t = child['w:t'];
      if (Array.isArray(t)) {
        const textNode = t.find((x) => '#text' in x);
        if (textNode) textNode['#text'] = text;
        else t.push({ '#text': text });
        // Preserve leading/trailing whitespace so Word does not collapse it.
        if (/^\s|\s$/.test(text)) {
          (child as Record<string, unknown>)[':@'] = {
            ...((child as Record<string, unknown>)[':@'] as Record<string, unknown> | undefined),
            '@_xml:space': 'preserve',
          };
        }
        return;
      }
    }
  }
}

function replaceInRunGroup(runNodes: Array<Record<string, unknown>>, active: LiteralReplacement[]): void {
  const runs = runNodes.map((node) => ({ node, text: getRunText(node) }));
  let full = runs.map((r) => r.text).join('');
  if (!active.some((r) => full.includes(r.from))) return;

  for (const { from, to } of active) {
    let searchStart = 0;
    let idx: number;
    while ((idx = full.indexOf(from, searchStart)) !== -1) {
      applyEditAcrossRuns(runs, idx, from.length, to);
      full = runs.map((r) => r.text).join('');
      searchStart = idx + to.length;
    }
  }

  for (const r of runs) setRunText(r.node, r.text);
}

// Delete chars [s, s+len) across the run list and insert `to` at position s,
// keeping the inserted text in the first overlapping run (so it inherits its style).
function applyEditAcrossRuns(runs: Array<{ text: string }>, s: number, len: number, to: string): void {
  const e = s + len;
  let acc = 0;
  let inserted = false;
  for (const run of runs) {
    const rs = acc;
    const re = acc + run.text.length;
    acc = re;
    if (re <= s || rs >= e) continue; // no overlap
    const localStart = Math.max(s, rs) - rs;
    const localEnd = Math.min(e, re) - rs;
    const before = run.text.slice(0, localStart);
    const after = run.text.slice(localEnd);
    if (!inserted) {
      run.text = before + to + after;
      inserted = true;
    } else {
      run.text = before + after;
    }
  }
}
