import { test as setup, expect } from '@playwright/test';

const authFile = '.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Fill in credentials for the test user created by db:seed
  await page.fill('input[name="email"]', 'test@nextmind.dev');
  await page.fill('input[name="password"]', 'Test123456!');

  // Submit the login form
  await page.click('button[type="submit"]');

  // Wait for client-side redirect to home after successful login
  // The login form uses signIn('credentials', { redirect: false }) then router.push('/')
  await page.waitForURL('/', { timeout: 10000 });

  // Save authenticated session state for reuse by other tests
  await page.context().storageState({ path: authFile });
});
