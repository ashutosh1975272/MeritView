import { test, expect } from '@playwright/test';

test.describe('F2 E2E: Dispute Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('T2.2.3.19: creates a dispute end-to-end', async ({ page }) => {
    await page.goto('/disputes/new');
    await expect(page.locator('h1')).toHaveText('Create New Dispute');

    await page.fill('input[name="title"]', 'E2E Test Dispute - Contract Breach');
    await page.fill('textarea[name="summary"]', 'This is an end-to-end test dispute created by Playwright.');
    await page.fill('input[name="estimatedStakesUsd"]', '5000');

    await page.click('button:has-text("Create Dispute")');

    await page.waitForURL(/\/disputes\/[\w-]+/);
    await expect(page.locator('text=E2E Test Dispute - Contract Breach')).toBeVisible();
  });

  test('T2.2.3.20: dispute appears in list after creation', async ({ page }) => {
    await page.goto('/disputes/new');
    await page.fill('input[name="title"]', 'E2E Dispute For List Verification');
    await page.fill('textarea[name="summary"]', 'Verify this dispute shows in the list.');
    await page.click('button:has-text("Create Dispute")');
    await page.waitForURL(/\/disputes\/[\w-]+/);

    await page.goto('/disputes');
    await expect(page.locator('text=E2E Dispute For List Verification')).toBeVisible();
  });

  test('T2.2.3.21: dispute detail page shows correct data', async ({ page }) => {
    await page.goto('/disputes/new');
    await page.fill('input[name="title"]', 'E2E Detail Verification Dispute');
    await page.fill('textarea[name="summary"]', 'Check detail page data accuracy.');
    await page.click('button:has-text("Create Dispute")');
    await page.waitForURL(/\/disputes\/[\w-]+/);

    await expect(page.locator('text=E2E Detail Verification Dispute')).toBeVisible();
    await expect(page.locator('text=Draft')).toBeVisible();
  });

  test('T2.2.3.22: withdraw flow from detail page', async ({ page }) => {
    await page.goto('/disputes/new');
    await page.fill('input[name="title"]', 'E2E Withdraw Test Dispute');
    await page.fill('textarea[name="summary"]', 'Testing withdrawal flow.');
    await page.click('button:has-text("Create Dispute")');
    await page.waitForURL(/\/disputes\/[\w-]+/);

    await page.click('button:has-text("Withdraw")');
    await expect(page.locator('text=Confirm Withdrawal')).toBeVisible();
    await page.click('button:has-text("Confirm Withdrawal")');
    await expect(page.locator('text=Withdrawn')).toBeVisible();
  });

  test('T2.2.3.24: validates required fields before submit', async ({ page }) => {
    await page.goto('/disputes/new');
    await page.click('button:has-text("Create Dispute")');
    await expect(page.locator('text=at least 5 characters')).toBeVisible();
  });
});
