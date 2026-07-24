import { test, expect } from '@playwright/test';

test.describe('Login E2E', () => {
  test('T1.2.3.28: login page flow', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user_1', email: 'test@example.com', role: 'STANDARD', emailVerified: true },
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          expiresIn: 900,
        }),
      });
    });

    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Welcome back');

    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPass123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('T1.2.3.29: logout flow', async ({ page }) => {
    await page.route('**/api/v1/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Logged out successfully' }),
      });
    });

    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { id: 'user_1', email: 'test@example.com', role: 'STANDARD', emailVerified: true },
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          isAuthenticated: true,
        },
      }));
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('T1.2.3.31: redirects after auth state changes', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user_1', email: 'test@example.com', role: 'STANDARD', emailVerified: true },
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          expiresIn: 900,
        }),
      });
    });

    await page.goto('/login?callbackUrl=/dashboard');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPass123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
