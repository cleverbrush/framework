import { describe, expect, test } from 'vitest';
import { array, number, string } from '../index.js';

describe('array extensions', () => {
    // -----------------------------------------------------------------------
    // nonempty()
    // -----------------------------------------------------------------------
    describe('nonempty()', () => {
        test('rejects an empty array', async () => {
            const schema = array().nonempty();
            const result = await schema.validate([]);
            expect(result.valid).toBe(false);
            expect(result.errors?.length).toBeGreaterThan(0);
        });

        test('accepts a non-empty array', async () => {
            const schema = array().nonempty();
            const result = await schema.validate([1]);
            expect(result.valid).toBe(true);
        });

        test('works with typed element schema', async () => {
            const schema = array().nonempty().of(string());
            const r1 = await schema.validate([]);
            expect(r1.valid).toBe(false);

            const r2 = await schema.validate(['hello']);
            expect(r2.valid).toBe(true);
        });

        test('stores extension metadata', () => {
            const meta = array().nonempty().introspect();
            expect(meta.extensions?.nonempty).toBe(true);
        });

        test('uses custom error message', async () => {
            const result = await array()
                .nonempty('At least one item required')
                .validate([]);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe(
                'At least one item required'
            );
        });

        test('uses function error message', async () => {
            const result = await array()
                .nonempty((val) => `expected items but got ${val.length}`)
                .validate([]);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('expected items but got 0');
        });
    });

    // -----------------------------------------------------------------------
    // unique()
    // -----------------------------------------------------------------------
    describe('unique()', () => {
        test('accepts unique primitives', async () => {
            const result = await array().unique().validate([1, 2, 3]);
            expect(result.valid).toBe(true);
        });

        test('rejects duplicate primitives', async () => {
            const result = await array().unique().validate([1, 2, 2]);
            expect(result.valid).toBe(false);
        });

        test('accepts unique strings', async () => {
            const result = await array()
                .unique()
                .of(string())
                .validate(['a', 'b', 'c']);
            expect(result.valid).toBe(true);
        });

        test('rejects duplicate strings', async () => {
            const result = await array()
                .unique()
                .of(string())
                .validate(['a', 'b', 'a']);
            expect(result.valid).toBe(false);
        });

        test('uses keyFn for object uniqueness', async () => {
            const items = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' }
            ];
            const schema = array().unique((item: any) => item.id);
            const result = await schema.validate(items);
            expect(result.valid).toBe(true);
        });

        test('rejects duplicate objects by keyFn', async () => {
            const items = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 1, name: 'Duplicate' }
            ];
            const schema = array().unique((item: any) => item.id);
            const result = await schema.validate(items);
            expect(result.valid).toBe(false);
        });

        test('stores extension metadata', () => {
            const meta = array().unique().introspect();
            expect(meta.extensions?.unique).toBe(true);
        });

        test('uses custom error message', async () => {
            const result = await array()
                .unique(undefined, 'No duplicates allowed')
                .validate([1, 1]);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('No duplicates allowed');
        });

        test('uses custom error message with keyFn', async () => {
            const items = [
                { id: 1, name: 'A' },
                { id: 1, name: 'B' }
            ];
            const result = await array()
                .unique((item: any) => item.id, 'IDs must be unique')
                .validate(items);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('IDs must be unique');
        });
    });

    // -----------------------------------------------------------------------
    // chaining
    // -----------------------------------------------------------------------
    describe('chaining', () => {
        test('nonempty + unique', async () => {
            const schema = array().nonempty().unique().of(number());
            expect((await schema.validate([])).valid).toBe(false);
            expect((await schema.validate([1, 1])).valid).toBe(false);
            expect((await schema.validate([1, 2])).valid).toBe(true);
        });

        test('chains with built-in minLength/maxLength', async () => {
            const schema = array().nonempty().unique().maxLength(3);
            expect((await schema.validate([1, 2, 3])).valid).toBe(true);
            expect((await schema.validate([1, 2, 3, 4])).valid).toBe(false);
            expect((await schema.validate([])).valid).toBe(false);
        });

        test('metadata preserved through chaining', () => {
            const meta = array().nonempty().unique().introspect();
            expect(meta.extensions?.nonempty).toBe(true);
            expect(meta.extensions?.unique).toBe(true);
        });
    });
});
