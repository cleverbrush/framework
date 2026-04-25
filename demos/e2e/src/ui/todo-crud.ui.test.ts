import { afterAll, describe, expect, it } from 'vitest';
import { closePool, query } from '../support/db.js';
import { uniqueEmail, uniqueTitle } from '../support/ids.js';
import { closeBrowser, withPage } from '../support/playwright.js';

afterAll(async () => {
    await closeBrowser();
    await closePool();
});

async function registerAndLogin(
    page: import('playwright').Page,
    email: string,
    password: string
): Promise<void> {
    await page.goto('/register');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').nth(0).fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);
    await page.getByRole('button', { name: /Create Account/i }).click();
    await page.waitForURL('**/todos', { timeout: 15_000 });
}

describe('UI — todo CRUD', () => {
    it('create → appears in list → delete → disappears; DB row removed', async () => {
        const email = uniqueEmail('ui-crud');
        const title = uniqueTitle('crud');

        await withPage(async page => {
            await registerAndLogin(page, email, 'TestPass123!');

            // Create
            await page.getByRole('button', { name: /\+ New Todo/i }).click();
            await page.waitForURL('**/todos/new');
            // Radix TextField renders <input> without an explicit type.
            await page.locator('input').first().fill(title);
            await page.getByRole('button', { name: /Create Todo/i }).click();

            // Detail page after creation
            await page.waitForURL(/\/todos\/\d+$/, { timeout: 10_000 });
            const url = page.url();
            const todoId = Number(url.match(/\/todos\/(\d+)$/)![1]);

            // Back to list (direct nav avoids sidebar-link selector ambiguity)
            await page.goto('/todos');
            await page.getByRole('heading', { name: /My Todos/i }).waitFor();
            await page.getByText(title).first().waitFor({ state: 'visible' });

            // Verify DB row exists
            const rows = await query<{ id: number; title: string }>(
                'SELECT id, title FROM todos WHERE id = $1',
                [todoId]
            );
            expect(rows).toHaveLength(1);
            expect(rows[0].title).toBe(title);

            // Delete via row action
            const row = page.getByRole('row').filter({ hasText: title });
            await row.getByRole('button', { name: /^Delete$/i }).click();

            // Confirm in the AlertDialog.
            // AlertDialog.Action wraps a Radix <Button>, producing nested
            // <button> elements. Playwright's getByRole('button') may target the
            // outer AlertDialog.Action button (whose only click handler is
            // DialogPrimitive.Close — it closes the dialog but does NOT call
            // onConfirm). Target the inner Radix Button (.rt-Button) directly
            // so that onClick={handleDelete} fires correctly.
            const dialog = page.getByRole('alertdialog');
            await dialog.waitFor({ state: 'visible' });

            // Confirm and wait for the DELETE API call — proves handleDelete ran
            // and the backend accepted the request.
            const [deleteRes] = await Promise.all([
                page.waitForResponse(
                    res =>
                        res.request().method() === 'DELETE' &&
                        res.url().includes('/api/todos/'),
                    { timeout: 10_000 }
                ),
                dialog.locator('.rt-Button', { hasText: 'Delete' }).click(),
            ]);
            expect(deleteRes.status()).toBe(204);

            // The client-side throttlingCache (2-second TTL) may return the
            // stale pre-delete list when load() fires immediately after the
            // delete. Navigate to /todos to force a full page reload: this
            // resets the module-level cache and guarantees a fresh list fetch.
            await page.goto('/todos');
            await page.getByRole('heading', { name: /My Todos/i }).waitFor({
                timeout: 10_000
            });
            // The user's only todo was deleted — wait for the empty-state UI.
            await page
                .getByText('No todos yet', { exact: false })
                .waitFor({ state: 'visible', timeout: 8_000 });

            // Verify DB row is physically removed — the ORM change-tracker
            // issues a hard DELETE (not a soft-delete UPDATE).
            const after = await query(
                'SELECT id FROM todos WHERE id = $1',
                [todoId]
            );
            expect(after).toHaveLength(0);
        });
    });
});
