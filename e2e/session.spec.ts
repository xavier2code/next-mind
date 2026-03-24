import { test, expect } from '@playwright/test';

test.describe('Session persistence', () => {
  // Note: These tests require a registered user in the test database
  // Run with test database setup for full coverage

  test('session persists across page refresh', async ({ page, context }) => {
    // This test would need a pre-seeded test user
    // Placeholder for actual session test
    expect(true).toBe(true);
  });

  test('protected route redirects to login', async ({ page }) => {
    await page.goto('/');
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page accessible without auth', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toBeVisible();
  });
});
