import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const inspectModule = require('docxtemplater/js/inspect-module.js') as () => {
  getAllTags: () => Record<string, unknown>;
};

export function enumerateSlots(buffer: Buffer): string[] {
  const zip = new PizZip(buffer);
  const iModule = inspectModule();
  const doc = new Docxtemplater(zip, {
    modules: [iModule],
    paragraphLoop: true,
    linebreaks: true,
  });
  // InspectModule collects tags during compilation; no render() call needed
  doc.compile();
  const tags: Record<string, unknown> = iModule.getAllTags();
  return Object.keys(tags);
}
