---
id: TASK-001
title: "AWS SAM TypeScript Monorepo Scaffold"
status: done
created: 2026-06-23
updated: 2026-06-23 <!-- Completed: 2026-06-23 -->
depends_on: []
blocks: []
parallel_safe_with: []
uat: "[[UAT-001]]"
tags: [infra, sam, monorepo, pnpm]
---

# TASK-001 — AWS SAM TypeScript Monorepo Scaffold

## Objective

Initialize the AWS SAM project as a TypeScript monorepo managed by pnpm workspaces, with three packages: `api` (Lambda handlers), `web` (React frontend), and `db` (Prisma DB layer). This is the foundational scaffold that every subsequent task builds on.

## Approach

- pnpm workspaces at the root with `packages/*` glob
- Each package has its own `package.json` and `tsconfig.json` that extends a shared root config
- `template.yaml` at the root is the SAM entry point; it will be populated with resources by later tasks
- TypeScript strict mode is configured at the root and inherited; ESLint + Prettier are wired at the root level only (shared config, per-package `pnpm lint` scripts)
- The `db` package is the Prisma layer — schema and migrations live there; `api` imports from it as a Lambda layer candidate
- `web` is a Vite/React scaffold stub — Phase 4 fills in the UI; the package needs to exist now so workspace imports resolve

## Steps

### 1. Root workspace files <!-- agent: general-purpose -->

- [x] Create `package.json` at project root: <!-- Completed: 2026-06-23 -->
  ```json
  {
    "name": "demand-letter",
    "private": true,
    "version": "0.0.0",
    "packageManager": "pnpm@9.0.0",
    "scripts": {
      "build": "pnpm -r build",
      "typecheck": "pnpm -r typecheck",
      "lint": "pnpm -r lint",
      "format": "prettier --write ."
    },
    "devDependencies": {
      "typescript": "^5.4.0",
      "eslint": "^9.0.0",
      "@typescript-eslint/eslint-plugin": "^7.0.0",
      "@typescript-eslint/parser": "^7.0.0",
      "prettier": "^3.2.0"
    }
  }
  ```
- [x] Create `pnpm-workspace.yaml`: <!-- Completed: 2026-06-23 -->
  ```yaml
  packages:
    - 'packages/*'
  ```
- [x] Create `.npmrc`: <!-- Completed: 2026-06-23 -->
  ```
  shamefully-hoist=false
  strict-peer-dependencies=false
  ```

### 2. Root TypeScript config <!-- agent: general-purpose -->

- [x] Create `tsconfig.json` at project root: <!-- Completed: 2026-06-23 -->
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "target": "ES2022",
      "module": "commonjs",
      "moduleResolution": "node",
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true,
      "outDir": "dist"
    },
    "exclude": ["node_modules", "dist", ".aws-sam"]
  }
  ```

### 3. ESLint + Prettier config <!-- agent: general-purpose -->

- [x] Create `eslint.config.js` at project root: <!-- Completed: 2026-06-23 -->

  ```js
  import tseslint from '@typescript-eslint/eslint-plugin';
  import tsparser from '@typescript-eslint/parser';

  export default [
    {
      files: ['packages/**/*.ts'],
      languageOptions: { parser: tsparser },
      plugins: { '@typescript-eslint': tseslint },
      rules: {
        ...tseslint.configs.recommended.rules,
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
    },
    { ignores: ['**/dist/**', '**/.aws-sam/**', '**/node_modules/**'] },
  ];
  ```

- [x] Create `.prettierrc`: <!-- Completed: 2026-06-23 -->
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2
  }
  ```
- [x] Create `.prettierignore`: <!-- Completed: 2026-06-23 -->
  ```
  dist/
  .aws-sam/
  node_modules/
  ```

### 4. `packages/api` scaffold <!-- agent: general-purpose -->

- [x] Create `packages/api/package.json`: <!-- Completed: 2026-06-23 -->
  ```json
  {
    "name": "@demand-letter/api",
    "version": "0.0.0",
    "private": true,
    "main": "dist/index.js",
    "scripts": {
      "build": "tsc --project tsconfig.json",
      "typecheck": "tsc --noEmit",
      "lint": "eslint src --ext .ts"
    },
    "dependencies": {
      "@aws-sdk/client-bedrock-runtime": "^3.0.0",
      "@aws-sdk/client-s3": "^3.0.0",
      "@prisma/client": "^5.0.0"
    },
    "devDependencies": {
      "@types/aws-lambda": "^8.10.0",
      "typescript": "*"
    }
  }
  ```
- [x] Create `packages/api/tsconfig.json`: <!-- Completed: 2026-06-23 -->
  ```json
  {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "rootDir": "src",
      "outDir": "dist"
    },
    "include": ["src/**/*"]
  }
  ```
- [x] Create `packages/api/src/index.ts` (placeholder Lambda handler): <!-- Completed: 2026-06-23 -->

  ```ts
  import { APIGatewayProxyHandler } from 'aws-lambda';

  export const handler: APIGatewayProxyHandler = async () => {
    return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
  };
  ```

### 5. `packages/db` scaffold <!-- agent: general-purpose -->

- [x] Create `packages/db/package.json`: <!-- Completed: 2026-06-23 -->
  ```json
  {
    "name": "@demand-letter/db",
    "version": "0.0.0",
    "private": true,
    "main": "dist/index.js",
    "scripts": {
      "build": "tsc --project tsconfig.json",
      "typecheck": "tsc --noEmit",
      "lint": "eslint src --ext .ts",
      "db:generate": "prisma generate",
      "db:migrate": "prisma migrate deploy",
      "db:push": "prisma db push"
    },
    "dependencies": {
      "@prisma/client": "^5.0.0"
    },
    "devDependencies": {
      "prisma": "^5.0.0",
      "typescript": "*"
    }
  }
  ```
- [x] Create `packages/db/tsconfig.json`: <!-- Completed: 2026-06-23 -->
  ```json
  {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "rootDir": "src",
      "outDir": "dist"
    },
    "include": ["src/**/*"]
  }
  ```
- [x] Create `packages/db/src/index.ts` (re-exports Prisma client): <!-- Completed: 2026-06-23 -->
  ```ts
  export { PrismaClient } from '@prisma/client';
  export type { Prisma } from '@prisma/client';
  ```
- [x] Create `packages/db/prisma/schema.prisma` (minimal stub — Phase 1 content added by TASK-002): <!-- Completed: 2026-06-23 -->

  ```prisma
  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  ```

### 6. `packages/web` scaffold <!-- agent: general-purpose -->

- [x] Create `packages/web/package.json`: <!-- Completed: 2026-06-23 -->
  ```json
  {
    "name": "@demand-letter/web",
    "version": "0.0.0",
    "private": true,
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "typecheck": "tsc --noEmit",
      "lint": "eslint src --ext .ts,.tsx",
      "preview": "vite preview"
    },
    "dependencies": {
      "react": "^18.0.0",
      "react-dom": "^18.0.0"
    },
    "devDependencies": {
      "@types/react": "^18.0.0",
      "@types/react-dom": "^18.0.0",
      "@vitejs/plugin-react": "^4.0.0",
      "typescript": "*",
      "vite": "^5.0.0"
    }
  }
  ```
- [x] Create `packages/web/tsconfig.json`: <!-- Completed: 2026-06-23 -->
  ```json
  {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "target": "ES2020",
      "lib": ["ES2020", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "moduleResolution": "bundler",
      "jsx": "react-jsx",
      "rootDir": "src",
      "outDir": "dist",
      "noEmit": true
    },
    "include": ["src/**/*"]
  }
  ```
- [x] Create `packages/web/src/main.tsx` (stub): <!-- Completed: 2026-06-23 -->

  ```tsx
  import React from 'react';
  import ReactDOM from 'react-dom/client';

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <div>Demand Letter Generator — coming soon</div>
    </React.StrictMode>,
  );
  ```

- [x] Create `packages/web/index.html`: <!-- Completed: 2026-06-23 -->
  ```html
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Demand Letter Generator</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
    </body>
  </html>
  ```
- [x] Create `packages/web/vite.config.ts`: <!-- Completed: 2026-06-23 -->

  ```ts
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';

  export default defineConfig({
    plugins: [react()],
  });
  ```

### 7. SAM template <!-- agent: general-purpose -->

- [x] Create `template.yaml` at project root (minimal skeleton; resources added by later tasks): <!-- Completed: 2026-06-23 -->

  ```yaml
  AWSTemplateFormatVersion: '2010-09-09'
  Transform: AWS::Serverless-2016-10-31
  Description: Demand Letter Generator — SAM application

  Globals:
    Function:
      Runtime: nodejs20.x
      Architectures:
        - x86_64
      Environment:
        Variables:
          NODE_ENV: !Ref Stage

  Parameters:
    Stage:
      Type: String
      Default: dev
      AllowedValues: [dev, staging, prod]

  Resources:
    # Placeholder — Phase 1 resources (S3, RDS) added by TASK-003, TASK-004
    # API Gateway and Lambda resources added in Phase 3

  Outputs: {}
  ```

- [x] Create `samconfig.toml` at project root: <!-- Completed: 2026-06-23 -->

  ```toml
  version = 0.1

  [default]
  [default.global.parameters]
  stack_name = "demand-letter"

  [default.build.parameters]
  cached = true
  parallel = true

  [default.deploy.parameters]
  capabilities = "CAPABILITY_IAM"
  confirm_changeset = true
  resolve_s3 = true
  region = "us-east-1"
  ```

### 8. Git hygiene <!-- agent: general-purpose -->

- [x] Create `.gitignore` (replace or merge with existing): <!-- Completed: 2026-06-23 -->

  ```
  # Dependencies
  node_modules/
  .pnpm-store/

  # Build outputs
  dist/
  .aws-sam/

  # Environment — never commit
  .env
  .env.*
  !.env.example

  # AWS credentials / local config
  .aws/
  samconfig.local.toml

  # OS
  .DS_Store
  ```

- [x] Run `pnpm install` from project root to generate `pnpm-lock.yaml` and verify workspace resolution <!-- Completed: 2026-06-23 -->
- [x] Run `pnpm typecheck` to confirm TypeScript strict mode passes across all packages <!-- Completed: 2026-06-23 -->
- [x] Run `pnpm lint` to confirm ESLint passes on the stub files <!-- Completed: 2026-06-23 -->
