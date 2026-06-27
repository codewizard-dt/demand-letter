import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Long per-test timeout: Textract async processing can take 1-5 min, Bedrock generation ~1 min
  timeout: 8 * 60 * 1000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Start Vite dev server; backend (SAM local + Docker postgres) must be running separately.
  // VITE_API_URL is required: fetchLlmCosts() in api.ts uses import.meta.env.VITE_API_URL
  // directly (not the API_BASE constant), so it would produce "http://undefined/..." without it.
  webServer: {
    command: 'VITE_API_URL=http://localhost:3000 pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
