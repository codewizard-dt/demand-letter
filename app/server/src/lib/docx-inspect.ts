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

export function enumerateSlotsWithContext(buffer: Buffer): { slotName: string; paragraphText: string | null }[] {
  const zip = new PizZip(buffer);
  const TAG_RE = /\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g;
  const results: { slotName: string; paragraphText: string | null }[] = [];
  const seen = new Set<string>();

  for (const filename of Object.keys(zip.files)) {
    if (!filename.endsWith('.xml')) continue;
    const content = zip.files[filename].asText();
    // Parse paragraphs by splitting on </w:p> boundaries
    const paragraphs = content.split(/<\/w:p>/i);
    for (const para of paragraphs) {
      // Extract all w:t text nodes from this paragraph
      const textNodes = [...para.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/gi)].map(m => m[1]);
      const fullText = textNodes.join('');
      const tagMatches = [...fullText.matchAll(TAG_RE)];
      for (const match of tagMatches) {
        const slotName = match[1];
        if (seen.has(slotName)) continue;
        seen.add(slotName);
        // Strip all {tag} markers; if meaningful text remains, that's the context
        const stripped = fullText.replace(TAG_RE, '').trim();
        results.push({ slotName, paragraphText: stripped.length > 0 ? stripped : null });
      }
    }
  }
  return results;
}
