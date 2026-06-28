# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.ts >> Jobs list after lifecycle >> shows the job created during the lifecycle test
- Location: e2e/e2e.spec.ts:404:7

# Error details

```
Error: jobId must be set by the upload test

expect(received).toBeTruthy()

Received: undefined
```

# Test source

```ts
  305 |     );
  306 |     await page.getByRole('button', { name: 'Export to Word' }).click();
  307 |     const exportReq = await exportPromise;
  308 |     expect(exportReq.url()).toContain(`/jobs/${jobId}/export/docx`);
  309 |   });
  310 | 
  311 |   // ── 6. Documents page ──────────────────────────────────────────────────────
  312 |   test('documents page shows uploaded files and job logs', async ({ page }) => {
  313 |     expect(jobId, 'jobId must be set by the upload test').toBeTruthy();
  314 |     await injectAuth(page);
  315 |     await page.goto(`/jobs/${jobId}/documents`);
  316 | 
  317 |     await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
  318 | 
  319 |     // Uploaded Files section
  320 |     await expect(page.getByRole('heading', { name: 'Uploaded Files' })).toBeVisible();
  321 |     await expect(page.getByText('template.docx')).toBeVisible({ timeout: 15_000 });
  322 |     await expect(page.getByText('case-doc.pdf')).toBeVisible({ timeout: 15_000 });
  323 | 
  324 |     // Job Log section — at minimum shows header
  325 |     await expect(page.getByRole('heading', { name: 'Job Log' })).toBeVisible();
  326 |     // With a real backend, there should be at least some log entries
  327 |     await page.waitForLoadState('networkidle');
  328 |     // If there are errors/warnings, they should be rendered as log entries
  329 | 
  330 |     // "← Back to Gap Report" link
  331 |     await expect(
  332 |       page.getByRole('link', { name: '← Back to Gap Report' }),
  333 |     ).toBeVisible();
  334 |     await page.getByRole('link', { name: '← Back to Gap Report' }).click();
  335 |     await expect(page).toHaveURL(`/jobs/${jobId}/gap-report`);
  336 |   });
  337 | });
  338 | 
  339 | // ═════════════════════════════════════════════════════════════════════════════
  340 | // ACCOUNT PAGE (client-side only — no backend calls)
  341 | // ═════════════════════════════════════════════════════════════════════════════
  342 | test.describe('Account page', () => {
  343 |   test.beforeEach(async ({ page }) => {
  344 |     await injectAuth(page);
  345 |     await page.goto('/account');
  346 |   });
  347 | 
  348 |   test('shows Account heading and Your profile label', async ({ page }) => {
  349 |     await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
  350 |     await expect(page.getByText('Your profile')).toBeVisible();
  351 |   });
  352 | 
  353 |   test('shows user name and email from localStorage', async ({ page }) => {
  354 |     await expect(page.getByText(TEST_NAME, { exact: true })).toBeVisible();
  355 |     await expect(page.getByText(TEST_EMAIL, { exact: true })).toBeVisible();
  356 |   });
  357 | 
  358 |   test('shows avatar with correct initials', async ({ page }) => {
  359 |     // initials('test') = 'T'
  360 |     const avatar = page
  361 |       .locator('.rounded-full')
  362 |       .filter({ hasText: 'T' })
  363 |       .first();
  364 |     await expect(avatar).toBeVisible();
  365 |   });
  366 | });
  367 | 
  368 | // ═════════════════════════════════════════════════════════════════════════════
  369 | // ADMIN USAGE PAGE
  370 | // Run after lifecycle tests so there are real LLM audit log entries
  371 | // ═════════════════════════════════════════════════════════════════════════════
  372 | test.describe('Admin usage page', () => {
  373 |   test.beforeEach(async ({ page }) => {
  374 |     await injectAuth(page);
  375 |     await page.goto('/admin/usage');
  376 |     await page.waitForLoadState('networkidle');
  377 |   });
  378 | 
  379 |   test('shows LLM Usage & Cost heading', async ({ page }) => {
  380 |     await expect(
  381 |       page.getByRole('heading', { name: 'LLM Usage & Cost' }),
  382 |     ).toBeVisible();
  383 |   });
  384 | 
  385 |   test('shows By Feature aggregate table with data from lifecycle run', async ({ page }) => {
  386 |     await expect(page.getByText('By Feature (last 30 days)')).toBeVisible();
  387 |     // After the lifecycle tests, there should be at least one aggregate row
  388 |     // (generate and/or refine features were used)
  389 |     const tableRows = page.locator('table').first().locator('tbody tr');
  390 |     await expect(tableRows).not.toHaveCount(0, { timeout: 15_000 });
  391 |   });
  392 | 
  393 |   test('shows Recent Calls table with at least one entry', async ({ page }) => {
  394 |     await expect(page.getByText('Recent Calls (last 100)')).toBeVisible();
  395 |     const recentRows = page.locator('table').last().locator('tbody tr');
  396 |     await expect(recentRows).not.toHaveCount(0, { timeout: 15_000 });
  397 |   });
  398 | });
  399 | 
  400 | // ═════════════════════════════════════════════════════════════════════════════
  401 | // JOBS LIST — additional assertions after lifecycle run
  402 | // ═════════════════════════════════════════════════════════════════════════════
  403 | test.describe('Jobs list after lifecycle', () => {
  404 |   test('shows the job created during the lifecycle test', async ({ page }) => {
> 405 |     expect(jobId, 'jobId must be set by the upload test').toBeTruthy();
      |                                                           ^ Error: jobId must be set by the upload test
  406 |     await injectAuth(page);
  407 |     await page.goto('/');
  408 | 
  409 |     await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
  410 |     // The job created during lifecycle tests should appear in the list
  411 |     await expect(page.getByText(jobId)).toBeVisible({ timeout: 15_000 });
  412 | 
  413 |     // "Resume →" link for that job navigates to the right page based on status
  414 |     const resumeLink = page.locator('li').filter({ hasText: jobId }).getByRole('link');
  415 |     await expect(resumeLink).toBeVisible();
  416 |   });
  417 | });
  418 | 
```