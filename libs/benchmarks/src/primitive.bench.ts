import { bench, describe } from 'vitest';
import {
    cbNumber,
    cbString,
    invalidNumber,
    invalidString,
    joiNumber,
    joiString,
    validNumber,
    validString,
    yupNumber,
    yupString,
    zodNumber,
    zodString
} from './schemas/index.js';

describe('String validation (valid input)', () => {
    bench('@cleverbrush/schema', () => {
        cbString.validate(validString);
    });

    bench('zod', () => {
        zodString.safeParse(validString);
    });

    bench('yup', () => {
        yupString.validateSync(validString);
    });

    bench('joi', () => {
        joiString.validate(validString);
    });
});

describe('String validation (invalid input)', () => {
    bench('@cleverbrush/schema', () => {
        cbString.validate(invalidString);
    });

    bench('zod', () => {
        zodString.safeParse(invalidString);
    });

    bench('yup', () => {
        try {
            yupString.validateSync(invalidString);
        } catch {}
    });

    bench('joi', () => {
        joiString.validate(invalidString);
    });
});

describe('Number validation (valid input)', () => {
    bench('@cleverbrush/schema', () => {
        cbNumber.validate(validNumber);
    });

    bench('zod', () => {
        zodNumber.safeParse(validNumber);
    });

    bench('yup', () => {
        yupNumber.validateSync(validNumber);
    });

    bench('joi', () => {
        joiNumber.validate(validNumber);
    });
});

describe('Number validation (invalid input)', () => {
    bench('@cleverbrush/schema', () => {
        cbNumber.validate(invalidNumber);
    });

    bench('zod', () => {
        zodNumber.safeParse(invalidNumber);
    });

    bench('yup', () => {
        try {
            yupNumber.validateSync(invalidNumber);
        } catch {}
    });

    bench('joi', () => {
        joiNumber.validate(invalidNumber);
    });
});
