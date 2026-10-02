import { jsonObject, jsonValue, object, string } from '@cleverbrush/schema';
import { expect, it } from 'vitest';
import { toJsonSchema } from './toJsonSchema.js';

it('describes JSON values, open JSON objects and permissive declared objects', () => {
    expect(toJsonSchema(jsonValue(), { $schema: false })).toEqual({});
    expect(toJsonSchema(jsonObject(), { $schema: false })).toEqual({
        type: 'object',
        additionalProperties: true
    });
    expect(
        toJsonSchema(object({ type: string() }).acceptUnknownProps(), {
            $schema: false
        }).additionalProperties
    ).not.toBe(false);
});
