---
id: vitest
title: Vitest
aliases: [vitest]
updated: 2026-06-26
sources:
  - ../../../raw/research/api-test-strategy/index.md
tags: [testing, vite, typescript, node]
---

# Vitest

relates_to::[[../../sources/api-testing-strategy.md]] | relates_to::[[aws-sdk-client-mock.md]] | relates_to::[[vitest-mock-extended.md]]

Vitest is a next-generation testing framework powered by Vite. It is Jest-compatible (same `describe/it/expect` API) and supports ESM, TypeScript, and JSX out of the box with no transpilation config. **`packages/web` already uses Vitest 2.x** (`"vitest": "^2.0.0"`) as its test runner with `"test": "vitest run"`.

**Role in this project:** Vitest is the chosen test runner for both the `web` and `api` packages. For `packages/api` (Node.js Lambda backend), a `vitest.config.ts` must specify `test.environment = 'node'` (not `jsdom`) to avoid browser API shims that break AWS SDK and Prisma imports. The `@vitest/coverage-v8` plugin provides V8-based coverage reporting. Key Vitest module-mock APIs: `vi.mock('<module>')` for module-level fakes, `vi.fn()` for function stubs, `vi.resetAllMocks()` in `beforeEach` for test isolation.
