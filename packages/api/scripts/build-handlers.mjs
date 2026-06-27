import { build } from 'esbuild';
import { readdirSync } from 'fs';
import { join } from 'path';

const SRC = 'src/handlers';
const OUT = '../../.build/handlers';

const entries = readdirSync(SRC)
  .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .map(f => join(SRC, f));

const wsSync = entries.filter(f => f.includes('websocket-sync'));
const rest = entries.filter(f => !f.includes('websocket-sync'));

// pdfjs-dist (used by pdf-parse@2.x) references browser globals at module init time.
// Inject polyfills as a banner so they exist before any module code runs.
const pdfJsPolyfill = `
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = function DOMMatrix() { this.a=1;this.b=0;this.c=0;this.d=1;this.e=0;this.f=0; };
  globalThis.DOMMatrix.fromMatrix = function() { return new globalThis.DOMMatrix(); };
  globalThis.DOMMatrix.prototype = {
    multiply: function() { return this; }, translate: function() { return this; },
    scale: function() { return this; }, rotate: function() { return this; },
    invertSelf: function() { return this; },
    transformPoint: function(p) { return p || {x:0,y:0}; },
    toString: function() { return 'matrix(1,0,0,1,0,0)'; },
  };
}
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = function ImageData(w,h) { this.width=w||0; this.height=h||0; this.data=new Uint8ClampedArray((w||0)*(h||0)*4); };
}
if (typeof globalThis.Path2D === 'undefined') { globalThis.Path2D = function Path2D() {}; }
`.trim();

const base = { bundle: true, platform: 'node', target: 'node20', outdir: OUT };

await build({ ...base, entryPoints: wsSync, external: ['@aws-sdk/client-dynamodb', '@aws-sdk/client-apigatewaymanagementapi'] });
await build({ ...base, entryPoints: rest, external: ['@prisma/client'], banner: { js: pdfJsPolyfill } });

console.log(`Built ${entries.length} handlers → ${OUT}`);
