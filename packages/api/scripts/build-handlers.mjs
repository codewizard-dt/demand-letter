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

const base = { bundle: true, platform: 'node', target: 'node20', outdir: OUT };

await build({ ...base, entryPoints: wsSync, external: ['@aws-sdk/client-dynamodb', '@aws-sdk/client-apigatewaymanagementapi'] });
await build({ ...base, entryPoints: rest, external: ['@prisma/client'] });

console.log(`Built ${entries.length} handlers → ${OUT}`);
