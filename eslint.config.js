import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['**/dist/**', '**/.aws-sam/**', '**/node_modules/**', '**/*.gen.ts', '**/*.d.ts'],
  },

  // Source files: TypeScript (server, db, frontend)
  {
    files: ['app/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'error',
    },
  },

  // Browser-specific files (React frontend)
  {
    files: ['app/frontend/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Node/server files
  {
    files: ['app/server/src/**/*.{ts}', 'app/db/src/**/*.{ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Test files (relaxed rules)
  {
    files: ['**/*.{spec,test}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Config scripts
  {
    files: ['*.config.{js,ts,mjs,mts}', 'scripts/**/*.{js,ts}'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
