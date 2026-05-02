import { test, expect } from "@playwright/test";

test("Can load login and submit demo data", async ({ page }) => {
  await page.goto("http://localhost:3000/login");

  // Verify the page loaded
  await expect(page).toHaveTitle(/Faculty Library Management System/i);

  // Use the correct seeded demo credentials
  await page.fill('input[type="email"]', "admin@university.edu");
  await page.fill('input[type="password"]', " password123");
  
  // Click submit and wait for the navigation to resolve
  await Promise.all([
    page.waitForURL(/.*dashboard/, { timeout: 10000 }), // Increased timeout for backend response
    page.click('button[type="submit"]'),
  ]);

  // Assert URL matches
  await expect(page).toHaveURL(/.*dashboard/);
});