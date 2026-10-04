import { describe, expect, it } from 'vitest';
import { VirtualServerResponse } from './VirtualHttp.js';

describe('virtual HTTP response', () => {
    it('preserves directly assigned status codes in batch results', () => {
        const response = new VirtualServerResponse();
        response.statusCode = 202;
        response.end('accepted');
        expect(response.toResult().status).toBe(202);
    });

    it('provides a header snapshot for response middleware', () => {
        const response = new VirtualServerResponse();
        response.setHeader('Cache-Control', 'private');
        const headers = response.getHeaders();
        headers['cache-control'] = 'public';
        expect(response.getHeaders()).toEqual({ 'cache-control': 'private' });
    });
});
