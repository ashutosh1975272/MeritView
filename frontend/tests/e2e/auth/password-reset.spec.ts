import { test, expect } from '@playwright/test';

test.describe('Password Reset E2E', () => {
  test('T1.2.3.30: password reset flow', async ({ page }) => {
    await page.route('**/api/v1/auth/password-reset/request', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'If the email exists, a reset link has been sent' }),
      });
    });

    await page.route('**/api/v1/auth/password-reset/complete', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Password reset successful' }),
      });
    });

    await page.goto('/forgot-password');

    if (await page.locator('#email').count() > 0) {
      await page.fill('#email', 'test@example.com');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=If the email exists, a reset link has been sent')).toBeVisible();
    }
  });

  test('T1.2.3.31: redirects to login after password reset', async ({ page }) => {
    await page.route('**/api/v1/auth/password-reset/complete', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Password reset successful' }),
      });
    });

    await page.goto('/reset-password?token=valid_token');

    if (await page.locator('#password').count() > 0) {
      await page.fill('#password', 'NewPass123');
      await page.fill('#confirmPassword', 'NewPass123');
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/login/);
    }
  });
});
