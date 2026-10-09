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
    it('shows a real server rejection beside the field, preserves edits and retries', async () => {
        await withPage(async page => {
            await registerAndLogin(page, uniqueEmail('ui-field-errors'), 'TestPass123!');
            await page.goto('/todos/new');
            const title = page.locator('input').first();
            await title.fill(uniqueTitle('rejected'));
            await page.locator('textarea').fill('Keep this description');
            // Simulate a stale client's request shape while keeping the browser
            // input locally valid. The actual backend produces the 400 response.
            await page.route(/\/api\/todos\/?$/, async route => {
                if (route.request().method() !== 'POST') return route.continue();
                await route.continue({postData: JSON.stringify({...route.request().postDataJSON(), title: ''})});
            });
            await page.getByRole('button', {name: 'Create Todo', exact: true}).click();
            await page.getByText('Check the highlighted fields.').waitFor();
            expect(await title.getAttribute('aria-invalid')).toBe('true');
            expect(await page.locator('textarea').inputValue()).toBe('Keep this description');
            await page.unroute(/\/api\/todos\/?$/);
            await title.fill(uniqueTitle('corrected'));
            expect(await title.getAttribute('aria-invalid')).toBe('false');
            await page.getByRole('button', {name: 'Create Todo', exact: true}).click();
            await page.waitForURL(/\/todos\/\d+$/);
        });
    });
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
            // Stay on the detail page until its requests settle: an admin-only
            // picker lookup must not sign out an ordinary user after creation.
            await page.getByRole('button', { name: 'Save Changes', exact: true }).waitFor();
            await page.waitForLoadState('networkidle');
            expect(page.url()).toMatch(/\/todos\/\d+$/);
            expect(await page.locator('input').first().inputValue()).toBe(title);
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
