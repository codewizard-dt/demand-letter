import { test, expect } from '@playwright/test';
import { injectAuth, TEST_EMAIL, TEST_NAME } from '../helpers/auth';

export function defineAccountSuite(): void {
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
      const avatar = page.locator('.rounded-full').filter({ hasText: 'T' }).first();
      await expect(avatar).toBeVisible();
    });
  });
}
