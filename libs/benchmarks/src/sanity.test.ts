/**
 * Sanity tests — verify that all 4 libraries produce the same pass/fail
 * outcomes for each scenario's fixtures. This ensures benchmarks are
 * comparing equivalent validation logic.
 */
import { describe, expect, test } from 'vitest';

import {
    cbArray,
    cbComplex,
    cbNumber,
    cbObjectFlat,
    cbObjectNested,
    cbString,
    cbUnion,
    invalidArray,
    invalidComplex,
    invalidNumber,
    invalidObjectFlat,
    invalidObjectNested,
    invalidString,
    invalidUnion,
    joiArray,
    joiComplex,
    joiNumber,
    joiObjectFlat,
    joiObjectNested,
    joiString,
    joiUnion,
    validArray,
    validComplex,
    validNumber,
    validObjectFlat,
    validObjectNested,
    validString,
    validUnionImage,
    validUnionText,
    validUnionVideo,
    yupArray,
    yupComplex,
    yupNumber,
    yupObjectFlat,
    yupObjectNested,
    yupString,
    yupUnion,
    zodArray,
    zodComplex,
    zodNumber,
    zodObjectFlat,
    zodObjectNested,
    zodString,
    zodUnion
} from './schemas/index.js';

// ── Helpers ─────────────────────────────────────────────────────────

function cbValid(schema: { validate(v: any): { valid: boolean } }, value: any) {
    return schema.validate(value).valid;
}

function zodValid(
    schema: { safeParse(v: any): { success: boolean } },
    value: any
) {
    return schema.safeParse(value).success;
}

function yupValid(schema: { validateSync(v: any): any }, value: any) {
    try {
        schema.validateSync(value);
        return true;
    } catch {
        return false;
    }
}

function joiValid(schema: { validate(v: any): { error?: any } }, value: any) {
    return !schema.validate(value).error;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('Primitive — string', () => {
    test('valid input accepted by all', () => {
        expect(cbValid(cbString, validString)).toBe(true);
        expect(zodValid(zodString, validString)).toBe(true);
        expect(yupValid(yupString, validString)).toBe(true);
        expect(joiValid(joiString, validString)).toBe(true);
    });

    test('invalid input rejected by all', () => {
        expect(cbValid(cbString, invalidString)).toBe(false);
        expect(zodValid(zodString, invalidString)).toBe(false);
        expect(yupValid(yupString, invalidString)).toBe(false);
        expect(joiValid(joiString, invalidString)).toBe(false);
    });
});

describe('Primitive — number', () => {
    test('valid input accepted by all', () => {
        expect(cbValid(cbNumber, validNumber)).toBe(true);
        expect(zodValid(zodNumber, validNumber)).toBe(true);
        expect(yupValid(yupNumber, validNumber)).toBe(true);
        expect(joiValid(joiNumber, validNumber)).toBe(true);
    });

    test('invalid input rejected by all', () => {
        expect(cbValid(cbNumber, invalidNumber)).toBe(false);
        expect(zodValid(zodNumber, invalidNumber)).toBe(false);
        expect(yupValid(yupNumber, invalidNumber)).toBe(false);
        expect(joiValid(joiNumber, invalidNumber)).toBe(false);
    });
});

describe('Object — flat', () => {
    test('valid input accepted by all', () => {
        expect(cbValid(cbObjectFlat, validObjectFlat)).toBe(true);
        expect(zodValid(zodObjectFlat, validObjectFlat)).toBe(true);
        expect(yupValid(yupObjectFlat, validObjectFlat)).toBe(true);
        expect(joiValid(joiObjectFlat, validObjectFlat)).toBe(true);
    });

    test('invalid input rejected by all', () => {
        expect(cbValid(cbObjectFlat, invalidObjectFlat)).toBe(false);
        expect(zodValid(zodObjectFlat, invalidObjectFlat)).toBe(false);
        expect(yupValid(yupObjectFlat, invalidObjectFlat)).toBe(false);
        expect(joiValid(joiObjectFlat, invalidObjectFlat)).toBe(false);
    });
});

describe('Object — nested', () => {
    test('valid input accepted by all', () => {
        expect(cbValid(cbObjectNested, validObjectNested)).toBe(true);
        expect(zodValid(zodObjectNested, validObjectNested)).toBe(true);
        expect(yupValid(yupObjectNested, validObjectNested)).toBe(true);
        expect(joiValid(joiObjectNested, validObjectNested)).toBe(true);
    });

    test('invalid input rejected by all', () => {
        expect(cbValid(cbObjectNested, invalidObjectNested)).toBe(false);
        expect(zodValid(zodObjectNested, invalidObjectNested)).toBe(false);
        expect(yupValid(yupObjectNested, invalidObjectNested)).toBe(false);
        expect(joiValid(joiObjectNested, invalidObjectNested)).toBe(false);
    });
});

describe('Array', () => {
    test('valid input accepted by all', () => {
        expect(cbValid(cbArray, validArray)).toBe(true);
        expect(zodValid(zodArray, validArray)).toBe(true);
        expect(yupValid(yupArray, validArray)).toBe(true);
        expect(joiValid(joiArray, validArray)).toBe(true);
    });

    test('invalid input rejected by all', () => {
        expect(cbValid(cbArray, invalidArray)).toBe(false);
        expect(zodValid(zodArray, invalidArray)).toBe(false);
        expect(yupValid(yupArray, invalidArray)).toBe(false);
        expect(joiValid(joiArray, invalidArray)).toBe(false);
    });
});

describe('Union', () => {
    test('text variant accepted by all', () => {
        expect(cbValid(cbUnion, validUnionText)).toBe(true);
        expect(zodValid(zodUnion, validUnionText)).toBe(true);
        expect(yupValid(yupUnion, validUnionText)).toBe(true);
        expect(joiValid(joiUnion, validUnionText)).toBe(true);
    });

    test('image variant accepted by all', () => {
        expect(cbValid(cbUnion, validUnionImage)).toBe(true);
        expect(zodValid(zodUnion, validUnionImage)).toBe(true);
        expect(yupValid(yupUnion, validUnionImage)).toBe(true);
        expect(joiValid(joiUnion, validUnionImage)).toBe(true);
    });

    test('video variant accepted by all', () => {
        expect(cbValid(cbUnion, validUnionVideo)).toBe(true);
        expect(zodValid(zodUnion, validUnionVideo)).toBe(true);
        expect(yupValid(yupUnion, validUnionVideo)).toBe(true);
        expect(joiValid(joiUnion, validUnionVideo)).toBe(true);
    });

    test('invalid input rejected by all', () => {
        expect(cbValid(cbUnion, invalidUnion)).toBe(false);
        expect(zodValid(zodUnion, invalidUnion)).toBe(false);
        expect(yupValid(yupUnion, invalidUnion)).toBe(false);
        expect(joiValid(joiUnion, invalidUnion)).toBe(false);
    });
});

describe('Complex — Create Order', () => {
    test('valid input accepted by all', () => {
        expect(cbValid(cbComplex, validComplex)).toBe(true);
        expect(zodValid(zodComplex, validComplex)).toBe(true);
        expect(yupValid(yupComplex, validComplex)).toBe(true);
        expect(joiValid(joiComplex, validComplex)).toBe(true);
    });

    test('invalid input rejected by all', () => {
        expect(cbValid(cbComplex, invalidComplex)).toBe(false);
        expect(zodValid(zodComplex, invalidComplex)).toBe(false);
        expect(yupValid(yupComplex, invalidComplex)).toBe(false);
        expect(joiValid(joiComplex, invalidComplex)).toBe(false);
    });
});
