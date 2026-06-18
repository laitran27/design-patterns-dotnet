const { test, expect } = require('@playwright/test');

test.describe('learning site smoke checks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('home page renders the learning roadmap', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Design Patterns/i })).toBeVisible();
    await expect(page.getByText('16')).toBeVisible();
    await expect(page.locator('#potd-container')).toContainText('Pattern');
  });

  test('patterns page lists and filters all patterns', async ({ page }) => {
    await page.goto('/patterns.html');
    await expect(page.locator('.pattern-card')).toHaveCount(23);

    await page.getByRole('button', { name: /Creational/i }).click();
    await expect(page.locator('.pattern-card:visible')).toHaveCount(5);

    await page.locator('.search-input').fill('singleton');
    await expect(page.locator('.pattern-card:visible')).toHaveCount(1);
    await expect(page.locator('.pattern-card:visible')).toContainText('Singleton');
  });

  test('pattern detail can be marked as learned', async ({ page }) => {
    await page.goto('/pattern-detail.html?id=singleton');
    await expect(page.getByRole('heading', { name: /Singleton/i })).toBeVisible();

    await page.getByRole('button', { name: /Đánh dấu đã học/i }).click();
    await expect(page.getByRole('button', { name: /Đã học xong/i })).toBeVisible();

    const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('dotnet_patterns_progress') || '{}'));
    expect(progress.singleton).toBe(true);
  });

  test('progress page toggles checklist and updates totals', async ({ page }) => {
    await page.goto('/progress.html');
    await expect(page.locator('.phase-progress-card')).toHaveCount(5);

    await page.locator('.pattern-check-item[data-pattern-id="singleton"]').click();
    await expect(page.locator('#overall-percent')).toContainText('4%');
    await expect(page.locator('#completed-count')).toContainText('1');
  });
});
