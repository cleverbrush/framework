import { bench, describe } from 'vitest';
import {
    cbUnion,
    invalidUnion,
    joiUnion,
    validUnionText,
    validUnionVideo,
    yupUnion,
    zodUnion
} from './schemas/index.js';

describe('Union — match first branch (text)', () => {
    bench('@cleverbrush/schema', () => {
        cbUnion.validate(validUnionText as any);
    });

    bench('zod', () => {
        zodUnion.safeParse(validUnionText);
    });

    bench('yup', () => {
        yupUnion.validateSync(validUnionText);
    });

    bench('joi', () => {
        joiUnion.validate(validUnionText);
    });
});

describe('Union — match last branch (video)', () => {
    bench('@cleverbrush/schema', () => {
        cbUnion.validate(validUnionVideo as any);
    });

    bench('zod', () => {
        zodUnion.safeParse(validUnionVideo);
    });

    bench('yup', () => {
        yupUnion.validateSync(validUnionVideo);
    });

    bench('joi', () => {
        joiUnion.validate(validUnionVideo);
    });
});

describe('Union — no match (invalid)', () => {
    bench('@cleverbrush/schema', () => {
        cbUnion.validate(invalidUnion as any);
    });

    bench('zod', () => {
        zodUnion.safeParse(invalidUnion);
    });

    bench('yup', () => {
        try {
            yupUnion.validateSync(invalidUnion);
        } catch {}
    });

    bench('joi', () => {
        joiUnion.validate(invalidUnion);
    });
});
