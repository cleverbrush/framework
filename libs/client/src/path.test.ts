import { describe, expect, test, vi } from 'vitest';
import { buildPath } from './path.js';

describe('buildPath', () => {
    test('plain string template — appends to basePath', () => {
        expect(buildPath('/api/todos', '')).toBe('/api/todos');
        expect(buildPath('/api/todos', '/active')).toBe('/api/todos/active');
    });

    test('ParseStringSchemaBuilder-like template — calls serialize()', () => {
        const template = {
            serialize: vi.fn().mockReturnValue('/42')
        };

        const result = buildPath('/api/todos', template, { id: 42 });
        expect(result).toBe('/api/todos/42');
        expect(template.serialize).toHaveBeenCalledWith({ id: 42 });
    });

    test('template object without params — calls serialize with empty object', () => {
        const template = { serialize: vi.fn().mockReturnValue('/me') };
        const result = buildPath('/api/users', template);
        expect(result).toBe('/api/users/me');
        expect(template.serialize).toHaveBeenCalledWith({});
    });
});
