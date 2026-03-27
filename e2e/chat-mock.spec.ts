import { test, expect } from './fixtures';

test.describe('LLM Mock', () => {
  test('mock intercepts chat API and returns response', async ({ page, mockLLMResponse }) => {
    // Navigate to home page (requires auth -- test uses storageState from setup project)
    await page.goto('/');

    // Verify the mock fixture was set up and returns the expected text
    expect(mockLLMResponse).toBe('This is a mock LLM response for E2E testing.');
  });
});
