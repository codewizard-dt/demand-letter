export interface OoxmlRun {
  runIndex: number;         // 0-based index within the paragraph
  runPath: { paragraphIndex: number; runIndex: number };
  text: string;             // raw text from <w:t>
  bold: boolean;            // true when <w:b/> present in <w:rPr>
  italic: boolean;          // true when <w:i/> present in <w:rPr>
  font?: string;            // <w:rFonts w:ascii="..."> value
  fontSize?: number;        // <w:sz w:val="N"> / 2 (half-points → points)
}

export interface OoxmlZone {
  zoneIndex: number;        // 0-based paragraph index in document order
  paragraphStyle?: string;  // <w:pStyle w:val="..."> e.g. "Heading1", "Normal"
  runs: OoxmlRun[];
  textContent: string;      // concatenation of all run texts (read-only convenience)
}
