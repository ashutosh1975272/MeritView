import { test, expect } from '@playwright/test';

test.describe('Registration E2E', () => {
  test('T1.2.3.26: registration page navigation and submission', async ({ page }) => {
    await page.route('**/api/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user_1', email: 'test@example.com', role: 'STANDARD', emailVerified: false },
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          expiresIn: 900,
        }),
      });
    });

    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Create your account');

    await page.fill('#email', 'test@example.com');
    await page.fill('#displayName', 'Test User');
    await page.fill('#password', 'TestPass123');
    await page.fill('#confirmPassword', 'TestPass123');
    await page.check('#acceptTerms');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/verify-email/);
  });

  test('T1.2.3.27: verification email flow mocked', async ({ page }) => {
    await page.route('**/api/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user_1', email: 'verify@example.com', role: 'STANDARD', emailVerified: false },
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          expiresIn: 900,
        }),
      });
    });

    await page.route('**/api/v1/auth/verify-email', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Email verified successfully' }),
      });
    });

    await page.goto('/register');
    await page.fill('#email', 'verify@example.com');
    await page.fill('#password', 'TestPass123');
    await page.fill('#confirmPassword', 'TestPass123');
    await page.check('#acceptTerms');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/verify-email/);
  });
});
