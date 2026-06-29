---
topic: "the maximum version of node that would not have any pcompiatiyly issues and upgrade all services to that same version"
slug: node-24-runtime-upgrade
researched: 2026-06-29
sources: [./sources.md]
---

# Research: Node 24 Runtime Upgrade

Node 24 is the maximum Node major that can be applied consistently across this repo without stepping outside managed deployment support. AWS Lambda currently supports `nodejs24.x` on Amazon Linux 2023, Node's own release guidance says production apps should use Active or Maintenance LTS releases, and this repo's resolved core tooling accepts Node 24 by package metadata. Node 26 is not appropriate yet because Lambda lists Node.js 26 only as an upcoming runtime target, not a supported managed runtime. I upgraded local, CI, Lambda, build, and TypeScript runtime metadata to Node 24.

## Research Questions

- What is the highest Node major currently supported by the repo's deployment target?
- Do the repo's key dependencies declare compatibility with Node 24?
- Which repo files encode Node runtime or type-version policy today?
- What edits are needed so frontend, server, db, CI, and Lambda services use the same Node version?
- What verification is needed after the upgrade?

## Current State (Codebase)

Prior research under `raw/research/node-22-migration-assessment/index.md` concluded Node 22.13+ was the safe target at that time, mainly because `pdfjs-dist@6.0.227` required `>=22.13.0 || >=24` and Lambda/runtime surfaces still pinned Node 20 [S1]. The current app workspace has moved to `app/*`, but it still carried Node 20 deployment pins in `template.yaml`, CI used Node 20, app server handler bundling targeted `node20`, and package manifests used unbounded `@types/node: "*"` in server/db packages [S2][S3][S4][S5].

The repo also contains older `packages/*` manifests and a legacy API handler build script. Although the active workspace is `app/*`, those files still encoded Node type/runtime assumptions and were updated to avoid stale contradictory runtime policy [S6].

## Key Findings

- AWS Lambda now lists Node.js 24 as a supported runtime identifier, `nodejs24.x`, on Amazon Linux 2023 with a projected deprecation date of April 30, 2028 [S7]. It also lists Node.js 26 as an upcoming runtime target for November 2026, which makes Node 24 the maximum currently supported managed Lambda runtime [S7].
- Node's release guidance says production applications should only use Active LTS or Maintenance LTS releases [S8]. Node 24 is the current even-numbered LTS line; Node 26 is not yet a Lambda managed runtime and is not the right cross-service target for this app [S7][S8].
- The key installed packages do not block Node 24: Vite 5.4.21 and Vitest 2.1.9 declare `^18.0.0 || >=20.0.0`; Prisma 5.22 declares `>=16.13`; `pdfjs-dist@6.0.227` explicitly allows `>=24`; AWS SDK v3 packages declare `>=20.0.0` [S9].
- Lambda runtime handler style is compatible with Node 24's managed runtime expectations. A repo search found async `handler` exports and no callback-style handler usage such as `callback(`, `context.succeed`, or `context.fail` in the active app handlers [S10].
- The upgrade should pin Node type declarations to major 24. Before the change, `@types/node: "*"` resolved newer than the target runtime, which can mask use of APIs not actually available in the runtime [S2][S3].

## Constraints

- Do not use Node 26 as the standard yet because deployment would no longer match AWS Lambda's current managed runtime list.
- Keep dependency major upgrades separate from the runtime upgrade. Current Vite, Vitest, Prisma, AWS SDK, and pdfjs package metadata accepts Node 24.
- Keep all service surfaces aligned: local version files, package engines, CI, Lambda runtime declarations, Lambda layer compatibility, and esbuild targets.
- The root `.env` files remain out of scope for this change and were not read or modified.

## Solution Comparison

| Criteria | Node 22 | Node 24 | Node 26 |
|---|---|---|---|
| Approach | Conservative upgrade from Node 20 | Highest current managed Lambda runtime | Local/current runtime only |
| Pros | Already assessed; broad dependency support | Longest Lambda runway; satisfies all inspected package engines; removes Node 20 deprecation pressure | Matches this machine's installed Node |
| Cons | Shorter Lambda support window than Node 24 | Requires changing all runtime pins and validating Lambda/SAM | Not currently a Lambda managed runtime; higher compatibility risk |
| Complexity | Medium | Medium | High |
| Dependencies | No major upgrades required | No major upgrades required | Would likely require broader ecosystem validation |
| Codebase fit | Good | Best | Poor for deployment parity |
| Maintenance | Moderate | Lowest among current managed options | High |

## Recommendation

Use Node 24 as the repo-wide target:

- `nodejs24.x` for every Lambda runtime, layer compatible runtime, and SAM build method.
- `node24` as the esbuild target for handler bundles.
- `node-version: 24` in GitHub Actions.
- `.nvmrc` and `.node-version` set to `24`.
- `engines.node: >=24 <25` in every package manifest.
- `@types/node: ^24.0.0` in server/db/legacy package manifests.
- Add frontend `"type": "module"` so Vite/PostCSS/Tailwind ESM config files parse without Node 24 module warnings.

Risks and mitigations:

- AWS SAM local image availability for Node 24 should be validated before deployment. Mitigation: run `sam build`/`sam local` after installing a current SAM CLI.
- Lambda-included AWS SDK versions can change with runtime updates. Mitigation: continue bundling or layering the AWS SDK clients the handlers use, as AWS recommends including SDK modules for dependency control [S7].
- Node 24 engine enforcement will warn on machines still running Node 26 or Node 20. Mitigation: use `.nvmrc`/`.node-version` or `actions/setup-node` to select Node 24.

## Verification Performed

- `npx -y -p node@24 -p pnpm@9 node -v` resolved to `v24.18.0` [S11].
- `pnpm install` updated the lockfile; the only new warning was expected because the ambient shell still runs Node 26 while package engines now require Node 24 [S12].
- Under Node 24, `pnpm --filter @demand-letter/db db:generate` passed [S13].
- Under Node 24, server and frontend typechecks passed [S14].
- Under Node 24, `@demand-letter/server`, `@demand-letter/web`, and `@demand-letter/db` builds passed. The web build no longer emitted the Vite CJS or typeless package warning after adding frontend package module metadata [S15].
- `sam validate` accepted the updated `nodejs24.x` template. `sam validate --lint` still fails on pre-existing non-Node warnings: RDS PostgreSQL 16.3 deprecation and the default/empty Textract SNS topic ARN parameter [S16].

## Next Steps

- Run `sam build` with an AWS SAM CLI version that supports Node.js 24 build images, then test `sam local` if Lambda parity still matters.
- Restart local shells/dev servers under Node 24 rather than Node 26 to avoid engine warnings.
- Use the `wiki-ingest` skill on this report so the knowledge base supersedes the older Node 22 target with the Node 24 recommendation.
