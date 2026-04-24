import { test, expect } from "@playwright/test";

test.describe("Dashboard & Navigation", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for full E2E runs"
    );

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL as string);
    await page.getByLabel(/password/i).fill(process.env.E2E_ADMIN_PASSWORD as string);
    await page.getByRole("button", { name: /sign in/i }).click();

    // To mitigate potential Supabase/Next.js cookie propagation race conditions:
    await expect(async () => {
      if (page.url().includes('login?next')) {
        await page.goto("/");
      }
      await expect(page.getByRole("link", { name: /Dashboard/i }).first()).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 15_000 });
  });

  test.describe("Sidebar Navigation", () => {
    test("sidebar contains all necessary links", async ({ page }) => {
      // Check Desktop Sidebar links
      const navLinks = ["Dashboard", "Members", "Payments", "Reports", "Settings"];
      for (const linkText of navLinks) {
        await expect(
          page.getByRole("link", { name: new RegExp(`^..(?:\\s)?${linkText}$`) }).or(
            page.getByRole("link", { name: new RegExp(linkText, "i") })
          ).first()
        ).toBeVisible();
      }
    });

    test("collapsing sidebar works and retains accessible navigation", async ({ page }) => {
      // Find the collapse button
      const collapseBtn = page.getByRole("button", { name: /collapse sidebar/i });
      
      if (await collapseBtn.isVisible()) { // test it only on desktop viewports
        await collapseBtn.click();
        
        // Assert sidebar is narrowed - we expect title to be hidden
        await expect(page.getByText("SM FITNESS", { exact: true }).first()).toBeHidden();
        
        // Check that hover text still indicates the correct label, or just DB is still visible
        await expect(page.getByText(/^DB$/)).toBeVisible();
      }
    });
  });

  test.describe("Mobile Navigation Boundaries", () => {
    test.use({ viewport: { width: 375, height: 667 } });
    
    test("mobile navigation toolbar is visible", async ({ page }) => {
      const dbLink = page.getByRole("link", { name: /🏠.*Dashboard/i });
      await expect(dbLink).toBeVisible();
      
      const mbLink = page.getByRole("link", { name: /👥.*Members/i });
      await expect(mbLink).toBeVisible();
    });

    test("mobile menu toggle opens overlay", async ({ page }) => {
      await page.getByRole("button", { name: /open navigation menu/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: /close navigation menu/i }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
    });
  });
});
