import { createDb } from '@cleverbrush/orm';
import type { InferType } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { expectTypeOf } from 'vitest';
import { storageSchemas } from './schema.js';

const schemas = storageSchemas();
type Run = InferType<typeof schemas.runs>;
expectTypeOf<Run['id']>().toEqualTypeOf<string>();
expectTypeOf<Run['version']>().toEqualTypeOf<number>();
expectTypeOf<Run['leaseExpiresAt']>().toEqualTypeOf<
    number | null | undefined
>();
expectTypeOf<
    InferType<typeof schemas.schedules>['active']
>().toEqualTypeOf<boolean>();
expectTypeOf<
    InferType<typeof schemas.events>['sequence']
>().toEqualTypeOf<number>();
expectTypeOf<
    InferType<typeof schemas.attempts>['attempt']
>().toEqualTypeOf<number>();
declare const knex: Knex;
const db = createDb(knex, schemas.entities);
const rows = await db.runs
    .select(
        t => t.id,
        t => t.version
    )
    .execute();
expectTypeOf(rows[0]).toEqualTypeOf<{ id: string; version: number }>();
// @ts-expect-error Query properties come from the actual schema.
db.runs.select(t => t.missing);
// @ts-expect-error Insert values retain the column types.
db.events.insert({ runId: 'one', sequence: 'wrong', record: '{}' });
