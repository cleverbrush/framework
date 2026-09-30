import { array, number, object, string } from '@cleverbrush/schema';
import { bench, describe } from 'vitest';
import { mapper } from '../../mapper/src/index.js';

const Source = object({ id: number(), name: string() });
const Target = object({ id: number(), label: string() });
const Parent = object({ id: number(), children: array(Source) });
const ParentDto = object({ id: number(), children: array(Target) });
const registry = mapper()
    .configure(Source, Source, m => m)
    .configure(Source, Target, m =>
        m.for(t => t.label).compute(s => s.name.toUpperCase())
    )
    .configure(Parent, ParentDto, m => m);
const sourceRows = Array.from({ length: 1000 }, (_, id) => ({
    id,
    name: `user-${id}`
}));
const graphRows = Array.from({ length: 100 }, (_, id) => ({
    id,
    children: sourceRows.slice(id, id + 10)
}));

for (const [name, source, target, rows] of [
    ['flat copy / 1000 rows', Source, Source, sourceRows],
    ['computed / 1000 rows', Source, Target, sourceRows],
    ['nested arrays / 100 parents', Parent, ParentDto, graphRows]
] as const) {
    // Set-up is intentionally outside the timed function. This is mapper overhead,
    // not SQL/network latency or schema-construction performance.
    const sync = (registry.getSyncMapper as any)(source, target);
    const async = (registry.getMapper as any)(source, target);
    const expected = JSON.stringify(rows.map(sync));
    if (JSON.stringify(await Promise.all(rows.map(async))) !== expected)
        throw new Error('Benchmark variants must produce identical values');
    describe(`Prepared mapper: ${name}`, () => {
        bench('synchronous map', () => {
            rows.map(sync);
        });
        bench('async Promise.all', async () => {
            await Promise.all(rows.map(async));
        });
    });
}
