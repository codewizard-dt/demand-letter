# Strict TypeScript & ESLint Configuration

## TypeScript strict mode enabled

Root `/tsconfig.json` includes all strict flags:
- `strict: true` (base 8 flags)
- `noUncheckedIndexedAccess: true` — array[i] returns T|undefined
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `noImplicitOverride: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

**Important**: Root config uses `module: commonjs` + `moduleResolution: node` (CMS mode, server+db inherit), so NO `verbatimModuleSyntax` (incompatible with CJS).

### Frontend TypeScript: three-file split

- `app/frontend/tsconfig.json` — coordinator only (empty files, references)
- `app/frontend/tsconfig.app.json` — browser app: `module: ESNext`, `moduleResolution: bundler`, `verbatimModuleSyntax: true`, `exactOptionalPropertyTypes: true`, `react-jsx`, vite/client types
- `app/frontend/tsconfig.node.json` — vite.config.ts only

**Frontend build commands**: Use `tsc -b` (not `tsc --noEmit`) to follow project references:
```json
{
  "build": "tsc -b && vite build",
  "typecheck": "tsc -b --noEmit"
}
```

## ESLint strict type-aware linting

`eslint.config.js` uses:
- `typescript-eslint@8` unified package (not separate plugin/parser)
- `tseslint.configs.strictTypeChecked` + `stylisticTypeChecked`
- `parserOptions.projectService: true` — **critical** for type-aware rules to work
- No `"warn"` downgrades; all rules are `'error'` or `'off'`

**Dependencies**: `@eslint/js@^9`, `globals@^16`, `typescript-eslint@^8`

## Code fixes applied

Both packages had ~76 errors that needed fixing to satisfy strict mode:

### Server (app/server)
- Route params (`req.params.jobId`, etc.) guarded early: `if (!jobId) return errorJson(...)` before use
- Array indexing: `arr[i]` → `arr[i] ?? fallback` or explicit length checks
- Regex captures: `match[1]` → `const x = match[1]; if (!x) continue`

### Frontend (app/frontend)
- `exactOptionalPropertyTypes`: Props with optional fields changed from `field: string | undefined` to `field?: string`, callers use conditional spread `{...(value ? { field: value } : {})}`
- `verbatimModuleSyntax`: Type-only imports changed from `import { Type }` to `import type { Type }`
- `noUncheckedIndexedAccess`: Array access guarded with `?? fallback` or explicit checks
- Spread optional object properties in fetch RequestInit to avoid `undefined` values

## Future ESLint fixes

The strict config now surfaces ~150+ pre-existing lint errors (mostly `restrict-template-expressions`, `no-confusing-void-expression`, `consistent-type-definitions`). These are legitimate code quality issues that will need to be addressed incrementally.
