import { expect, it } from 'vitest';
import { checkLargeConsumers } from '../type-fixtures/large-consumer.mjs';

it('typechecks and emits a 1,000-operation multi-file consumer against published declarations', () => {
    const metrics = checkLargeConsumers();
    expect(metrics).toHaveProperty('existing');
    expect(metrics).toHaveProperty('modular');
    process.stdout.write(
        `Implementation consumer compiler metrics: ${JSON.stringify(metrics)}\n`
    );
}, 200000);
