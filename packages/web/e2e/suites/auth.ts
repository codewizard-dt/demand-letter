import { test, expect } from '@playwright/test';
import { injectAuth, loginViaUI, TEST_EMAIL } from '../helpers/auth';

export function defineAuthSuite(): void {
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
      await expect(page.getByText(/If that email address is registered/)).toBeVisible();
    });

    test('logout returns user to /login', async ({ page }) => {
      await injectAuth(page);
      await page.goto('/');
      await page.getByRole('button', { name: 'Open user menu' }).click();
      await page.getByRole('button', { name: 'Logout' }).click();
      await expect(page).toHaveURL('/login');
    });
  });
}
