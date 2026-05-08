import { describe, expect, it } from 'vitest';
import { endpoint } from './Endpoint.js';

describe('EndpointBuilder.public()', () => {
    it('sets authRoles to null on a plain endpoint', () => {
        const ep = endpoint.get('/api/test').public();
        expect(ep.introspect().authRoles).toBeNull();
    });

    it('overrides authorize() when public() is called after', () => {
        const ep = endpoint.get('/api/test').authorize('admin').public();
        expect(ep.introspect().authRoles).toBeNull();
    });

    it('is idempotent', () => {
        const ep = endpoint.get('/api/test').public().public();
        expect(ep.introspect().authRoles).toBeNull();
    });

    it('preserves other metadata', () => {
        const ep = endpoint.get('/api/test').public();
        const meta = ep.introspect();
        expect(meta.method).toBe('GET');
        expect(meta.basePath).toBe('/api/test');
    });
});

describe('ScopedEndpointFactory.public()', () => {
    it('factory.public() returns methods where endpoints have authRoles=null', () => {
        const factory = endpoint.resource('/api/test').public();
        const ep = factory.get();
        expect(ep.introspect().authRoles).toBeNull();
    });

    it('authorize then public on factory sets null', () => {
        const factory = endpoint
            .resource('/api/test')
            .authorize('admin')
            .public();
        const ep = factory.get();
        expect(ep.introspect().authRoles).toBeNull();
    });
});
