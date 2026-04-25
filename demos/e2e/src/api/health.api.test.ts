import { describe, expect, it } from 'vitest';
import { request } from '../support/http.js';

describe('Harness smoke — backend health', () => {
    it('GET /health returns 200', async () => {
        const res = await request('GET', '/health');
        expect(res.status).toBe(200);
    });
});
