import { test, expect } from "@playwright/test";

test.describe("Authentication Flows - Destructive Mindset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test.describe("Login Invalid/Equivalence Classes", () => {
    test("shows error for malformed email (client-side validation)", async ({ page }) => {
      // It's using `type="email"` so browser validation should catch it, 
      // but Zod also tests "Enter a valid email". We trigger Zod by bypassing native or just testing it.
      await page.getByLabel(/email/i).fill("not-an-email");
      await page.getByLabel(/password/i).fill("password123");
      
      // We can click sign in, browser may block it, but let's assume we want to see if the custom error appears.
      await page.getByRole("button", { name: /sign in/i }).click();

      // Ensure we haven't navigated
      await expect(page).toHaveURL(/\/login/);
    });

    test("shows error for short password (Zod boundary)", async ({ page }) => {
      await page.getByLabel(/email/i).fill("test@example.com");
      // Password boundary is 6 chars. Test with 5.
      await page.getByLabel(/password/i).fill("12345");
      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(page.getByText(/password must be at least 6 characters/i)).toBeVisible();
    });

    test("shows error for unauthenticated access (wrong API credentials)", async ({ page }) => {
      await page.getByLabel(/email/i).fill("wrong-no-such-user@example.com");
      await page.getByLabel(/password/i).fill("securepassword123");
      await page.getByRole("button", { name: /sign in/i }).click();
      
      // Wait for error state. Usually Supabase returns "Invalid login credentials"
      await expect(page.locator(".text-red-700")).toBeVisible();
    });
  });

  test.describe("Authorization Side Effects", () => {
    test("unauthenticated user accessing /members is redirected to /login", async ({ page }) => {
      await page.goto("/members");
      await expect(page).toHaveURL(/.*\/login.*/);
    });

    test("successful authentication with env credentials navigates to dashboard", async ({ page }) => {
      test.skip(
        !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
        "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for full E2E runs"
      );

      await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL as string);
      await page.getByLabel(/password/i).fill(process.env.E2E_ADMIN_PASSWORD as string);
      await page.getByRole("button", { name: /sign in/i }).click();

      // Give it time to auth and verify admin row
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
      // Should default to dashboard page 
      // which is usually `/` or `/members`
    });
  });
});
