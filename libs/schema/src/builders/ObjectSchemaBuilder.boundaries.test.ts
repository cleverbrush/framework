import { describe, expect, it } from 'vitest';
import { array, object, string } from '../index.js';

describe('open object boundaries', () => {
    it.each([0, 'text', true, [], [1], null, undefined])(
        'rejects %j with inspectable errors',
        async value => {
            const schema = object({}).acceptUnknownProps();
            const result = schema.safeParse(value);
            expect(result.valid).toBe(false);
            const full = schema.validate(value as any, {
                doNotStopOnFirstError: true
            });
            expect(full.valid).toBe(false);
            expect(full.getErrorsFor().isValid).toBe(false);
            expect((await schema.validateAsync(value as any)).valid).toBe(
                false
            );
            const list = array(schema).validate([value] as any);
            expect(list.valid).toBe(false);
            expect(list.getNestedErrors()[0].getErrorsFor().isValid).toBe(
                false
            );
            expect(
                (await array(schema).validateAsync([value] as any)).valid
            ).toBe(false);
        }
    );
    it('keeps nested extensions and empty arrays without mutating the input', () => {
        const schema = object({
            rows: array(
                object({
                    data: object({}).acceptUnknownProps(),
                    items: array(string())
                })
            )
        });
        const value = {
            rows: [
                {
                    data: { extension: { empty: [], nullable: null } },
                    items: []
                }
            ]
        };
        const result = schema.parse(value);
        expect(result).toEqual(value);
        expect(Object.getOwnPropertySymbols(result.rows[0].items)).toEqual([]);
        expect(Object.getOwnPropertySymbols(value.rows[0].items)).toEqual([]);
    });
    it('preserves optional, nullable and preprocessor behavior', () => {
        expect(object({}).optional().safeParse(undefined).valid).toBe(true);
        expect(object({}).nullable().safeParse(null).valid).toBe(true);
        expect(
            object({ name: string() })
                .addPreprocessor(value =>
                    typeof value === 'string' ? { name: value } : value
                )
                .parse('Ada' as any)
        ).toEqual({ name: 'Ada' });
    });
});
