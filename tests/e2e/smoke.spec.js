import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("app loads and shows main UI elements", async ({ page }) => {
    await page.goto("/");

    // Wait for the app to initialise
    await page.waitForLoadState("domcontentloaded");

    // Check page title contains SSCE
    await expect(page).toHaveTitle(/SSCE/i);

    // Check the main canvas area exists
    const canvas = page.locator("canvas");
    await expect(canvas.first()).toBeVisible();

    // Check toolbar is present
    const toolbar = page.locator("#toolbar, [class*='toolbar']");
    await expect(toolbar.first()).toBeVisible();
  });

  test("canvas is rendered with dimensions", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});
