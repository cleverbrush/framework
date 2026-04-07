import { bench, describe } from 'vitest';
import {
    cbArray,
    invalidArray,
    joiArray,
    validArray,
    yupArray,
    zodArray
} from './schemas/index.js';

describe('Array of 100 objects (valid input)', () => {
    bench('@cleverbrush/schema', () => {
        cbArray.validate(validArray);
    });

    bench('zod', () => {
        zodArray.safeParse(validArray);
    });

    bench('yup', () => {
        yupArray.validateSync(validArray);
    });

    bench('joi', () => {
        joiArray.validate(validArray);
    });
});

describe('Array of 100 objects (invalid input)', () => {
    bench('@cleverbrush/schema', () => {
        cbArray.validate(invalidArray);
    });

    bench('zod', () => {
        zodArray.safeParse(invalidArray);
    });

    bench('yup', () => {
        try {
            yupArray.validateSync(invalidArray);
        } catch {}
    });

    bench('joi', () => {
        joiArray.validate(invalidArray);
    });
});
