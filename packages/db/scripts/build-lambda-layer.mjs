import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');
const layerRoot = join(packageRoot, 'nodejs');
const layerModules = join(layerRoot, 'node_modules');
const require = createRequire(import.meta.url);

function copyPackage(packageName, destination) {
  const packageJson = require.resolve(`${packageName}/package.json`);
  const source = dirname(packageJson);
  cpSync(source, destination, { recursive: true, dereference: true });
  return source;
}

rmSync(layerRoot, { recursive: true, force: true });
mkdirSync(join(layerModules, '@prisma'), { recursive: true });
mkdirSync(join(layerModules, '.prisma'), { recursive: true });

const prismaClientPackage = copyPackage('@prisma/client', join(layerModules, '@prisma', 'client'));

const generatedClient = join(prismaClientPackage, '..', '..', '.prisma', 'client');
if (!existsSync(generatedClient)) {
  throw new Error(`Generated Prisma client not found at ${generatedClient}`);
}

cpSync(generatedClient, join(layerModules, '.prisma', 'client'), {
  recursive: true,
  dereference: true,
});

console.log(`Built Prisma Lambda layer at ${layerRoot}`);
