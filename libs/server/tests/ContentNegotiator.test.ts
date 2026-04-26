import { describe, expect, it } from 'vitest';
import { ContentNegotiator } from '../src/ContentNegotiator.js';

describe('ContentNegotiator', () => {
    it('defaults to JSON handler when no Accept header', () => {
        const cn = new ContentNegotiator();
        const handler = cn.selectResponseHandler();
        expect(handler).not.toBeNull();
        expect(handler!.mimeType).toBe('application/json');
    });

    it('selects JSON for application/json Accept', () => {
        const cn = new ContentNegotiator();
        const handler = cn.selectResponseHandler('application/json');
        expect(handler!.mimeType).toBe('application/json');
    });

    it('selects JSON for */* Accept', () => {
        const cn = new ContentNegotiator();
        const handler = cn.selectResponseHandler('*/*');
        expect(handler!.mimeType).toBe('application/json');
    });

    it('respects quality values', () => {
        const cn = new ContentNegotiator();
        cn.register({
            mimeType: 'text/xml',
            serialize: () => '<xml/>',
            deserialize: () => ({})
        });
        const handler = cn.selectResponseHandler(
            'text/xml;q=0.5, application/json;q=0.9'
        );
        expect(handler!.mimeType).toBe('application/json');
    });

    it('returns null for unsupported Accept type', () => {
        const cn = new ContentNegotiator();
        const handler = cn.selectResponseHandler('text/csv');
        expect(handler).toBeNull();
    });

    it('selects request handler by Content-Type', () => {
        const cn = new ContentNegotiator();
        const handler = cn.selectRequestHandler(
            'application/json; charset=utf-8'
        );
        expect(handler).not.toBeNull();
        expect(handler!.mimeType).toBe('application/json');
    });

    it('returns null for missing Content-Type', () => {
        const cn = new ContentNegotiator();
        expect(cn.selectRequestHandler()).toBeNull();
    });

    it('returns null for unknown Content-Type', () => {
        const cn = new ContentNegotiator();
        expect(cn.selectRequestHandler('text/csv')).toBeNull();
    });

    it('JSON handler serializes and deserializes', () => {
        const cn = new ContentNegotiator();
        const handler = cn.selectResponseHandler()!;
        const data = { id: 1, name: 'test' };
        const serialized = handler.serialize(data);
        expect(JSON.parse(serialized)).toEqual(data);
        expect(handler.deserialize(serialized)).toEqual(data);
    });

    it('supports custom content type handlers', () => {
        const cn = new ContentNegotiator();
        cn.register({
            mimeType: 'text/plain',
            serialize: v => String(v),
            deserialize: raw => raw
        });
        const handler = cn.selectResponseHandler('text/plain');
        expect(handler).not.toBeNull();
        expect(handler!.mimeType).toBe('text/plain');
    });

    it('treats invalid q value as 1 (line 32)', () => {
        const cn = new ContentNegotiator();
        cn.register({
            mimeType: 'text/xml',
            serialize: () => '<xml/>',
            deserialize: () => ({})
        });
        // q=invalid is NaN, so quality defaults to 1 — text/xml wins
        const handler = cn.selectResponseHandler('text/xml;q=invalid');
        expect(handler!.mimeType).toBe('text/xml');
    });
});
