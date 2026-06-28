---
topic: "Assess package and dependency migration issues when moving from Node 20.20.2 to a newer Node version after AWS SDK v3 NodeVersionSupportWarning"
slug: node-22-migration-assessment
researched: 2026-06-28
sources: [./sources.md]
---

# Research: Node 22 Migration Assessment

The repo can move from Node 20.20.2 to Node 22 with manageable risk, but the practical target should be Node 22.13+ rather than generic Node 22 because `pdfjs-dist@6.0.227` declares `>=22.13.0 || >=24`. The AWS SDK warning is real future pressure: installed AWS SDK v3 packages currently require Node >=20, and AWS SDK v3 versions published after the first week of January 2027 are expected to require Node >=22. The larger migration risk is not Node itself; it is broad dependency ranges plus deployment and CI config that still pin Node 20.

## Research Questions

- Which workspace packages and deployment surfaces currently pin or imply Node 20?
- Which installed dependencies would block or complicate a Node 22 runtime?
- Does the warning indicate an immediate break, or a future dependency floor?
- What verification passed under Node 22.13.1, and what remains blocked?
- What should be changed before adopting Node 22 as the standard runtime?

## Current State (Codebase)

The repo is a pnpm workspace with `packages/api`, `packages/web`, and `packages/db` under `pnpm-workspace.yaml`; root `package.json` declares `packageManager: pnpm@9.0.0` and no `engines.node` constraint [S1][S2]. None of the package manifests declare `engines.node`, so local and CI runtime selection is controlled outside package metadata [S1][S3][S4][S5].

Deployment is still Node 20. `template.yaml` sets `Globals.Function.Runtime: nodejs20.x`, every Lambda function repeats `Runtime: nodejs20.x`, and the DB Lambda layer uses `CompatibleRuntimes: nodejs20.x` plus `BuildMethod: nodejs20.x` [S6]. The API bundler also targets Node 20 in `packages/api/scripts/build-handlers.mjs`, which keeps emitted handler bundles aligned with the current Lambda runtime rather than Node 22 [S7].

The API package uses AWS SDK v3 clients for S3, Textract, DynamoDB, Bedrock Runtime, Comprehend, Comprehend Medical, API Gateway Management API, and S3 presigning [S3]. The lockfile-resolved AWS SDK packages are already around `3.1073.0` to `3.1075.0`, so the warning is coming from recent SDK packages rather than old v3 releases [S8].

The web package uses Vite 5.4.21, Vitest 2.1.9, Playwright 1.61.1, React 18.3.1, Tailwind 3.4.19, and TypeScript 5.9.3 in the current lockfile [S8]. The DB package uses Prisma CLI/client 5.22.0 and a schema with `binaryTargets = ["native", "rhel-openssl-3.0.x"]`, which is appropriate to re-test for Lambda Linux but is not itself a Node 22 blocker [S5][S9].

## Key Findings

- Recommended runtime target: Node 22.13+ as the minimum local/CI target. `pdfjs-dist@6.0.227` declares `node >=22.13.0 || >=24`, and API parsing code depends on PDF tooling via structured parser/document detection paths [S10].
- The AWS SDK warning is a future package-publish floor, not an immediate runtime failure on the current lockfile. Current `@aws-sdk/client-s3@3.1075.0` declares `node >=20.0.0`, but the warning says versions after early January 2027 require Node >=22 [S11][S12].
- Production will not migrate until SAM changes are made. Local Node 22, package installs, and CI updates do not change deployed Lambda runtime while `template.yaml` explicitly says `nodejs20.x` throughout [S6].
- WebSocket sync has a Lambda parity risk: the API build externalizes `@aws-sdk/client-dynamodb` and `@aws-sdk/client-apigatewaymanagementapi`, so that handler can depend on the SDK included in the Lambda runtime rather than the locked workspace version [S7]. Package required AWS SDK clients for deterministic behavior before or during the runtime bump.
- `@types/node: "*"` resolves to `26.0.0` in API and DB, newer than both Node 20 and Node 22. That can mask runtime API usage that is not actually present in the target Lambda runtime [S3][S5][S8].
- Major package upgrades should be decoupled from the Node migration. `pnpm outdated -r` shows major-release pressure for Prisma 7, Vite 8, Vitest 4, React 19, React Router 7, Tailwind 4, TypeScript 6, and ESLint 10 [S13]. Those are not required to move to Node 22 and should be planned separately.
- Prisma 5.22 is compatible with the current Node 22 migration path, but Prisma 7 has a higher Node and pnpm floor and generator/runtime changes, so it should not be bundled with this change [S14].
- Vite 5 supports Node 18+/20+ and works under Node 22. Vite 7/8 raise their floor to Node 20.19+ or 22.12+, reinforcing that Node 22.13+ is a good target if major tooling upgrades happen later [S15].

## Verification Performed

All commands below were run with `npx -y -p node@22.13.1 -p pnpm@9 ...` so they exercised Node 22.13.1 without changing the machine default runtime.

| Check | Result | Notes |
|---|---|---|
| `pnpm typecheck` | Pass | All three workspace packages typechecked under Node 22.13.1 [S16]. |
| `pnpm --filter @demand-letter/api build` | Pass | Built 31 handlers under Node 22.13.1 [S17]. |
| `pnpm --filter @demand-letter/web build` | Pass | Vite production build passed, with existing CJS Vite API and `MODULE_TYPELESS_PACKAGE_JSON` warnings [S18]. |
| `pnpm --filter @demand-letter/db db:generate` | Pass | Prisma Client v5.22.0 generated under Node 22.13.1 [S19]. |
| `pnpm --filter @demand-letter/api test` | Blocked after unit tests | Most tests ran, but default API test command also collected integration tests that require `DATABASE_URL`; failure was Prisma env initialization, not a Node 22 runtime error [S20]. |
| `pnpm --filter @demand-letter/web test` | Blocked | Vitest collected `e2e/e2e.spec.ts`, which uses Playwright `test.describe`; this is a suite layout/config issue, not a Node 22 runtime error [S21]. |
| `pnpm lint` | Fails existing lint gates | One API lint error plus many warnings; not Node-specific, but blocks a clean migration gate [S22]. |

## Constraints

- Keep Node migration separate from dependency major upgrades.
- Update all explicit Lambda runtime entries, not only the SAM global runtime.
- Use Node 22.13+ minimum because of `pdfjs-dist`.
- Pin Node type definitions to the adopted target runtime, not `*`.
- Re-test PDF parsing/document detection and Prisma generation in the SAM/container path, not only local Node.
- Do a clean install after changing Node because Rollup/esbuild/Playwright use platform-specific packages and browser binaries.

## Recommendation

Adopt Node 22.13+ as the next standard runtime, but treat it as a staged migration:

1. Add explicit Node version policy: root `engines.node` such as `>=22.13 <23`, `.nvmrc` or `.node-version`, and CI `setup-node` update to Node 22.13+.
2. Pin `@types/node` to the target major, preferably `^22`, in API and DB instead of `*`.
3. Update SAM only when ready to verify deployment parity: change all `nodejs20.x` runtimes, `CompatibleRuntimes`, `BuildMethod`, and API esbuild target to Node 22.
4. Bundle or intentionally pin all AWS SDK clients used by handlers, especially the WebSocket handler clients currently externalized from the bundle.
5. Run the full clean verification suite on Node 22.13+: frozen install, typecheck, build, unit tests, Prisma generation, lint, web tests, Playwright with backend stack, and SAM local/container validation.
6. Plan separate tasks for major dependency migrations: Prisma 7, Vite/Vitest, ESLint/typescript-eslint, React/React Router, Tailwind, and TypeScript 6.

## Next Steps

- Create an implementation task to migrate repo runtime policy, CI, Node typings, SAM template runtimes, and API build target to Node 22.13+.
- Create a separate follow-up task to clean test separation: API unit vs integration tests, and Vitest excluding Playwright e2e specs.
- Create a separate dependency-modernization roadmap for major package upgrades after the Node runtime migration is stable.
