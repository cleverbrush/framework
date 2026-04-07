import { bench, describe } from 'vitest';
import {
    cbComplex,
    invalidComplex,
    joiComplex,
    validComplex,
    yupComplex,
    zodComplex
} from './schemas/index.js';

describe('Complex "Create Order" (valid input)', () => {
    bench('@cleverbrush/schema', () => {
        cbComplex.validate(validComplex);
    });

    bench('zod', () => {
        zodComplex.safeParse(validComplex);
    });

    bench('yup', () => {
        yupComplex.validateSync(validComplex);
    });

    bench('joi', () => {
        joiComplex.validate(validComplex);
    });
});

describe('Complex "Create Order" (invalid input)', () => {
    bench('@cleverbrush/schema', () => {
        cbComplex.validate(invalidComplex);
    });

    bench('zod', () => {
        zodComplex.safeParse(invalidComplex);
    });

    bench('yup', () => {
        try {
            yupComplex.validateSync(invalidComplex);
        } catch {}
    });

    bench('joi', () => {
        joiComplex.validate(invalidComplex);
    });
});
