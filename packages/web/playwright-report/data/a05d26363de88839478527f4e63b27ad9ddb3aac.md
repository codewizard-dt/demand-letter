# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.ts >> Full job lifecycle >> upload template + case document and reach gap report
- Location: e2e/e2e.spec.ts:103:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 300000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - link "Steno STENO" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "Steno" [ref=e6]
        - generic [ref=e7]: STENO
      - button "Open user menu" [ref=e9] [cursor=pointer]: T
    - main [ref=e10]:
      - generic [ref=e11]:
        - navigation "Workflow progress" [ref=e12]:
          - generic [ref=e14]:
            - generic [ref=e15]: "1"
            - text: Upload
          - generic [ref=e18]:
            - generic [ref=e19]: "2"
            - text: Gap Report
          - generic [ref=e22]:
            - generic [ref=e23]: "3"
            - text: Generate
          - generic [ref=e26]:
            - generic [ref=e27]: "4"
            - text: Editor
          - generic [ref=e30]:
            - generic [ref=e31]: "5"
            - text: Done
        - heading "Upload Documents" [level=1] [ref=e32]
        - generic [ref=e33]: "Error: POST /jobs/cmqxa7p1q0000savrx9zxi9ep/templates/cmqxa810v0001bz9r0eq60evl/classify failed: 502"
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]: Template (.docx)
            - paragraph [ref=e38] [cursor=pointer]: template.docx
          - generic [ref=e39]:
            - generic [ref=e40]: Case Documents (.pdf)
            - list [ref=e42] [cursor=pointer]:
              - listitem [ref=e43]: case-doc.pdf
          - button "Upload & Continue" [ref=e44] [cursor=pointer]
  - generic [ref=e45]:
    - img [ref=e47]
    - button "Open Tanstack query devtools" [ref=e95] [cursor=pointer]:
      - img [ref=e96]
```

# Test source

```ts
  29  | // ═════════════════════════════════════════════════════════════════════════════
  30  | // AUTH FLOW
  31  | // ═════════════════════════════════════════════════════════════════════════════
  32  | test.describe('Auth flow', () => {
  33  |   test('unauthenticated user is redirected to /login', async ({ page }) => {
  34  |     await page.goto('/');
  35  |     await expect(page).toHaveURL('/login');
  36  |   });
  37  | 
  38  |   test('login with any credentials succeeds and navigates to home', async ({ page }) => {
  39  |     await loginViaUI(page);
  40  |     await expect(page).toHaveURL('/');
  41  |     await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
  42  |   });
  43  | 
  44  |   test('register creates account and navigates to home', async ({ page }) => {
  45  |     await page.goto('/register');
  46  |     await page.fill('#name', 'Jane Doe');
  47  |     await page.fill('#email', 'jane.doe@example.com');
  48  |     await page.fill('#password', 'StrongPass!99');
  49  |     await page.fill('#confirm', 'StrongPass!99');
  50  |     await page.click('button[type="submit"]');
  51  |     await expect(page).toHaveURL('/');
  52  |     await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
  53  |   });
  54  | 
  55  |   test('register shows error when passwords do not match', async ({ page }) => {
  56  |     await page.goto('/register');
  57  |     await page.fill('#name', 'Jane Doe');
  58  |     await page.fill('#email', 'jane2@example.com');
  59  |     await page.fill('#password', 'password123');
  60  |     await page.fill('#confirm', 'different456');
  61  |     await page.click('button[type="submit"]');
  62  |     await expect(page.getByText('Passwords do not match.')).toBeVisible();
  63  |     await expect(page).toHaveURL('/register');
  64  |   });
  65  | 
  66  |   test('forgot password shows confirmation message on submit', async ({ page }) => {
  67  |     await page.goto('/forgot-password');
  68  |     await page.fill('#email', TEST_EMAIL);
  69  |     await page.click('button[type="submit"]');
  70  |     await expect(
  71  |       page.getByText(/If that email address is registered/),
  72  |     ).toBeVisible();
  73  |   });
  74  | 
  75  |   test('logout returns user to /login', async ({ page }) => {
  76  |     await injectAuth(page);
  77  |     await page.goto('/');
  78  |     // Open user menu and click Logout
  79  |     await page.getByRole('button', { name: 'Open user menu' }).click();
  80  |     await page.getByRole('button', { name: 'Logout' }).click();
  81  |     await expect(page).toHaveURL('/login');
  82  |   });
  83  | });
  84  | 
  85  | // ═════════════════════════════════════════════════════════════════════════════
  86  | // FULL JOB LIFECYCLE (serial — shares jobId)
  87  | // ═════════════════════════════════════════════════════════════════════════════
  88  | test.describe.serial('Full job lifecycle', () => {
  89  |   // ── 1. Jobs list page ──────────────────────────────────────────────────────
  90  |   test('jobs list page renders heading and New Job link', async ({ page }) => {
  91  |     await injectAuth(page);
  92  |     await page.goto('/');
  93  | 
  94  |     await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
  95  |     await expect(page.getByRole('link', { name: 'New Job' })).toBeVisible();
  96  | 
  97  |     // Navigate to upload via New Job link
  98  |     await page.getByRole('link', { name: 'New Job' }).click();
  99  |     await expect(page).toHaveURL('/upload');
  100 |   });
  101 | 
  102 |   // ── 2. Upload documents ────────────────────────────────────────────────────
  103 |   test('upload template + case document and reach gap report', async ({ page }) => {
  104 |     test.setTimeout(6 * 60 * 1000); // 6 min — Textract + Bedrock pipeline
  105 |     await injectAuth(page);
  106 |     await page.goto('/upload');
  107 | 
  108 |     await expect(page.getByRole('heading', { name: 'Upload Documents' })).toBeVisible();
  109 | 
  110 |     // Attach fixture files to hidden file inputs
  111 |     await page.locator('#template').setInputFiles(path.join(FIXTURES, 'template.docx'));
  112 |     await page.locator('#caseDocs').setInputFiles(path.join(FIXTURES, 'case-doc.pdf'));
  113 | 
  114 |     // File names should appear in the drop zones
  115 |     await expect(page.getByText('template.docx')).toBeVisible();
  116 |     await expect(page.getByText('case-doc.pdf')).toBeVisible();
  117 | 
  118 |     // Submit the upload form
  119 |     await page.getByRole('button', { name: 'Upload & Continue' }).click();
  120 | 
  121 |     // Button text changes to "Uploading & processing…" while the chain runs
  122 |     await expect(
  123 |       page.getByRole('button', { name: 'Uploading & processing…' }),
  124 |     ).toBeVisible({ timeout: 15_000 });
  125 | 
  126 |     // Wait for the full backend chain to complete and navigate to gap-report.
  127 |     // Chain: createJob → uploadFiles → ingest (Textract) → segment → classify → inject → extract
  128 |     // With real AWS, this takes 1–5 minutes.
> 129 |     await page.waitForURL(/\/jobs\/[^/]+\/gap-report/, {
      |                ^ TimeoutError: page.waitForURL: Timeout 300000ms exceeded.
  130 |       timeout: 5 * 60 * 1000,
  131 |     });
  132 | 
  133 |     // Extract and store jobId for use by subsequent tests
  134 |     const match = page.url().match(/\/jobs\/([^/]+)\/gap-report/);
  135 |     expect(match, 'Expected to land on gap-report with a job ID in the URL').toBeTruthy();
  136 |     jobId = match![1];
  137 | 
  138 |     await expect(page.getByRole('heading', { name: 'Gap Report' })).toBeVisible();
  139 |   });
  140 | 
  141 |   // ── 3. Gap report — view coverage and fill all gaps ────────────────────────
  142 |   test('gap report shows coverage and allows filling all gaps', async ({ page }) => {
  143 |     expect(jobId, 'jobId must be set by the upload test').toBeTruthy();
  144 |     await injectAuth(page);
  145 |     await page.goto(`/jobs/${jobId}/gap-report`);
  146 | 
  147 |     // Wait for gap report heading (may briefly show "Preparing documents…" banner
  148 |     // while polling if template processing is still in progress)
  149 |     await expect(page.getByRole('heading', { name: 'Gap Report' })).toBeVisible({
  150 |       timeout: 90_000,
  151 |     });
  152 | 
  153 |     // Coverage summary: "<N> of <M> slots covered."
  154 |     await expect(page.getByText(/\d+ of \d+ slots covered/)).toBeVisible();
  155 | 
  156 |     // Citation Sources sidebar should be rendered
  157 |     await expect(page.getByText('Citation Sources')).toBeVisible();
  158 | 
  159 |     // Fill all visible gap inputs with test values, or check "Accept Missing"
  160 |     const fillInputs = page.locator('input[placeholder="Enter value…"]');
  161 |     const gapCount = await fillInputs.count();
  162 | 
  163 |     if (gapCount > 0) {
  164 |       for (let i = 0; i < gapCount; i++) {
  165 |         const input = fillInputs.nth(i);
  166 |         if (await input.isEnabled()) {
  167 |           await input.fill('Test Value');
  168 |         }
  169 |         // If input is disabled, the Accept Missing checkbox is already checked for this row
  170 |       }
  171 | 
  172 |       const submitBtn = page.getByRole('button', { name: 'Submit Attorney Judgment' });
  173 |       await expect(submitBtn).toBeEnabled();
  174 |       await submitBtn.click();
  175 | 
  176 |       // Wait for submission to complete (button stops showing "Submitting…")
  177 |       await expect(
  178 |         page.getByRole('button', { name: 'Submitting…' }),
  179 |       ).not.toBeVisible({ timeout: 30_000 });
  180 | 
  181 |       // Gap report query is invalidated on success — wait for React Query to refetch.
  182 |       // After all gaps are filled, "All slots satisfied" appears.
  183 |       await expect(
  184 |         page.getByText('All slots satisfied'),
  185 |       ).toBeVisible({ timeout: 30_000 });
  186 |     } else {
  187 |       // No gaps — already fully covered
  188 |       await expect(page.getByText('All slots satisfied')).toBeVisible();
  189 |     }
  190 | 
  191 |     // "Proceed to Generate" should now be enabled (0 gaps)
  192 |     await expect(
  193 |       page.getByRole('button', { name: 'Proceed to Generate' }),
  194 |     ).toBeEnabled();
  195 |   });
  196 | 
  197 |   // ── 4. Generate page — generate, refine, and accept ───────────────────────
  198 |   test('generate demand letter, refine it, and accept refinement', async ({ page }) => {
  199 |     test.setTimeout(6 * 60 * 1000); // 6 min — Bedrock generation + refinement
  200 |     expect(jobId, 'jobId must be set by the upload test').toBeTruthy();
  201 |     await injectAuth(page);
  202 |     // Navigate directly — the GapReportPage "Proceed to Generate" button has a bug
  203 |     // (it navigates to /jobs/:id/output which has no route in App.tsx)
  204 |     await page.goto(`/jobs/${jobId}/generate`);
  205 | 
  206 |     await expect(
  207 |       page.getByRole('heading', { name: 'Generate Demand Letter' }),
  208 |     ).toBeVisible();
  209 | 
  210 |     // Generate button should be enabled (all gaps filled by previous test)
  211 |     const generateBtn = page.getByRole('button', { name: 'Generate Demand Letter' });
  212 |     await expect(generateBtn).toBeEnabled({ timeout: 30_000 });
  213 | 
  214 |     // ── Generate ────────────────────────────────────────────────────────────
  215 |     await generateBtn.click();
  216 | 
  217 |     // Spinner appears while generating
  218 |     await expect(page.getByText('Building document…')).toBeVisible({ timeout: 15_000 });
  219 | 
  220 |     // Streaming output appears in the aria live region
  221 |     const outputRegion = page.getByRole('status');
  222 |     await expect(outputRegion).toBeVisible({ timeout: 3 * 60 * 1000 });
  223 |     // Wait for a non-trivial amount of text to stream in
  224 |     await expect(outputRegion).not.toBeEmpty({ timeout: 3 * 60 * 1000 });
  225 | 
  226 |     // "Refine Letter" panel appears once isDone = true
  227 |     await expect(page.getByText('Refine Letter')).toBeVisible({ timeout: 3 * 60 * 1000 });
  228 | 
  229 |     // Post-generation action buttons are visible
```