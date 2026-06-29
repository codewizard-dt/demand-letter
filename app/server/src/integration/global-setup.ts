import { execSync } from 'node:child_process'
import { join } from 'node:path'

const REPO_ROOT = join(__dirname, '../../../../')

const devUrl = process.env.DATABASE_URL ?? 'postgresql://davidtaylor@localhost:5432/demand_letter_dev'
const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  devUrl.replace(/\/([^/?#]+)(\?.*)?$/, '/demand_letter_test$2')

// Extract the DB name from the URL for createdb
const TEST_DB = TEST_DB_URL.match(/\/([^/?#]+)(\?.*)?$/)?.[1] ?? 'demand_letter_test'

export default async function setup() {
  // Create the test database if it does not already exist
  try {
    execSync(`createdb "${TEST_DB}"`, { stdio: 'pipe' })
    console.log(`[integration] Created test database: ${TEST_DB}`)
  } catch {
    // Database already exists — fine
  }

  // Apply Prisma migrations to the test database
  console.log(`[integration] Running migrations on ${TEST_DB_URL}`)
  execSync('pnpm --filter @demand-letter/db db:migrate', {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'inherit',
  })
  console.log('[integration] Migrations complete')
}
