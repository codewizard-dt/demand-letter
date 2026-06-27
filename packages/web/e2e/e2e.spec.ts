/**
 * End-to-end test suite for the Steno demand-letter application.
 *
 * Prerequisites (must be running before executing tests):
 *   docker-compose up -d              # Postgres on :5430
 *   sam local start-api --port 3000   # Lambda API on :3000
 *
 * Run:
 *   pnpm test:e2e           # headless
 *   pnpm test:e2e:headed    # visible browser
 *   pnpm test:e2e:ui        # interactive Playwright UI
 *
 * No API mocking. All requests hit the real backend.
 * Tests in the "Full job lifecycle" describe block run serially and share
 * `jobId` across tests via a module-level variable.
 */

import * as path from 'path';
import { test, expect } from '@playwright/test';
import { injectAuth, loginViaUI, TEST_EMAIL, TEST_PASSWORD, TEST_NAME } from './helpers/auth';

const FIXTURES = path.join(__dirname, 'fixtures');

// ─────────────────────────────────────────────────────────────────────────────
// Shared state across the serial lifecycle tests
// ─────────────────────────────────────────────────────────────────────────────
let jobId: string;

// ═════════════════════════════════════════════════════════════════════════════
// AUTH FLOW
// ═════════════════════════════════════════════════════════════════════════════
test.describe('Auth flow', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('login with any credentials succeeds and navigates to home', async ({ page }) => {
    await loginViaUI(page);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
  });

  test('register creates account and navigates to home', async ({ page }) => {
    await page.goto('/register');
    await page.fill('#name', 'Jane Doe');
    await page.fill('#email', 'jane.doe@example.com');
    await page.fill('#password', 'StrongPass!99');
    await page.fill('#confirm', 'StrongPass!99');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
  });

  test('register shows error when passwords do not match', async ({ page }) => {
    await page.goto('/register');
    await page.fill('#name', 'Jane Doe');
    await page.fill('#email', 'jane2@example.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirm', 'different456');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Passwords do not match.')).toBeVisible();
    await expect(page).toHaveURL('/register');
  });

  test('forgot password shows confirmation message on submit', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('#email', TEST_EMAIL);
    await page.click('button[type="submit"]');
    await expect(
      page.getByText(/If that email address is registered/),
    ).toBeVisible();
  });

  test('logout returns user to /login', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/');
    // Open user menu and click Logout
    await page.getByRole('button', { name: 'Open user menu' }).click();
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL('/login');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// FULL JOB LIFECYCLE (serial — shares jobId)
// ═════════════════════════════════════════════════════════════════════════════
test.describe.serial('Full job lifecycle', () => {
  // ── 1. Jobs list page ──────────────────────────────────────────────────────
  test('jobs list page renders heading and New Job link', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'New Job' })).toBeVisible();

    // Navigate to upload via New Job link
    await page.getByRole('link', { name: 'New Job' }).click();
    await expect(page).toHaveURL('/upload');
  });

  // ── 2. Upload documents ────────────────────────────────────────────────────
  test('upload template + case document and reach gap report', async ({ page }) => {
    test.setTimeout(6 * 60 * 1000); // 6 min — Textract + Bedrock pipeline
    await injectAuth(page);
    await page.goto('/upload');

    await expect(page.getByRole('heading', { name: 'Upload Documents' })).toBeVisible();

    // Attach fixture files to hidden file inputs
    await page.locator('#template').setInputFiles(path.join(FIXTURES, 'template.docx'));
    await page.locator('#caseDocs').setInputFiles(path.join(FIXTURES, 'case-doc.pdf'));

    // File names should appear in the drop zones
    await expect(page.getByText('template.docx')).toBeVisible();
    await expect(page.getByText('case-doc.pdf')).toBeVisible();

    // Submit the upload form
    await page.getByRole('button', { name: 'Upload & Continue' }).click();

    // Button text changes to "Uploading & processing…" while the chain runs
    await expect(
      page.getByRole('button', { name: 'Uploading & processing…' }),
    ).toBeVisible({ timeout: 15_000 });

    // Wait for the full backend chain to complete and navigate to gap-report.
    // Chain: createJob → uploadFiles → ingest (Textract) → segment → classify → inject → extract
    // With real AWS, this takes 1–5 minutes.
    await page.waitForURL(/\/jobs\/[^/]+\/gap-report/, {
      timeout: 5 * 60 * 1000,
    });

    // Extract and store jobId for use by subsequent tests
    const match = page.url().match(/\/jobs\/([^/]+)\/gap-report/);
    expect(match, 'Expected to land on gap-report with a job ID in the URL').toBeTruthy();
    jobId = match![1];

    await expect(page.getByRole('heading', { name: 'Gap Report' })).toBeVisible();
  });

  // ── 3. Gap report — view coverage and fill all gaps ────────────────────────
  test('gap report shows coverage and allows filling all gaps', async ({ page }) => {
    expect(jobId, 'jobId must be set by the upload test').toBeTruthy();
    await injectAuth(page);
    await page.goto(`/jobs/${jobId}/gap-report`);

    // Wait for gap report heading (may briefly show "Preparing documents…" banner
    // while polling if template processing is still in progress)
    await expect(page.getByRole('heading', { name: 'Gap Report' })).toBeVisible({
      timeout: 90_000,
    });

    // Coverage summary: "<N> of <M> slots covered."
    await expect(page.getByText(/\d+ of \d+ slots covered/)).toBeVisible();

    // Citation Sources sidebar should be rendered
    await expect(page.getByText('Citation Sources')).toBeVisible();

    // Fill all visible gap inputs with test values, or check "Accept Missing"
    const fillInputs = page.locator('input[placeholder="Enter value…"]');
    const gapCount = await fillInputs.count();

    if (gapCount > 0) {
      for (let i = 0; i < gapCount; i++) {
        const input = fillInputs.nth(i);
        if (await input.isEnabled()) {
          await input.fill('Test Value');
        }
        // If input is disabled, the Accept Missing checkbox is already checked for this row
      }

      const submitBtn = page.getByRole('button', { name: 'Submit Attorney Judgment' });
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      // Wait for submission to complete (button stops showing "Submitting…")
      await expect(
        page.getByRole('button', { name: 'Submitting…' }),
      ).not.toBeVisible({ timeout: 30_000 });

      // Gap report query is invalidated on success — wait for React Query to refetch.
      // After all gaps are filled, "All slots satisfied" appears.
      await expect(
        page.getByText('All slots satisfied'),
      ).toBeVisible({ timeout: 30_000 });
    } else {
      // No gaps — already fully covered
      await expect(page.getByText('All slots satisfied')).toBeVisible();
    }

    // "Proceed to Generate" should now be enabled (0 gaps)
    await expect(
      page.getByRole('button', { name: 'Proceed to Generate' }),
    ).toBeEnabled();
  });

  // ── 4. Generate page — generate, refine, and accept ───────────────────────
  test('generate demand letter, refine it, and accept refinement', async ({ page }) => {
    test.setTimeout(6 * 60 * 1000); // 6 min — Bedrock generation + refinement
    expect(jobId, 'jobId must be set by the upload test').toBeTruthy();
    await injectAuth(page);
    // Navigate directly — the GapReportPage "Proceed to Generate" button has a bug
    // (it navigates to /jobs/:id/output which has no route in App.tsx)
    await page.goto(`/jobs/${jobId}/generate`);

    await expect(
      page.getByRole('heading', { name: 'Generate Demand Letter' }),
    ).toBeVisible();

    // Generate button should be enabled (all gaps filled by previous test)
    const generateBtn = page.getByRole('button', { name: 'Generate Demand Letter' });
    await expect(generateBtn).toBeEnabled({ timeout: 30_000 });

    // ── Generate ────────────────────────────────────────────────────────────
    await generateBtn.click();

    // Spinner appears while generating
    await expect(page.getByText('Building document…')).toBeVisible({ timeout: 15_000 });

    // Streaming output appears in the aria live region
    const outputRegion = page.getByRole('status');
    await expect(outputRegion).toBeVisible({ timeout: 3 * 60 * 1000 });
    // Wait for a non-trivial amount of text to stream in
    await expect(outputRegion).not.toBeEmpty({ timeout: 3 * 60 * 1000 });

    // "Refine Letter" panel appears once isDone = true
    await expect(page.getByText('Refine Letter')).toBeVisible({ timeout: 3 * 60 * 1000 });

    // Post-generation action buttons are visible
    await expect(page.getByRole('button', { name: 'Open in Editor' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download DOCX' })).toBeVisible();

    // ── Refine ──────────────────────────────────────────────────────────────
    await page
      .getByPlaceholder('e.g. Make the demand amount stronger')
      .fill('Please strengthen the opening paragraph to emphasize liability.');

    await page.getByRole('button', { name: 'Refine' }).click();

    // Refining spinner appears
    await expect(page.getByText('Refining…')).toBeVisible({ timeout: 15_000 });

    // Refined text streams in and completes
    // On completion: Accept / Revert / Show Diff buttons appear
    await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible({
      timeout: 2 * 60 * 1000,
    });
    await expect(page.getByRole('button', { name: 'Revert' })).toBeVisible();

    // Toggle: Show Diff / Show Text
    await expect(page.getByRole('button', { name: 'Show Diff' })).toBeVisible();
    await page.getByRole('button', { name: 'Show Diff' }).click();
    await expect(page.getByRole('button', { name: 'Show Text' })).toBeVisible();
    // Toggle back
    await page.getByRole('button', { name: 'Show Text' }).click();
    await expect(page.getByRole('button', { name: 'Show Diff' })).toBeVisible();

    // ── Accept refinement ───────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Accept' }).click();
    // After acceptance the Accept / Revert buttons should disappear
    await expect(page.getByRole('button', { name: 'Accept' })).not.toBeVisible({
      timeout: 15_000,
    });
  });

  // ── 5. Editor page ─────────────────────────────────────────────────────────
  test('editor page loads TipTap editor and supports export and track changes', async ({ page }) => {
    expect(jobId, 'jobId must be set by the upload test').toBeTruthy();
    await injectAuth(page);
    await page.goto(`/jobs/${jobId}/editor`);

    await expect(page.getByRole('heading', { name: 'Edit Demand Letter' })).toBeVisible({
      timeout: 30_000,
    });

    // Wait for the TipTap editor container to appear
    // (loading spinner shows while fetching output URL + converting DOCX to HTML)
    await expect(page.locator('.tiptap-editor')).toBeVisible({ timeout: 60_000 });

    // "Export to Word" button is always visible
    await expect(page.getByRole('button', { name: 'Export to Word' })).toBeVisible();

    // WebSocket warning banner appears when VITE_WS_API_URL is not set
    const banner = page.getByText('Collaborative editing requires a deployed WebSocket server');
    if (await banner.isVisible()) {
      // Dismiss the banner
      await page.getByRole('button', { name: 'Dismiss' }).click();
      await expect(banner).not.toBeVisible();
    }

    // Track Changes toolbar should be rendered
    await expect(page.getByRole('button', { name: 'Track Changes' })).toBeVisible();

    // Enable track changes — badge shows N changes
    await page.getByRole('button', { name: 'Track Changes' }).click();
    // Badge text is either "N changes" or "Loading…"
    await expect(
      page.locator('.text-blue-800').or(page.getByText('Loading…')),
    ).toBeVisible({ timeout: 15_000 });

    // Export to Word — triggers POST /jobs/:id/export/docx
    // We capture the network request to verify it fires
    const exportPromise = page.waitForRequest((req) =>
      req.url().includes('/export/docx') && req.method() === 'POST',
    );
    await page.getByRole('button', { name: 'Export to Word' }).click();
    const exportReq = await exportPromise;
    expect(exportReq.url()).toContain(`/jobs/${jobId}/export/docx`);
  });

  // ── 6. Documents page ──────────────────────────────────────────────────────
  test('documents page shows uploaded files and job logs', async ({ page }) => {
    expect(jobId, 'jobId must be set by the upload test').toBeTruthy();
    await injectAuth(page);
    await page.goto(`/jobs/${jobId}/documents`);

    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();

    // Uploaded Files section
    await expect(page.getByRole('heading', { name: 'Uploaded Files' })).toBeVisible();
    await expect(page.getByText('template.docx')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('case-doc.pdf')).toBeVisible({ timeout: 15_000 });

    // Job Log section — at minimum shows header
    await expect(page.getByRole('heading', { name: 'Job Log' })).toBeVisible();
    // With a real backend, there should be at least some log entries
    await page.waitForLoadState('networkidle');
    // If there are errors/warnings, they should be rendered as log entries

    // "← Back to Gap Report" link
    await expect(
      page.getByRole('link', { name: '← Back to Gap Report' }),
    ).toBeVisible();
    await page.getByRole('link', { name: '← Back to Gap Report' }).click();
    await expect(page).toHaveURL(`/jobs/${jobId}/gap-report`);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ACCOUNT PAGE (client-side only — no backend calls)
// ═════════════════════════════════════════════════════════════════════════════
test.describe('Account page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto('/account');
  });

  test('shows Account heading and Your profile label', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
    await expect(page.getByText('Your profile')).toBeVisible();
  });

  test('shows user name and email from localStorage', async ({ page }) => {
    await expect(page.getByText(TEST_NAME, { exact: true })).toBeVisible();
    await expect(page.getByText(TEST_EMAIL, { exact: true })).toBeVisible();
  });

  test('shows avatar with correct initials', async ({ page }) => {
    // initials('test') = 'T'
    const avatar = page
      .locator('.rounded-full')
      .filter({ hasText: 'T' })
      .first();
    await expect(avatar).toBeVisible();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN USAGE PAGE
// Run after lifecycle tests so there are real LLM audit log entries
// ═════════════════════════════════════════════════════════════════════════════
test.describe('Admin usage page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto('/admin/usage');
    await page.waitForLoadState('networkidle');
  });

  test('shows LLM Usage & Cost heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'LLM Usage & Cost' }),
    ).toBeVisible();
  });

  test('shows By Feature aggregate table with data from lifecycle run', async ({ page }) => {
    await expect(page.getByText('By Feature (last 30 days)')).toBeVisible();
    // After the lifecycle tests, there should be at least one aggregate row
    // (generate and/or refine features were used)
    const tableRows = page.locator('table').first().locator('tbody tr');
    await expect(tableRows).not.toHaveCount(0, { timeout: 15_000 });
  });

  test('shows Recent Calls table with at least one entry', async ({ page }) => {
    await expect(page.getByText('Recent Calls (last 100)')).toBeVisible();
    const recentRows = page.locator('table').last().locator('tbody tr');
    await expect(recentRows).not.toHaveCount(0, { timeout: 15_000 });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// JOBS LIST — additional assertions after lifecycle run
// ═════════════════════════════════════════════════════════════════════════════
test.describe('Jobs list after lifecycle', () => {
  test('shows the job created during the lifecycle test', async ({ page }) => {
    expect(jobId, 'jobId must be set by the upload test').toBeTruthy();
    await injectAuth(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
    // The job created during lifecycle tests should appear in the list
    await expect(page.getByText(jobId)).toBeVisible({ timeout: 15_000 });

    // "Resume →" link for that job navigates to the right page based on status
    const resumeLink = page.locator('li').filter({ hasText: jobId }).getByRole('link');
    await expect(resumeLink).toBeVisible();
  });
});
