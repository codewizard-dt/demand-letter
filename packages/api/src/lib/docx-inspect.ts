import PizZip from 'pizzip';

// Scan DOCX XML for {tagName} placeholders without the lodash-dependent inspect module
export function enumerateSlots(buffer: Buffer): string[] {
  const zip = new PizZip(buffer);
  const seen = new Set<string>();
  for (const name of Object.keys(zip.files)) {
    if (!name.endsWith('.xml')) continue;
    const content = zip.files[name].asText();
    for (const match of content.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g)) {
      seen.add(match[1]);
    }
  }
  return Array.from(seen);
}
