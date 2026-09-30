import { number as plainNumber } from '@cleverbrush/schema';
import { expect, test } from 'vitest';
import { number } from './extension.js';
import { compileReadSchema } from './read-schema.js';

test('native storage metadata is immutable and does not install global methods', () => {
    const initial = number().decimal(24, 6).optional().hasColumnName('amount');
    const changed = initial.columnType('integer').required().index();
    expect(initial.introspect().extensions).toMatchObject({
        columnType: 'decimal(24,6)',
        columnName: 'amount'
    });
    expect(changed.introspect().extensions).toMatchObject({
        columnType: 'integer',
        columnName: 'amount',
        index: true
    });
    expect(
        compileReadSchema(initial).decode('123456789012345678.123456', 'amount')
    ).toBe('123456789012345678.123456');
    expect(compileReadSchema(changed).decode(42, 'amount')).toBe(42);
    for (const method of ['columnType', 'bigint', 'smallint', 'decimal']) {
        expect(method in plainNumber()).toBe(false);
    }
});
