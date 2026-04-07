import { bench, describe } from 'vitest';
import {
    cbObjectNested,
    invalidObjectNested,
    joiObjectNested,
    validObjectNested,
    yupObjectNested,
    zodObjectNested
} from './schemas/index.js';

describe('Nested object validation (valid input)', () => {
    bench('@cleverbrush/schema', () => {
        cbObjectNested.validate(validObjectNested);
    });

    bench('zod', () => {
        zodObjectNested.safeParse(validObjectNested);
    });

    bench('yup', () => {
        yupObjectNested.validateSync(validObjectNested);
    });

    bench('joi', () => {
        joiObjectNested.validate(validObjectNested);
    });
});

describe('Nested object validation (invalid input)', () => {
    bench('@cleverbrush/schema', () => {
        cbObjectNested.validate(invalidObjectNested);
    });

    bench('zod', () => {
        zodObjectNested.safeParse(invalidObjectNested);
    });

    bench('yup', () => {
        try {
            yupObjectNested.validateSync(invalidObjectNested);
        } catch {}
    });

    bench('joi', () => {
        joiObjectNested.validate(invalidObjectNested);
    });
});
