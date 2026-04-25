import { afterAll, describe, expect, it } from 'vitest';
import { closePool, getUserByEmail } from '../support/db.js';
import { uniqueEmail } from '../support/ids.js';
import { closeBrowser, withPage } from '../support/playwright.js';

afterAll(async () => {
    await closeBrowser();
    await closePool();
});

describe('UI — auth flow', () => {
    it('register → app navigates to /todos and shows the user email', async () => {
        const email = uniqueEmail('ui-auth');
        const password = 'TestPass123!';

        await withPage(async page => {
            await page.goto('/register');
            await page.getByRole('heading', { name: /Create Account/i }).waitFor();

            await page.locator('input[type="email"]').fill(email);
            await page.locator('input[type="password"]').nth(0).fill(password);
            await page.locator('input[type="password"]').nth(1).fill(password);
            await page.getByRole('button', { name: /Create Account/i }).click();

            await page.waitForURL('**/todos', { timeout: 15_000 });
            await page.getByRole('heading', { name: /My Todos/i }).waitFor();
            await page.getByText(email).first().waitFor({ state: 'visible' });
        });

        const row = await getUserByEmail(email);
        expect(row).not.toBeNull();
        expect(row!.email).toBe(email);
    });

    it('logout returns to /login; relogin with same credentials succeeds', async () => {
        const email = uniqueEmail('ui-relogin');
        const password = 'TestPass123!';

        await withPage(async page => {
            // Register
            await page.goto('/register');
            await page.locator('input[type="email"]').fill(email);
            await page.locator('input[type="password"]').nth(0).fill(password);
            await page.locator('input[type="password"]').nth(1).fill(password);
            await page.getByRole('button', { name: /Create Account/i }).click();
            await page.waitForURL('**/todos');

            // Logout via sidebar
            await page.getByRole('button', { name: /Sign out/i }).click();
            await page.waitForURL('**/login');

            // Login back
            await page.locator('input[type="email"]').fill(email);
            await page.locator('input[type="password"]').fill(password);
            await page.getByRole('button', { name: /^Sign in$/i }).click();
            await page.waitForURL('**/todos', { timeout: 15_000 });
            await page.getByText(email).first().waitFor({ state: 'visible' });
        });
    });
});
