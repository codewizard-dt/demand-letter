import * as path from 'path';
import { test, expect } from '@playwright/test';
import { injectAuth } from '../helpers/auth';
import { createLifecycleState, type LifecycleState } from '../support/lifecycle-state';

const FIXTURES = path.join(__dirname, '../fixtures');

export function defineFullJobLifecycleSuite(state: LifecycleState = createLifecycleState()): void {
  test.describe.serial('Full job lifecycle', () => {
    test('jobs list page renders heading and New Job link', async ({ page }) => {
      await injectAuth(page);
      await page.goto('/');

      await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'New Job' })).toBeVisible();
      await page.getByRole('link', { name: 'New Job' }).click();
      await expect(page).toHaveURL('/upload');
    });

    test('upload template, confirm parsing, upload case document, and reach gap report', async ({ page }) => {
      test.setTimeout(6 * 60 * 1000);
      await injectAuth(page);
      await page.goto('/upload');

      await expect(page.getByRole('heading', { name: 'Upload Template' })).toBeVisible();
      await page.locator('#template').setInputFiles(path.join(FIXTURES, 'template.docx'));
      await expect(page.getByText('template.docx')).toBeVisible();
      await Promise.all([
        page.waitForURL(/\/jobs\/[^/]+\/templates\/[^/]+\/annotate/, { timeout: 5 * 60 * 1000 }),
        page.getByRole('button', { name: 'Upload Template' }).click(),
      ]);

      await expect(page.getByRole('heading', { name: 'Review Template Parsing' })).toBeVisible();
      await expect(page.getByText('Sections')).toBeVisible();
      await page.getByRole('button', { name: 'Confirm All Sections' }).click();
      await page.getByRole('button', { name: 'Continue to Case Documents' }).click();

      await expect(page.getByRole('heading', { name: 'Upload Case Documents' })).toBeVisible();
      await page.locator('#caseDocs').setInputFiles(path.join(FIXTURES, 'case-doc.pdf'));
      await expect(page.getByText('case-doc.pdf')).toBeVisible();
      await Promise.all([
        page.waitForURL(/\/jobs\/[^/]+\/gap-report/, { timeout: 5 * 60 * 1000 }),
        page.getByRole('button', { name: 'Upload Case Documents' }).click(),
      ]);

      const match = page.url().match(/\/jobs\/([^/]+)\/gap-report/);
      expect(match, 'Expected to land on gap-report with a job ID in the URL').toBeTruthy();
      state.jobId = match![1];

      await expect(page.getByRole('heading', { name: 'Gap Report' })).toBeVisible();
    });

    test('gap report shows coverage and allows filling all gaps', async ({ page }) => {
      expect(state.jobId, 'jobId must be set by the upload test').toBeTruthy();
      await injectAuth(page);
      await page.goto(`/jobs/${state.jobId}/gap-report`);

      await expect(page.getByRole('heading', { name: 'Gap Report' })).toBeVisible({
        timeout: 90_000,
      });
      await expect(page.getByText(/\d+ of \d+ slots covered/)).toBeVisible();
      await expect(page.getByText('Citation Sources')).toBeVisible();

      const fillInputs = page.locator('input[placeholder="Enter value…"]');
      const gapCount = await fillInputs.count();

      if (gapCount > 0) {
        for (let i = 0; i < gapCount; i++) {
          const input = fillInputs.nth(i);
          if (await input.isEnabled()) {
            await input.fill('Test Value');
          }
        }

        const submitBtn = page.getByRole('button', { name: 'Submit Attorney Judgment' });
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();

        await expect(page.getByRole('button', { name: 'Submitting…' })).not.toBeVisible({
          timeout: 30_000,
        });
        await expect(page.getByText('All slots satisfied')).toBeVisible({ timeout: 30_000 });
      } else {
        await expect(page.getByText('All slots satisfied')).toBeVisible();
      }

      await expect(page.getByRole('button', { name: 'Proceed to Generate' })).toBeEnabled();
    });

    test('generate demand letter, refine it, and accept refinement', async ({ page }) => {
      test.setTimeout(6 * 60 * 1000);
      expect(state.jobId, 'jobId must be set by the upload test').toBeTruthy();
      await injectAuth(page);
      await page.goto(`/jobs/${state.jobId}/generate`);

      await expect(page.getByRole('heading', { name: 'Generate Demand Letter' })).toBeVisible();

      const generateBtn = page.getByRole('button', { name: 'Generate Demand Letter' });
      await expect(generateBtn).toBeEnabled({ timeout: 30_000 });
      await generateBtn.click();

      await expect(page.getByText('Building document…')).toBeVisible({ timeout: 15_000 });
      const outputRegion = page.getByRole('status');
      await expect(outputRegion).toBeVisible({ timeout: 3 * 60 * 1000 });
      await expect(outputRegion).not.toBeEmpty({ timeout: 3 * 60 * 1000 });
      await expect(page.getByText('Refine Letter')).toBeVisible({ timeout: 3 * 60 * 1000 });
      await expect(page.getByRole('button', { name: 'Open in Editor' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Download DOCX' })).toBeVisible();

      await page
        .getByPlaceholder('e.g. Make the demand amount stronger')
        .fill('Please strengthen the opening paragraph to emphasize liability.');

      await page.getByRole('button', { name: 'Refine' }).click();
      await expect(page.getByText('Refining…')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible({
        timeout: 2 * 60 * 1000,
      });
      await expect(page.getByRole('button', { name: 'Revert' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Show Diff' })).toBeVisible();
      await page.getByRole('button', { name: 'Show Diff' }).click();
      await expect(page.getByRole('button', { name: 'Show Text' })).toBeVisible();
      await page.getByRole('button', { name: 'Show Text' }).click();
      await expect(page.getByRole('button', { name: 'Show Diff' })).toBeVisible();
      await page.getByRole('button', { name: 'Accept' }).click();
      await expect(page.getByRole('button', { name: 'Accept' })).not.toBeVisible({
        timeout: 15_000,
      });
    });

    test('editor page loads TipTap editor and supports export and track changes', async ({
      page,
    }) => {
      expect(state.jobId, 'jobId must be set by the upload test').toBeTruthy();
      await injectAuth(page);
      await page.goto(`/jobs/${state.jobId}/editor`);

      await expect(page.getByRole('heading', { name: 'Edit Demand Letter' })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.locator('.tiptap-editor')).toBeVisible({ timeout: 60_000 });
      await expect(page.getByRole('button', { name: 'Export to Word' })).toBeVisible();

      const banner = page.getByText('Collaborative editing requires a deployed WebSocket server');
      if (await banner.isVisible()) {
        await page.getByRole('button', { name: 'Dismiss' }).click();
        await expect(banner).not.toBeVisible();
      }

      await expect(page.getByRole('button', { name: 'Track Changes' })).toBeVisible();
      await page.getByRole('button', { name: 'Track Changes' }).click();
      await expect(page.locator('.text-blue-800').or(page.getByText('Loading…'))).toBeVisible({
        timeout: 15_000,
      });

      const exportPromise = page.waitForRequest((req) =>
        req.url().includes('/export/docx') && req.method() === 'POST',
      );
      await page.getByRole('button', { name: 'Export to Word' }).click();
      const exportReq = await exportPromise;
      expect(exportReq.url()).toContain(`/jobs/${state.jobId}/export/docx`);
    });

    test('documents page shows uploaded files and job logs', async ({ page }) => {
      expect(state.jobId, 'jobId must be set by the upload test').toBeTruthy();
      await injectAuth(page);
      await page.goto(`/jobs/${state.jobId}/documents`);

      await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Uploaded Files' })).toBeVisible();
      await expect(page.getByText('template.docx')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('case-doc.pdf')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('heading', { name: 'Job Log' })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('button', { name: 'Upload Case Documents' })).toBeVisible();
    });
  });
}
