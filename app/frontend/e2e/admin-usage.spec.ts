import { createLifecycleState } from './support/lifecycle-state';
import { defineFullJobLifecycleSuite } from './suites/full-job-lifecycle';
import { defineAdminUsageSuite } from './suites/admin-usage';

const state = createLifecycleState();

defineFullJobLifecycleSuite(state);
defineAdminUsageSuite(state);
