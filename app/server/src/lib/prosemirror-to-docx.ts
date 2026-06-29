import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,

  ShadingType,
  WidthType,
  BorderStyle,
  TableLayoutType,
} from 'docx';

// ProseMirror type definitions
interface ProseMirrorMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: ProseMirrorMark[];
  content?: ProseMirrorNode[];
}

export type ProseMirrorDoc = ProseMirrorNode; // Same shape, type === "doc"

/**
 * Convert a text node with marks into a TextRun or array of TextRuns.
 * Handles marks: bold, italic, boilerplateZone (shading), trackInsert, trackDelete.
 */
function textRunFromNode(node: ProseMirrorNode): TextRun | TextRun[] {
  const text = node.text || '';
  const marks = node.marks || [];

  // Filter out track marks and determine styling
  let isBold = false;
  let isItalic = false;
  let hasBoilerplateZone = false;

  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        isBold = true;
        break;
      case 'italic':
        isItalic = true;
        break;
      case 'boilerplateZone':
        hasBoilerplateZone = true;
        break;
      case 'trackInsert':
      case 'trackDelete':
        // Strip these marks in clean accepted state
        break;
    }
  }

  return new TextRun({
    text,
    bold: isBold || undefined,
    italics: isItalic || undefined,
    shading: hasBoilerplateZone
      ? { type: ShadingType.CLEAR, fill: 'D9D9D9' }
      : undefined,
  });
}

/**
 * Convert a hardBreak node into a TextRun with break.
 */
function hardBreakToTextRun(): TextRun {
  return new TextRun({
    break: 1,
  });
}

/**
 * Collect TextRuns from child nodes (typically text nodes with marks).
 */
function getTextRunsFromChildren(
  children: ProseMirrorNode[] | undefined
): TextRun[] {
  if (!children) return [];

  const runs: TextRun[] = [];
  for (const child of children) {
    if (child.type === 'text') {
      const run = textRunFromNode(child);
      if (Array.isArray(run)) {
        runs.push(...run);
      } else {
        runs.push(run);
      }
    } else if (child.type === 'hardBreak') {
      runs.push(hardBreakToTextRun());
    }
  }
  return runs;
}

/**
 * Convert a paragraph node to a docx Paragraph.
 */
function paragraphNodeToDocx(node: ProseMirrorNode): Paragraph {
  const runs = getTextRunsFromChildren(node.content);

  const hasBoilerplateZone =
    !!node.attrs?.boilerplateZone ||
    (node.content ?? []).some((child) =>
      (child.marks ?? []).some((m) => m.type === 'boilerplateZone'),
    );

  return new Paragraph({
    style: 'Normal',
    children: runs.length > 0 ? runs : [new TextRun('')],
    ...(hasBoilerplateZone
      ? { shading: { type: ShadingType.CLEAR, fill: 'F3F4F6' } }
      : {}),
  });
}

/**
 * Convert a heading node to a docx Paragraph with heading level.
 */
function headingNodeToDocx(node: ProseMirrorNode): Paragraph {
  const level = (node.attrs?.level as number) || 1;
  const headingStyleMap: Record<number, string> = {
    1: 'Heading1',
    2: 'Heading2',
    3: 'Heading3',
    4: 'Heading4',
    5: 'Heading5',
    6: 'Heading6',
  };

  const runs = getTextRunsFromChildren(node.content);
  return new Paragraph({
    style: headingStyleMap[level] ?? 'Heading1',
    children: runs.length > 0 ? runs : [new TextRun('')],
  });
}

/**
 * Convert a tableCell node to a docx TableCell.
 */
function tableCellNodeToDocx(node: ProseMirrorNode): TableCell {
  const children: Paragraph[] = [];
  if (node.content) {
    for (const child of node.content) {
      if (child.type === 'paragraph') {
        children.push(paragraphNodeToDocx(child));
      } else if (child.type === 'heading') {
        children.push(headingNodeToDocx(child));
      }
    }
  }

  // Ensure at least one paragraph
  if (children.length === 0) {
    children.push(new Paragraph({}));
  }

  const borderOptions = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: '000000',
  };

  return new TableCell({
    children,
    borders: {
      top: borderOptions,
      bottom: borderOptions,
      left: borderOptions,
      right: borderOptions,
    },
  });
}

/**
 * Convert a tableRow node to a docx TableRow.
 */
function tableRowNodeToDocx(node: ProseMirrorNode): TableRow {
  const cells: TableCell[] = [];
  let isHeaderRow = false;
  if (node.content) {
    for (const cell of node.content) {
      if (cell.type === 'tableCell' || cell.type === 'tableHeader') {
        if (cell.type === 'tableHeader') {
          isHeaderRow = true;
        }
        cells.push(tableCellNodeToDocx(cell));
      }
    }
  }

  return new TableRow({
    children: cells,
    tableHeader: isHeaderRow,
  });
}

/**
 * Convert a table node to a docx Table.
 */
function tableNodeToDocx(node: ProseMirrorNode): Table {
  const rows: TableRow[] = [];
  let columnCount = 1;
  if (node.content) {
    for (const row of node.content) {
      if (row.type === 'tableRow') {
        // Count columns from the first row
        if (rows.length === 0 && row.content) {
          const colsInRow = row.content.filter(
            (c) => c.type === 'tableCell' || c.type === 'tableHeader',
          ).length;
          if (colsInRow > 0) {
            columnCount = colsInRow;
          }
        }
        rows.push(tableRowNodeToDocx(row));
      }
    }
  }

  // Distribute 9638 twips (standard letter page minus margins) evenly across columns
  const colWidth = Math.floor(9638 / columnCount);
  const columnWidths = Array<number>(columnCount).fill(colWidth);

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths,
    layout: TableLayoutType.FIXED,
  });
}

/**
 * Recursively convert a ProseMirror node tree into docx block elements.
 * Returns an array of Paragraph or Table nodes suitable for Document.sections[].children.
 */
function nodeToDocxChildren(node: ProseMirrorNode): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];

  if (node.type === 'doc' && node.content) {
    for (const child of node.content) {
      if (child.type === 'paragraph') {
        children.push(paragraphNodeToDocx(child));
      } else if (child.type === 'heading') {
        children.push(headingNodeToDocx(child));
      } else if (child.type === 'table') {
        children.push(tableNodeToDocx(child));
      }
      // Unknown node types are gracefully skipped
    }
  }

  return children;
}

/**
 * Convert a ProseMirror/TipTap JSON doc object into a docx.Document instance.
 * @param doc The ProseMirror document object (type === "doc")
 * @returns A docx Document ready to be written or processed
 */
export function prosemirrorToDocx(doc: ProseMirrorDoc): Document {
  const children = nodeToDocxChildren(doc);

  return new Document({
    sections: [
      {
        children: children.length > 0 ? children : [new Paragraph({})],
      },
    ],
  });
}
