import { afterAll, describe, expect, it } from 'vitest';
import { closePool } from '../support/db.js';
import { uniqueEmail } from '../support/ids.js';
import { closeBrowser, withPage } from '../support/playwright.js';

afterAll(async () => {
    await closeBrowser();
    await closePool();
});

describe('UI — live page', () => {
    it('opens /live, shows connected badge and receives at least one todo update', async () => {
        const email = uniqueEmail('ui-live');
        const password = 'TestPass123!';

        await withPage(async page => {
            // Register & login
            await page.goto('/register');
            await page.locator('input[type="email"]').fill(email);
            await page.locator('input[type="password"]').nth(0).fill(password);
            await page.locator('input[type="password"]').nth(1).fill(password);
            await page.getByRole('button', { name: /Create Account/i }).click();
            await page.waitForURL('**/todos', { timeout: 15_000 });

            // Navigate to Live page via sidebar
            await page.getByRole('link', { name: /Live/i }).click();
            await page.waitForURL('**/live');

            const todoUpdatesCard = page
                .locator('text=Live Todo Updates')
                .locator('..')
                .locator('..');

            // Wait for connection to be established (badge text "connected").
            await todoUpdatesCard
                .getByText(/^connected$/i)
                .waitFor({ state: 'visible', timeout: 10_000 });

            // Wait for at least one server-pushed event to render
            // (server pushes every 2s).
            await todoUpdatesCard
                .getByText(/^#\d+\s—\s/)
                .first()
                .waitFor({ state: 'visible', timeout: 8_000 });
        });
    });
});
