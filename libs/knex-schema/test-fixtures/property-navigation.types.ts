import { deepExtend, type MergeTwo } from '@cleverbrush/deep';
import {
    type EntityRelations,
    type InsertType,
    number,
    object,
    type ReadColumns,
    type SchemaForValue,
    string,
    type WithRelation
} from '@cleverbrush/knex-schema';
import { mapper } from '@cleverbrush/mapper';
import type { InferType, ObjectSchemaBuilder } from '@cleverbrush/schema';
import type { InferFromJsonSchema } from '@cleverbrush/schema-json';
import {
    type Entity,
    type JSONSchema,
    Plain,
    projected,
    read,
    Target
} from './property-navigation.model.js';

type Equal<A, B> =
    (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
        ? true
        : false;
type Check<T extends true> = T;
type Shape<T> = { [K in keyof T]: T[K] };

const ReadonlySchema = object({
    id: number(),
    label: string().optional()
} as const);
declare const columns: ReadColumns<typeof ReadonlySchema>;
declare const replacement: ReadColumns<typeof ReadonlySchema>;
// Column slots stay present and mutable even when their source record is readonly.
columns.id = replacement.id;
columns.label = replacement.label;
const SymbolKey = Symbol('symbol');
const MixedKeys = object({
    1: number(),
    name: string(),
    [SymbolKey]: string()
});

// An indexed source has no concrete declaration, but selected keys still exist.
type IndexedRelation = WithRelation<
    ObjectSchemaBuilder<Record<string, ReturnType<typeof string>>>,
    {},
    'related',
    'hasMany',
    typeof ReadonlySchema
>;

type Rows = InferType<typeof read.rowSchema>;
type Write = InsertType<typeof Entity.schema>;
const empty: Write = {};
const nullable: Write = { score: null };
const optional: Write = { score: undefined };
// @ts-expect-error declared navigation keys are not database columns
read.where(t => t.department, 1);
// @ts-expect-error unknown properties stay excluded
read.where(t => t.missing, 1);
// @ts-expect-error nested column properties remain checked
read.where(t => t.profile.missing, 'value');
// @ts-expect-error relation metadata cannot be written as a scalar column
read.insert({ department: {} });
// @ts-expect-error the column's declared type is still enforced
read.insert({ firstName: 42 });
// @ts-expect-error unknown relations are not selectable
read.include(t => t.missing);
const customized = read.include(
    t => t.department,
    child => child.select(t => ({ label: t.title }))
);
const retained = customized.select(t => ({ firstName: t.firstName }));
type Included = InferType<typeof retained.rowSchema>;
// @ts-expect-error selected rows cannot write
projected.insert({ firstName: 'Jane' });

mapper().configure(Plain, Target, m =>
    // @ts-expect-error nonexistent target fields are excluded
    m.for(t => t.missing).from(t => t.name)
);
// @ts-expect-error all non-automatic target mappings are still required
mapper().configure(Plain, Target, m => m);
const registry = mapper().configure(Plain, Target, m =>
    m.for(t => t.label).compute(t => t.name)
);
const sync = registry.getSyncMapper(Plain, Target);

type Json = InferFromJsonSchema<typeof JSONSchema>;
const json: Json = { name: 'Jane' };
json.name = 'John';
json.age = undefined;
// @ts-expect-error required JSON Schema properties remain required
const missingName: Json = {};

type OptionalInput = { readonly value?: string };
declare const optionalInput: OptionalInput;
const merged = deepExtend({ value: '' }, optionalInput);
// Keep the original required slot and optional value, without making it readonly.
merged.value = undefined;
// @ts-expect-error merged shared slots remain required
const missingValue: typeof merged = {};

export type Compatibility = [
    Check<Equal<keyof EntityRelations<IndexedRelation>, 'related'>>,
    Check<
        Equal<
            Rows,
            {
                id: number;
                firstName: string;
                score: number | null;
                departmentId: number;
                profile: { city: string };
            }
        >
    >,
    Check<
        Equal<InferType<typeof projected.rowSchema>, { displayName: string }>
    >,
    Check<
        Equal<Included, { firstName: string; department: { label: string } }>
    >,
    Check<Equal<keyof ReadColumns<typeof MixedKeys>, 'name'>>,
    Check<Equal<undefined extends typeof columns.label ? true : false, false>>,
    Check<Equal<ReturnType<typeof sync>, { label: string }>>,
    Check<Equal<Shape<Json>, { name: string; age?: number }>>,
    Check<
        Equal<
            Shape<MergeTwo<{ value: number }, OptionalInput>>,
            { value: string | undefined }
        >
    >,
    Check<
        Equal<
            SchemaForValue<{ field?: string }> extends ObjectSchemaBuilder<
                infer P,
                any,
                any,
                any,
                any,
                any,
                any
            >
                ? keyof P
                : never,
            'field'
        >
    >
];

void [empty, nullable, optional, missingName, missingValue];
