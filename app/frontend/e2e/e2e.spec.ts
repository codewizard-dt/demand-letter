/**
 * End-to-end test suite for the Steno demand-letter application.
 *
 * Prerequisites (must be running before executing tests):
 *   make docker-compose-up    # starts demand-letter-postgres and demand-letter-api
 *   make test-e2e             # starts/reuses compose-managed SAM API and runs Playwright
 *   make docker-clean-sam     # optional before e2e runs to remove stale SAM Lambda containers
 *
 * Run:
 *   pnpm test:e2e           # headless full aggregate suite
 *   pnpm test:e2e:headed    # visible browser
 *   pnpm test:e2e:ui        # interactive Playwright UI
 *
 * No API mocking. All requests hit the real backend.
 * This file preserves the current "run everything" behavior by registering
 * the suites used by the aggregate command.
 */

import { createLifecycleState } from './support/lifecycle-state';
import { defineAuthSuite } from './suites/auth';
import { defineFullJobLifecycleSuite } from './suites/full-job-lifecycle';
import { defineAccountSuite } from './suites/account';
import { defineAdminUsageSuite } from './suites/admin-usage';
import { defineJobsListAfterLifecycleSuite } from './suites/jobs-list-after-lifecycle';

const state = createLifecycleState();

defineAuthSuite();
defineFullJobLifecycleSuite(state);
defineAccountSuite();
defineAdminUsageSuite(state);
defineJobsListAfterLifecycleSuite();
