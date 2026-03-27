import { test as base, expect } from '@playwright/test';

/**
 * Custom E2E test fixtures for Next-Mind
 *
 * - Authenticated session via storageState (12-02)
 * - LLM API mocks via route interception (12-03)
 * - Seed data helpers
 */

const MOCK_LLM_RESPONSE = 'This is a mock LLM response for E2E testing.';

export const test = base.extend({
  mockLLMResponse: async ({ page }, use) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: MOCK_LLM_RESPONSE,
      });
    });
    await use(MOCK_LLM_RESPONSE);
  },
});
export { expect };
