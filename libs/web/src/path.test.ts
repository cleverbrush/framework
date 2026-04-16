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

    test('template object without params — returns basePath only', () => {
        const template = { serialize: vi.fn() };
        const result = buildPath('/api/todos', template);
        expect(result).toBe('/api/todos');
        expect(template.serialize).not.toHaveBeenCalled();
    });
});
