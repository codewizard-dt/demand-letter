import { defineConfig } from 'vitest/config'

// Derive the test DB URL from DATABASE_URL, swapping the database name.
// Override by setting DATABASE_URL_TEST in the environment.
const devUrl = process.env.DATABASE_URL ?? 'postgresql://davidtaylor@localhost:5432/demand_letter_dev'
const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  devUrl.replace(/\/([^/?#]+)(\?.*)?$/, '/demand_letter_test$2')

export default defineConfig({
  resolve: { preserveSymlinks: true },
  test: {
    environment: 'node',
    include: ['src/integration/**/*.test.ts'],
    globalSetup: ['src/integration/global-setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 30_000,
    env: {
      DATABASE_URL: TEST_DB_URL,
      // The same S3 bucket used by SAM local — integration tests write to a per-job prefix
      // and clean up after themselves.
      DOCUMENTS_BUCKET: process.env.DOCUMENTS_BUCKET ?? 'dev-demand-letter-docs-429842292480',
      AWS_REGION: process.env.AWS_REGION ?? 'us-east-1',
      BEDROCK_MODEL_ID: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      NODE_ENV: 'test',
    },
    reporters: ['default', 'junit'],
    outputFile: { junit: 'test-results/integration-junit.xml' },
  },
})
