import { createLifecycleState } from './support/lifecycle-state';
import { defineFullJobLifecycleSuite } from './suites/full-job-lifecycle';

defineFullJobLifecycleSuite(createLifecycleState());
