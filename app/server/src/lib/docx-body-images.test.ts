import { describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import { listBodyImages, replaceBodyImage, addBodyImage, readImageSize } from './docx-body-images';

function pngBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  buf[0] = 0x89; buf[1] = 0x50; buf[2] = 0x4e; buf[3] = 0x47;
  buf[4] = 0x0d; buf[5] = 0x0a; buf[6] = 0x1a; buf[7] = 0x0a;
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function docxWithBodyImage(): Buffer {
  const zip = new PizZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    'word/document.xml',
    '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Body</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>',
  );
  zip.file(
    'word/_rels/document.xml.rels',
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>',
  );
  // A header image that must NOT be listed as a body image.
  zip.file(
    'word/_rels/header1.xml.rels',
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/></Relationships>',
  );
  zip.file('word/media/image1.png', pngBuffer(200, 100));
  zip.file('word/media/logo.png', pngBuffer(50, 50));
  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

describe('docx-body-images', () => {
  it('reads PNG/GIF/JPEG intrinsic sizes (PNG here)', () => {
    expect(readImageSize(pngBuffer(640, 480))).toEqual({ width: 640, height: 480 });
  });

  it('lists only body images, excluding header/footer images', () => {
    const images = listBodyImages(docxWithBodyImage());
    expect(images).toHaveLength(1);
    expect(images[0]?.target).toBe('word/media/image1.png');
    expect(images[0]?.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('replaces an existing body image in place', () => {
    const replacement = pngBuffer(10, 10);
    const out = replaceBodyImage(docxWithBodyImage(), 'word/media/image1.png', replacement);
    const stored = Buffer.from(new PizZip(out).file('word/media/image1.png')!.asUint8Array());
    expect(stored.equals(replacement)).toBe(true);
  });

  it('rejects an invalid replace target', () => {
    expect(() => replaceBodyImage(docxWithBodyImage(), 'word/../etc/passwd', pngBuffer(1, 1))).toThrow();
    expect(() => replaceBodyImage(docxWithBodyImage(), 'word/media/missing.png', pngBuffer(1, 1))).toThrow('image_not_found');
  });

  it('adds a body image: media file, relationship, content-type, and a drawing before sectPr', () => {
    const out = addBodyImage(docxWithBodyImage(), pngBuffer(1200, 600), 'image/png');
    const zip = new PizZip(out);

    // Media file added.
    expect(zip.file('word/media/added-image-1.png')).toBeTruthy();
    // Relationship added with a fresh id and correct target.
    const rels = zip.file('word/_rels/document.xml.rels')!.asText();
    const relId = /Id="(rId\d+)" Type="[^"]*\/image" Target="media\/added-image-1\.png"/.exec(rels)?.[1];
    expect(relId).toBeTruthy();
    // The drawing references that relationship.
    const doc = zip.file('word/document.xml')!.asText();
    expect(doc).toContain(`r:embed="${relId}"`);
    // Inserted before the trailing section properties.
    expect(doc.indexOf('<w:drawing')).toBeLessThan(doc.indexOf('<w:sectPr'));
    // Width capped to the 6-inch column (1200px would exceed it), aspect preserved (2:1).
    const cx = Number(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/.exec(doc)?.[1]);
    const cy = Number(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/.exec(doc)?.[2]);
    expect(cx).toBe(5486400);
    expect(cy).toBe(Math.round(5486400 / 2));
  });
});
