import { number, object, string } from '@cleverbrush/schema';
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
});
