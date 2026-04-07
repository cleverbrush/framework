import { bench, describe } from 'vitest';
import {
    cbObjectFlat,
    invalidObjectFlat,
    joiObjectFlat,
    validObjectFlat,
    yupObjectFlat,
    zodObjectFlat
} from './schemas/index.js';

describe('Flat object validation (valid input)', () => {
    bench('@cleverbrush/schema', () => {
        cbObjectFlat.validate(validObjectFlat);
    });

    bench('zod', () => {
        zodObjectFlat.safeParse(validObjectFlat);
    });

    bench('yup', () => {
        yupObjectFlat.validateSync(validObjectFlat);
    });

    bench('joi', () => {
        joiObjectFlat.validate(validObjectFlat);
    });
});

describe('Flat object validation (invalid input)', () => {
    bench('@cleverbrush/schema', () => {
        cbObjectFlat.validate(invalidObjectFlat);
    });

    bench('zod', () => {
        zodObjectFlat.safeParse(invalidObjectFlat);
    });

    bench('yup', () => {
        try {
            yupObjectFlat.validateSync(invalidObjectFlat);
        } catch {}
    });

    bench('joi', () => {
        joiObjectFlat.validate(invalidObjectFlat);
    });
});
