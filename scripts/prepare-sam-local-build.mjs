import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const templatePath = path.join(repoRoot, 'template.yaml');
const handlersDir = path.join(repoRoot, '.build', 'handlers');
const layerNodejsDir = path.join(repoRoot, 'packages', 'db', 'nodejs');
const samBuildDir = path.join(repoRoot, '.aws-sam', 'build');

if (!existsSync(handlersDir)) {
  throw new Error(`Missing bundled handlers at ${handlersDir}. Run the API build first.`);
}

if (!existsSync(layerNodejsDir)) {
  throw new Error(`Missing Prisma Lambda layer at ${layerNodejsDir}. Run the DB lambda-layer build first.`);
}

const template = readFileSync(templatePath, 'utf8');
const functionIds = [];
const resourceHeader = /^  ([A-Za-z0-9]+Function):\s*$/gm;

for (let match = resourceHeader.exec(template); match; match = resourceHeader.exec(template)) {
  const start = match.index;
  const nextResource = template.slice(start + match[0].length).search(/\n  [A-Za-z0-9]+:\s*$/m);
  const resourceBlock =
    nextResource === -1
      ? template.slice(start)
      : template.slice(start, start + match[0].length + nextResource);

  if (resourceBlock.includes('Type: AWS::Serverless::Function')) {
    functionIds.push(match[1]);
  }
}

if (functionIds.length === 0) {
  throw new Error(`No AWS::Serverless::Function resources found in ${templatePath}.`);
}

rmSync(samBuildDir, { force: true, recursive: true });
mkdirSync(samBuildDir, { recursive: true });

for (const functionId of functionIds) {
  cpSync(handlersDir, path.join(samBuildDir, functionId), {
    dereference: true,
    recursive: true,
  });
}

const dbLayerDir = path.join(samBuildDir, 'DbLayer');
mkdirSync(dbLayerDir, { recursive: true });
cpSync(layerNodejsDir, path.join(dbLayerDir, 'nodejs'), {
  dereference: true,
  recursive: true,
});

console.log(
  `Prepared SAM local build with ${functionIds.length} functions and DbLayer at ${path.relative(
    repoRoot,
    samBuildDir,
  )}`,
);
