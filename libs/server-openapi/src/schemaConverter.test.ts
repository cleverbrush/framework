import { boolean, number, object, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { convertSchema } from './schemaConverter.js';

describe('schemaConverter', () => {
    it('converts string schema to JSON Schema without $schema', () => {
        const result = convertSchema(string());
        expect(result).toEqual({ type: 'string' });
        expect(result).not.toHaveProperty('$schema');
    });

    it('converts object schema with nested properties', () => {
        const result = convertSchema(object({ name: string(), age: number() }));
        expect(result).toHaveProperty('properties');
        expect(result).toHaveProperty('type', 'object');
    });

    it('converts nullable schema correctly', () => {
        const result = convertSchema(string().nullable());
        expect(result).toEqual({ type: ['string', 'null'] });
    });

    it('handles null input gracefully', () => {
        expect(convertSchema(null)).toEqual({});
    });

    it('handles undefined input gracefully', () => {
        expect(convertSchema(undefined)).toEqual({});
    });

    it('preserves description from .describe()', () => {
        const result = convertSchema(string().describe('A name'));
        expect(result).toHaveProperty('description', 'A name');
    });

    // --- Default values ---

    it('emits default for string with literal default', () => {
        const result = convertSchema(string().default('hello'));
        expect(result).toEqual({ type: 'string', default: 'hello' });
    });

    it('emits default for number with literal default', () => {
        const result = convertSchema(number().default(42));
        expect(result).toEqual({ type: 'integer', default: 42 });
    });

    it('emits default for boolean with literal default', () => {
        const result = convertSchema(boolean().default(false));
        expect(result).toEqual({ type: 'boolean', default: false });
    });

    it('omits default for factory function default', () => {
        const result = convertSchema(string().default(() => 'x'));
        expect(result).not.toHaveProperty('default');
    });

    // --- Example values ---

    it('emits examples array from .example()', () => {
        const result = convertSchema(string().example('user@example.com'));
        expect(result).toEqual({
            type: 'string',
            examples: ['user@example.com']
        });
    });
});
