import { test, expect } from '@playwright/test';
import { injectAuth } from '../helpers/auth';

const API_BASE = process.env.VITE_API_URL ?? 'http://localhost:3000';

export function defineJobsListAfterLifecycleSuite(): void {
  test.describe('Jobs list after lifecycle', () => {
    let jobId: string;

    test.beforeAll(async ({ request }) => {
      const response = await request.post(`${API_BASE}/jobs`, { data: {} });
      expect(response.ok(), 'expected seed job creation to succeed').toBeTruthy();

      const body = (await response.json()) as { id?: string };
      expect(body.id, 'seed job response must include an id').toBeTruthy();
      jobId = body.id!;
    });

    test('shows the job created for the jobs list test', async ({ page }) => {
      await injectAuth(page);
      await page.goto('/');

      await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
      await expect(page.getByText(jobId)).toBeVisible({ timeout: 15_000 });

      const resumeLink = page.locator('li').filter({ hasText: jobId }).getByRole('link');
      await expect(resumeLink).toBeVisible();
    });
  });
}
