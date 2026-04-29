import {
    type Browser,
    type BrowserContext,
    type Page,
    chromium
} from 'playwright';
import { config } from './env.js';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
    if (!browser) {
        browser = await chromium.launch({
            headless: !config.headed,
            slowMo: config.slowMo
        });
    }
    return browser;
}

/** Tear down the shared browser; called from afterAll in UI tests. */
export async function closeBrowser(): Promise<void> {
    if (browser) {
        await browser.close();
        browser = null;
    }
}

/**
 * Run `fn` against a fresh isolated browser context + page, then clean up.
 * Each call gets its own cookies/localStorage so tests don't interfere.
 */
export async function withPage<T>(
    fn: (page: Page, context: BrowserContext) => Promise<T>
): Promise<T> {
    const ctx = await (await getBrowser()).newContext({
        baseURL: config.frontendUrl
    });
    const page = await ctx.newPage();
    try {
        return await fn(page, ctx);
    } finally {
        await ctx.close();
    }
}
