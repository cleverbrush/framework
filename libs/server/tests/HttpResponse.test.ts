import { describe, expect, it } from 'vitest';
import { HttpResponse } from '../src/HttpResponse.js';

describe('HttpResponse', () => {
    it('ok() creates 200 response', () => {
        const res = HttpResponse.ok({ id: 1 });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 1 });
    });

    it('created() creates 201 response with location', () => {
        const res = HttpResponse.created({ id: 1 }, '/users/1');
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ id: 1 });
        expect(res.headers['location']).toBe('/users/1');
    });

    it('created() without location', () => {
        const res = HttpResponse.created({ id: 1 });
        expect(res.status).toBe(201);
        expect(res.headers['location']).toBeUndefined();
    });

    it('noContent() creates 204 response', () => {
        const res = HttpResponse.noContent();
        expect(res.status).toBe(204);
        expect(res.body).toBeNull();
    });

    it('redirect() creates 302 by default', () => {
        const res = HttpResponse.redirect('/new-url');
        expect(res.status).toBe(302);
        expect(res.headers['location']).toBe('/new-url');
    });

    it('redirect() creates 301 when permanent', () => {
        const res = HttpResponse.redirect('/new-url', true);
        expect(res.status).toBe(301);
        expect(res.headers['location']).toBe('/new-url');
    });

    it('supports custom headers and content type', () => {
        const res = new HttpResponse(
            '<html></html>',
            200,
            { 'x-custom': 'val' },
            'text/html'
        );
        expect(res.contentType).toBe('text/html');
        expect(res.headers['x-custom']).toBe('val');
    });
});
