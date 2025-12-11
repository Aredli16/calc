import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Calculatrice Pro/);
});

test('basic addition', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '1' }).click();
    await page.getByRole('button', { name: '+' }).click();
    await page.getByRole('button', { name: '2' }).click();
    await page.getByRole('button', { name: '=', exact: true }).click();

    await expect(page.locator('.main-input')).toHaveText('3');
});

test('scientific mode toggle', async ({ page }) => {
    await page.goto('/');

    await page.getByText('Standard').click();
    await expect(page.getByText('Scientifique')).toBeVisible();
    await expect(page.getByRole('button', { name: 'sin' })).toBeVisible();
});
