import { test, expect } from '@playwright/test';
import { injectAuth } from '../helpers/auth';
import { type LifecycleState } from '../support/lifecycle-state';

export function defineAdminUsageSuite(state: LifecycleState): void {
  test.describe('Admin usage page', () => {
    test.beforeEach(async ({ page }) => {
      await injectAuth(page);
      await page.goto('/admin/usage');
      await page.waitForLoadState('networkidle');
    });

    test('shows LLM Usage & Cost heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'LLM Usage & Cost' })).toBeVisible();
    });

    test('shows By Feature aggregate table with data from lifecycle run', async ({ page }) => {
      expect(state.jobId, 'jobId must be set by the lifecycle run').toBeTruthy();
      await expect(page.getByText('By Feature (last 30 days)')).toBeVisible();
      const tableRows = page.locator('table').first().locator('tbody tr');
      await expect(tableRows).not.toHaveCount(0, { timeout: 15_000 });
    });

    test('shows Recent Calls table with at least one entry', async ({ page }) => {
      expect(state.jobId, 'jobId must be set by the lifecycle run').toBeTruthy();
      await expect(page.getByText('Recent Calls (last 100)')).toBeVisible();
      const recentRows = page.locator('table').last().locator('tbody tr');
      await expect(recentRows).not.toHaveCount(0, { timeout: 15_000 });
    });
  });
}
