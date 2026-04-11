import { test, expect } from '@playwright/test';

test('has title and redirects to login if unauthenticated', async ({ page }) => {
  await page.goto('/');
  // Next.js config might redirect to /login
  await expect(page).toHaveURL(/.*login/);
  await expect(page.getByRole('heading', { name: "Sign in to SM FITNESS" })).toBeVisible();
});
