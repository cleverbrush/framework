import { describe, expect, test } from 'vitest';
import { makeEscape } from './makeEscape.js';

const escapeFn = makeEscape();

describe('makeEscape', () => {
    describe('null and undefined', () => {
        test('null returns NULL', () => {
            expect(escapeFn(null)).toBe('NULL');
        });

        test('undefined returns NULL', () => {
            expect(escapeFn(undefined)).toBe('NULL');
        });
    });

    describe('booleans', () => {
        test('true returns "true"', () => {
            expect(escapeFn(true)).toBe('true');
        });

        test('false returns "false"', () => {
            expect(escapeFn(false)).toBe('false');
        });
    });

    describe('numbers', () => {
        test('integer', () => {
            expect(escapeFn(42)).toBe('42');
        });

        test('negative number', () => {
            expect(escapeFn(-7)).toBe('-7');
        });

        test('float', () => {
            expect(escapeFn(3.14)).toBe('3.14');
        });

        test('zero', () => {
            expect(escapeFn(0)).toBe('0');
        });

        test('NaN', () => {
            expect(escapeFn(NaN)).toBe('NaN');
        });

        test('Infinity', () => {
            expect(escapeFn(Infinity)).toBe('Infinity');
        });
    });

    describe('strings', () => {
        test('simple string', () => {
            expect(escapeFn('hello')).toBe("'hello'");
        });

        test('empty string', () => {
            expect(escapeFn('')).toBe("''");
        });

        test('string with single quotes', () => {
            expect(escapeFn("it's")).toBe("'it\\'s'");
        });

        test('string with backslash', () => {
            expect(escapeFn('back\\slash')).toBe("'back\\\\slash'");
        });

        test('string with double quotes', () => {
            expect(escapeFn('say "hello"')).toBe('\'say \\"hello\\"\'');
        });

        test('string with newline', () => {
            expect(escapeFn('line1\nline2')).toBe("'line1\\nline2'");
        });

        test('string with tab', () => {
            expect(escapeFn('col1\tcol2')).toBe("'col1\\tcol2'");
        });

        test('string with null byte', () => {
            expect(escapeFn('null\0byte')).toBe("'null\\0byte'");
        });

        test('SQL injection attempt — single quote is escaped', () => {
            const result = escapeFn("'; DROP TABLE users; --");
            // The leading single quote is backslash-escaped, preventing string breakout
            expect(result).toMatch(/^'\\'/);
        });
    });

    describe('dates', () => {
        test('formats a UTC date', () => {
            const result = escapeFn(new Date('2024-06-15T12:30:45.123Z'), {
                timeZone: 'Z'
            });
            expect(result).toBe("'2024-06-15 12:30:45.123'");
        });

        test('formats epoch date', () => {
            const result = escapeFn(new Date('1970-01-01T00:00:00.000Z'), {
                timeZone: 'Z'
            });
            expect(result).toBe("'1970-01-01 00:00:00.000'");
        });
    });

    describe('arrays', () => {
        test('simple number array', () => {
            expect(escapeFn([1, 2, 3])).toBe('1, 2, 3');
        });

        test('string array', () => {
            expect(escapeFn(['a', 'b'])).toBe("'a', 'b'");
        });

        test('mixed array', () => {
            expect(escapeFn([1, 'two', null, true])).toBe(
                "1, 'two', NULL, true"
            );
        });

        test('nested array', () => {
            expect(
                escapeFn([
                    [1, 2],
                    [3, 4]
                ])
            ).toBe('(1, 2), (3, 4)');
        });

        test('empty array', () => {
            expect(escapeFn([])).toBe('');
        });
    });

    describe('buffers', () => {
        test('buffer to hex string', () => {
            const buf = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
            expect(escapeFn(buf)).toBe("X'deadbeef'");
        });

        test('empty buffer', () => {
            expect(escapeFn(Buffer.from([]))).toBe("X''");
        });
    });

    describe('objects', () => {
        test('plain object serialized as JSON', () => {
            expect(escapeFn({ a: 1 })).toBe('{"a":1}');
        });

        test('object with toSQL method', () => {
            const obj = {
                toSQL: () => 'custom_sql_expression'
            };
            expect(escapeFn(obj)).toBe('custom_sql_expression');
        });
    });

    describe('custom config', () => {
        test('custom escapeString', () => {
            const customEscape = makeEscape({
                escapeString: (val: string) => `<${val}>`
            });
            expect(customEscape('hello')).toBe('<hello>');
        });

        test('custom escapeArray', () => {
            const customEscape = makeEscape({
                escapeArray: (arr: any[], esc: any) =>
                    `[${arr.map(v => esc(v)).join(';')}]`
            });
            expect(customEscape([1, 2, 3])).toBe('[1;2;3]');
        });

        test('custom escapeObject', () => {
            const customEscape = makeEscape({
                escapeObject: () => 'CUSTOM_OBJ'
            });
            expect(customEscape({ key: 'value' })).toBe('CUSTOM_OBJ');
        });

        test('custom escapeDate', () => {
            const customEscape = makeEscape({
                escapeDate: () => 'CUSTOM_DATE'
            });
            // The date escape result is then passed through escapeString
            const result = customEscape(new Date());
            expect(result).toContain('CUSTOM_DATE');
        });

        test('custom escapeBuffer', () => {
            const customEscape = makeEscape({
                escapeBuffer: () => 'CUSTOM_BUF'
            });
            expect(customEscape(Buffer.from([1]))).toBe('CUSTOM_BUF');
        });

        test('no wrap produces raw function', () => {
            const rawEscape = makeEscape({ wrap: null });
            // Without wrap, the function signature is (val, finalEscape, ctx)
            expect(rawEscape(42, null, {})).toBe('42');
            expect(rawEscape(null, null, {})).toBe('NULL');
        });
    });

    describe('dates - timezone paths', () => {
        test('local timezone (no ctx) formats using local date methods', () => {
            // No timeZone ctx → defaults to 'local' → uses getFullYear/getMonth etc.
            const result = escapeFn(new Date('2024-06-15T12:30:45.123Z'));
            // Value depends on system locale, but format must be correct
            expect(result).toMatch(
                /^'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}'$/
            );
        });

        test('positive UTC offset timezone applies time shift', () => {
            // +05:00 → convertTimezone returns 300; dt shifts +5h before UTC extraction
            const result = escapeFn(new Date('2024-06-15T12:30:45.123Z'), {
                timeZone: '+05:00'
            });
            expect(result).toBe("'2024-06-15 17:30:45.123'");
        });

        test('UTC timezone with no shift (+00:00)', () => {
            // +00:00 → convertTimezone returns 0; no setTime call; UTC output unchanged
            const result = escapeFn(new Date('2024-06-15T12:30:45.123Z'), {
                timeZone: '+00:00'
            });
            expect(result).toBe("'2024-06-15 12:30:45.123'");
        });

        test('invalid timezone string falls back to UTC (convertTimezone returns false)', () => {
            // 'invalid' does not match the timezone regex → returns false → no time shift
            const result = escapeFn(new Date('2024-06-15T12:30:45.123Z'), {
                timeZone: 'invalid'
            });
            expect(result).toBe("'2024-06-15 12:30:45.123'");
        });
    });
});
