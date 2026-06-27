import type { Page } from '@playwright/test';

export const TEST_EMAIL = 'test@example.com';
export const TEST_PASSWORD = 'testpassword123';
// Auth is client-side only: login() sets name = email.split('@')[0]
export const TEST_NAME = 'test';
export const STORAGE_KEY = 'dlg_user';
export const TEST_USER = { name: TEST_NAME, email: TEST_EMAIL };

/**
 * Inject auth user into localStorage BEFORE the page loads.
 * Must be called before page.goto() — addInitScript runs before the React app
 * initializes and reads localStorage in its useState() call.
 */
export async function injectAuth(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, user }: { key: string; user: { name: string; email: string } }) => {
      localStorage.setItem(key, JSON.stringify(user));
    },
    { key: STORAGE_KEY, user: TEST_USER },
  );
}

/**
 * Full UI login — navigates to /login, fills email + password, submits.
 * Use only for auth-flow tests that test the login UI itself.
 */
export async function loginViaUI(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', TEST_EMAIL);
  await page.fill('#password', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}
