import { describe, expect, test } from 'vitest';
import {
    resolveErrorMessage,
    resolveErrorMessageAsync,
    validationFail
} from './util.js';

describe('resolveErrorMessage', () => {
    test('returns defaultMsg when provider is undefined', () => {
        expect(resolveErrorMessage(undefined, 'default', 'val', null)).toBe(
            'default'
        );
    });

    test('returns string provider directly', () => {
        expect(resolveErrorMessage('custom', 'default', 'val', null)).toBe(
            'custom'
        );
    });

    test('calls function provider with value and schema', () => {
        const provider = (v: unknown) => `got ${v}`;
        expect(resolveErrorMessage(provider, 'default', 42, null)).toBe(
            'got 42'
        );
    });

    test('throws when function provider returns a Promise', () => {
        const asyncProvider = () => Promise.resolve('msg');
        expect(() =>
            resolveErrorMessage(asyncProvider as any, 'default', 'val', null)
        ).toThrow('validateAsync()');
    });
});

describe('resolveErrorMessageAsync', () => {
    test('returns defaultMsg when provider is undefined', async () => {
        expect(
            await resolveErrorMessageAsync(undefined, 'default', 'val', null)
        ).toBe('default');
    });

    test('returns string provider directly', async () => {
        expect(
            await resolveErrorMessageAsync('custom', 'default', 'val', null)
        ).toBe('custom');
    });

    test('awaits async function provider', async () => {
        const provider = async (v: unknown) => `async-${v}`;
        expect(
            await resolveErrorMessageAsync(provider, 'default', 99, null)
        ).toBe('async-99');
    });
});

describe('validationFail', () => {
    test('returns invalid result with default message', () => {
        const result = validationFail(undefined, 'bad value', 'x', null);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toBe('bad value');
    });

    test('returns invalid result with custom string message', () => {
        const result = validationFail('custom error', 'default', 'x', null);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toBe('custom error');
    });
});
