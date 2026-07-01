import PizZip from 'pizzip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['w:p', 'w:r', 'w:t', 'w:body', 'w:document'].includes(name),
  preserveOrder: true,
  trimValues: false,
});

const BUILDER = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  format: false,
});

export interface ProofreadEdit {
  index: number;
  action: 'delete' | 'rewrite';
  text?: string;
}

export interface ParagraphEntry {
  index: number;
  text: string;
}

export const PROOFREAD_TOOL = {
  name: 'revise_letter',
  description:
    'List the paragraphs to delete (meaningless leftover fragments) and the paragraphs to rewrite into complete, grammatical sentences for a demand letter.',
  input_schema: {
    type: 'object',
    properties: {
      delete: {
        type: 'array',
        items: { type: 'integer' },
        description: 'Indices of paragraphs that are meaningless leftover fragments (carry no real case content) and should be removed.',
      },
      fix: {
        type: 'array',
        description: 'Paragraphs to rewrite: those with a clear grammatical error, OR those written as fragments / telegraphic notes that must be turned into full sentences. Preserve every fact verbatim.',
        items: {
          type: 'object',
          properties: {
            index: { type: 'integer' },
            text: { type: 'string', description: 'The corrected full text of that paragraph, as complete grammatical sentence(s).' },
          },
          required: ['index', 'text'],
        },
      },
    },
    required: ['delete', 'fix'],
  },
} as const;

export const PROOFREAD_SYSTEM = `You are a meticulous legal proofreader reviewing a finished demand letter, one paragraph per line (each prefixed by its [index]).

Your job is to find:
1. DETACHED / ORPHANED FRAGMENTS — a paragraph that is a meaningless leftover of a template variable replacement: it carries no standalone case content, because a variable replaced part of the original sentence. Examples: a line that begins mid-clause ("executors, and administrators, and not third-parties or other persons, entities, or"), or ends with a dangling connector ("...entities, or"). List these indices in "delete". Only delete when the text carries NO real case content — if it does, rewrite it instead (see 3).
2. Clear GRAMMAR errors (a genuinely broken/merged word, wrong agreement). Put the corrected paragraph in "fix".
3. INCOMPLETE / TELEGRAPHIC SENTENCES — a paragraph that carries real content but is written as fragments or chart/note shorthand rather than full sentences (missing a subject or verb, stacked clauses with no connectives). Example: "44-year-old RV technician. Unable to return to full RV technician duties. Pain 7/10 at rest 9/10 with bending or lifting." Rewrite it in "fix" as complete, grammatically correct sentence(s). Every paragraph in the final letter must read as full prose sentences.

STRICT rules:
- NEVER change, add, or remove any fact: names, dates, ages, dollar amounts, claim numbers, statutes, medical measurements or ratings (e.g. "7/10", "C4-C5"), diagnoses, or defined short-names (leave "Mr. Donahue" as-is — do NOT expand it). Preserve every such token verbatim; only add ordinary connective words ("is", "and", "who", "with", "reports") needed to form a sentence.
- Do NOT invent details that are not present — no pronoun implying a gender that is not stated, no new subject or fact. When a subject is missing, use a neutral one already implied by context (e.g. "The claimant") rather than guessing.
- Do NOT reword, restyle, or "improve" a paragraph that is ALREADY a complete, grammatical sentence — leave it out entirely.
- Headings, ALL-CAPS lines, labels, and list markers like "A)", "(1)", "3." are intentional — never treat them as fragments or rewrite them.
- Keep output surgical: only the indices that genuinely need deletion or rewriting. Return empty arrays if the letter is clean.
Return via the revise_letter tool.`;

export function buildProofreadUserMessage(paragraphs: ParagraphEntry[]): string {
  const numbered = paragraphs.map((p) => `[${p.index}] ${p.text}`).join('\n');
  return `Demand letter paragraphs:\n\n${numbered}\n\nReturn the leftover-fragment indices to delete, plus rewrites for any paragraphs with grammar errors or incomplete/telegraphic sentences.`;
}

function coerceArray(value: unknown): unknown[] {
  let v = value;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { return []; }
  }
  return Array.isArray(v) ? v : [];
}

// Normalize the model's tool output (which may arrive as arrays or JSON strings)
// into a flat, validated edit list.
export function parseProofreadEdits(result: unknown): ProofreadEdit[] {
  const r = (result ?? {}) as Record<string, unknown>;
  const edits: ProofreadEdit[] = [];
  for (const idx of coerceArray(r.delete)) {
    if (typeof idx === 'number' && Number.isInteger(idx)) edits.push({ index: idx, action: 'delete' });
  }
  for (const item of coerceArray(r.fix)) {
    if (item && typeof item === 'object') {
      const { index, text } = item as { index?: unknown; text?: unknown };
      if (typeof index === 'number' && typeof text === 'string' && text.trim()) {
        edits.push({ index, action: 'rewrite', text });
      }
    }
  }
  return edits;
}

function collectText(value: unknown): string {
  if (Array.isArray(value)) return value.map(collectText).join('');
  if (value && typeof value === 'object') {
    let out = '';
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === ':@') continue;
      if (key === '#text') out += String(child);
      else out += collectText(child);
    }
    return out;
  }
  return '';
}

// Collect the body paragraphs (word/document.xml) with a running index. Header and
// footer parts are excluded — proofreading targets the letter body only.
export function extractBodyParagraphs(buffer: Buffer): ParagraphEntry[] {
  const zip = new PizZip(buffer);
  const xml = zip.file('word/document.xml')?.asText();
  if (!xml) return [];
  const parsed = PARSER.parse(xml) as Array<Record<string, unknown>>;
  const entries: ParagraphEntry[] = [];
  const counter = { value: 0 };
  const walk = (nodes: Array<Record<string, unknown>>): void => {
    for (const node of nodes) {
      if ('w:p' in node) {
        entries.push({ index: counter.value++, text: collectText(node['w:p']).trim() });
        continue;
      }
      for (const key of Object.keys(node)) {
        if (key === ':@') continue;
        if (Array.isArray(node[key])) walk(node[key] as Array<Record<string, unknown>>);
      }
    }
  };
  walk(parsed);
  return entries;
}

function firstRunProperties(pChildren: Array<Record<string, unknown>>): Array<Record<string, unknown>> | undefined {
  for (const child of pChildren) {
    if ('w:r' in child) {
      const runChildren = child['w:r'];
      if (Array.isArray(runChildren)) {
        const rPr = runChildren.find((c) => 'w:rPr' in c);
        if (rPr && Array.isArray((rPr as Record<string, unknown>)['w:rPr'])) {
          return JSON.parse(JSON.stringify((rPr as Record<string, unknown>)['w:rPr'])) as Array<Record<string, unknown>>;
        }
      }
    }
  }
  return undefined;
}

// Replace a paragraph's content with a single run of `text`, keeping its paragraph
// properties and adopting the first run's character formatting.
function rewriteParagraph(pChildren: Array<Record<string, unknown>>, text: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const pPr = pChildren.find((c) => 'w:pPr' in c);
  if (pPr) out.push(pPr);
  const runChildren: Array<Record<string, unknown>> = [];
  const rPr = firstRunProperties(pChildren);
  if (rPr) runChildren.push({ 'w:rPr': rPr });
  const textNode: Record<string, unknown> = { 'w:t': [{ '#text': text }] };
  if (/^\s|\s$/.test(text)) textNode[':@'] = { '@_xml:space': 'preserve' };
  runChildren.push(textNode);
  out.push({ 'w:r': runChildren });
  return out;
}

// Apply proofread edits to the body by paragraph index (same order as
// extractBodyParagraphs). "delete" removes the paragraph; "rewrite" replaces its text.
export function applyProofreadEdits(buffer: Buffer, edits: ProofreadEdit[]): Buffer {
  const editByIndex = new Map(edits.map((e) => [e.index, e]));
  if (editByIndex.size === 0) return buffer;
  const zip = new PizZip(buffer);
  const xml = zip.file('word/document.xml')?.asText();
  if (!xml) return buffer;
  const parsed = PARSER.parse(xml) as Array<Record<string, unknown>>;
  const counter = { value: 0 };

  const process = (nodes: Array<Record<string, unknown>>): Array<Record<string, unknown>> => {
    const out: Array<Record<string, unknown>> = [];
    for (const node of nodes) {
      if ('w:p' in node) {
        const idx = counter.value++;
        const edit = editByIndex.get(idx);
        if (edit?.action === 'delete') continue; // drop the paragraph entirely
        if (edit?.action === 'rewrite' && typeof edit.text === 'string' && edit.text.trim()) {
          node['w:p'] = rewriteParagraph(node['w:p'] as Array<Record<string, unknown>>, edit.text);
        }
        out.push(node);
        continue;
      }
      for (const key of Object.keys(node)) {
        if (key === ':@') continue;
        if (Array.isArray(node[key])) node[key] = process(node[key] as Array<Record<string, unknown>>);
      }
      out.push(node);
    }
    return out;
  };

  const processed = process(parsed);
  zip.file('word/document.xml', BUILDER.build(processed) as string);
  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}
