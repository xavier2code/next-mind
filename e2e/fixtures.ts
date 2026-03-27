import { test as base, expect } from '@playwright/test';

/**
 * Custom E2E test fixtures for Next-Mind
 *
 * Extend this base to add:
 * - Authenticated session (12-02)
 * - LLM API mocks (12-03)
 * - Seed data helpers
 */
export const test = base.extend({});
export { expect };
