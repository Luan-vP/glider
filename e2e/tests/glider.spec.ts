import { test, expect } from '@playwright/test';

test.describe('Glider Lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads with header and mode toggle', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Glider Lab');
    await expect(page.getByRole('button', { name: 'Single Vehicle' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Evolution' })).toBeVisible();
  });

  test('shows vehicle editor with generate button', async ({ page }) => {
    // Use .first() to handle desktop+mobile duplicate elements
    await expect(page.getByRole('button', { name: 'Generate Random Vehicle' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vehicle Parameters' }).first()).toBeVisible();
  });

  test('generate random vehicle and see preview', async ({ page }) => {
    // Click generate (first visible instance)
    await page.getByRole('button', { name: 'Generate Random Vehicle' }).first().click();

    // Wait for vertex count to appear
    await expect(page.getByText(/\d+ vertices/).first()).toBeVisible({ timeout: 10_000 });

    // Preview image should load (debounced 500ms + API call)
    await expect(page.locator('img[alt="Vehicle preview"]').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('adjust vehicle parameters with sliders', async ({ page }) => {
    // Generate a vehicle first
    await page.getByRole('button', { name: 'Generate Random Vehicle' }).first().click();
    await expect(page.getByText(/\d+ vertices/).first()).toBeVisible({ timeout: 10_000 });

    // Verify sliders are present (use first to avoid desktop+mobile duplicates)
    await expect(page.getByText('Max Wing Dimension (m)').first()).toBeVisible();
    await expect(page.getByText('Wing Density (kg/m³)').first()).toBeVisible();
    await expect(page.getByText('X Rotation (Roll)').first()).toBeVisible();
    await expect(page.getByText('Include Pilot').first()).toBeVisible();
  });

  test('run drop test and see fitness score', async ({ page }) => {
    // Generate a vehicle
    await page.getByRole('button', { name: 'Generate Random Vehicle' }).first().click();
    await expect(page.getByText(/\d+ vertices/).first()).toBeVisible({ timeout: 10_000 });

    // Run drop test
    await page.getByRole('button', { name: 'Run Drop Test' }).first().click();

    // Wait for fitness score to appear
    await expect(page.getByText('Current Fitness').first()).toBeVisible({ timeout: 30_000 });

    // Score value should appear (number with "m")
    await expect(page.locator('.text-green-400').first()).toBeVisible();
  });

  test('drop test button disabled without vehicle', async ({ page }) => {
    const dropTestButton = page.getByRole('button', { name: 'Run Drop Test' }).first();
    await expect(dropTestButton).toBeDisabled();
  });

  test('switch to evolution mode shows dashboard', async ({ page }) => {
    // Click Evolution mode
    await page.getByRole('button', { name: 'Evolution' }).click();

    // Dashboard should appear
    await expect(page.getByRole('heading', { name: 'Evolution Dashboard' }).first()).toBeVisible();
    await expect(page.getByText('Evolution Configuration').first()).toBeVisible();
    await expect(page.getByText('Population Size').first()).toBeVisible();
    await expect(page.getByText('Number of Generations').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Evolution' }).first()).toBeVisible();
  });

  test('run small evolution and see results', async ({ page }) => {
    // Switch to evolution mode
    await page.getByRole('button', { name: 'Evolution' }).click();

    // Set small population and generations for fast test
    // Target the input fields within the evolution dashboard
    const dashboard = page.getByText('Evolution Configuration').first().locator('..');
    const popInput = dashboard.locator('input[type="number"]').first();
    await popInput.fill('10');

    const genInput = dashboard.locator('input[type="number"]').nth(1);
    await genInput.fill('2');

    // Start evolution
    await page.getByRole('button', { name: 'Start Evolution' }).first().click();

    // Wait for generation heading to appear (use role for precise match)
    await expect(
      page.getByRole('heading', { name: /^Generation \d+$/ }).first(),
    ).toBeVisible({ timeout: 60_000 });

    await expect(page.getByText('Best Fitness:').first()).toBeVisible();
    await expect(page.getByText('Average Fitness:').first()).toBeVisible();

    // Load Best Vehicle button should appear
    await expect(
      page.getByRole('button', { name: 'Load Best Vehicle' }).first(),
    ).toBeVisible();
  });

  test('mode toggle preserves single vehicle state', async ({ page }) => {
    // Generate a vehicle in single mode
    await page.getByRole('button', { name: 'Generate Random Vehicle' }).first().click();
    await expect(page.getByText(/\d+ vertices/).first()).toBeVisible({ timeout: 10_000 });

    // Switch to evolution and back
    await page.getByRole('button', { name: 'Evolution' }).click();
    await expect(page.getByRole('heading', { name: 'Evolution Dashboard' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Single Vehicle' }).click();

    // Vehicle state should be preserved
    await expect(page.getByText(/\d+ vertices/).first()).toBeVisible();
  });
});
