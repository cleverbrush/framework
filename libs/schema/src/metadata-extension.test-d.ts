import { expectTypeOf, test } from 'vitest';
import {
    defineExtension,
    defineMetadataMethod,
    EXTRA_TYPE_BRAND,
    type InferExtensionMetadata,
    METHOD_LITERAL_BRAND,
    withExtensions
} from './extension.js';
import {
    type DateSchemaBuilder,
    type InferType,
    type NumberSchemaBuilder,
    number,
    type ObjectSchemaBuilder,
    type object,
    string
} from './index.js';

const tagged = defineExtension({
    number: {
        unit: defineMetadataMethod('unit').argument<string>(),
        metres: defineMetadataMethod('unit').value('m'),
        rangeHint: defineMetadataMethod('range').compute(
            (min: number, max: number) => [min, max] as const
        ),
        positive(this: NumberSchemaBuilder) {
            return this.min(0);
        }
    },
    string: { label: defineMetadataMethod('label').argument<string>() },
    object: { tag: defineMetadataMethod('tag').argument<string>() }
});

test('ordinary extensions retain receiver types even without typed metadata methods', () => {
    const labels = defineExtension({
        date: {
            label(
                this: DateSchemaBuilder<any, any, any, any, any>,
                text: string
            ) {
                return this.withExtension('label', text);
            }
        }
    });
    const value = withExtensions(labels)
        .date()
        .optional()
        .label('Updated')
        .nullable();
    expectTypeOf<InferType<typeof value>>().toEqualTypeOf<
        Date | undefined | null
    >();
    expectTypeOf<InferType<typeof value>>().not.toBeAny();
});

test('metadata replacement and native modifiers preserve precise value types', () => {
    const s = withExtensions(tagged);
    const base = s.number().unit('cm').optional().nullable().positive();
    expectTypeOf<InferType<typeof base>>().toEqualTypeOf<
        number | undefined | null
    >();
    expectTypeOf<
        InferExtensionMetadata<typeof base>['unit']
    >().toEqualTypeOf<'cm'>();
    const changed = base.metres().rangeHint(0, 10).required().notNullable();
    expectTypeOf<InferType<typeof changed>>().toEqualTypeOf<number>();
    expectTypeOf<
        InferExtensionMetadata<typeof changed>['unit']
    >().toEqualTypeOf<'m'>();
    expectTypeOf<
        InferExtensionMetadata<typeof changed>['range']
    >().toEqualTypeOf<readonly [number, number]>();
    const defaulted = base.default(2).unit('km');
    expectTypeOf<InferType<typeof defaulted>>().toEqualTypeOf<number | null>();
    // @ts-expect-error metadata argument constraints are enforced
    base.unit(12);
    // @ts-expect-error computed metadata arguments remain typed
    base.rangeHint('min', 'max');
});

test('metadata is independent of builder kind and retains structural edits', () => {
    const s = withExtensions(tagged);
    const text = s.string().label('Title').optional().minLength(1);
    expectTypeOf<InferType<typeof text>>().toEqualTypeOf<string | undefined>();
    expectTypeOf<
        InferExtensionMetadata<typeof text>['label']
    >().toEqualTypeOf<'Title'>();
    const record = s
        .object({ name: string() })
        .tag('input')
        .addProp('title', text)
        .tag('output');
    expectTypeOf<InferType<typeof record>>().toEqualTypeOf<{
        name: string;
        title?: string;
    }>();
    expectTypeOf<
        InferExtensionMetadata<typeof record>['tag']
    >().toEqualTypeOf<'output'>();
    expectTypeOf<
        InferExtensionMetadata<ReturnType<typeof object>>
    >().toEqualTypeOf<{}>();
});

test('metadata works across every extension factory kind', () => {
    const methods = { tag: defineMetadataMethod('tag').argument<string>() };
    const s = withExtensions(
        defineExtension({
            boolean: methods,
            date: methods,
            array: methods,
            tuple: methods,
            record: methods,
            union: methods,
            any: methods,
            promise: methods,
            generic: methods,
            func: methods
        })
    );
    const bool = s.boolean().optional().tag('bool').nullable();
    const date = s.date().tag('date').optional();
    const array = s.array(number()).tag('array').optional();
    const tuple = s.tuple([string(), number()]).tag('tuple').optional();
    const record = s.record(string(), number()).tag('record').optional();
    const union = s.union(string()).or(number()).tag('union').optional();
    const any = s.any().hasType<{ value: string }>().tag('any').optional();
    const promise = s.promise(string()).tag('promise').optional();
    const generic = s.generic((value: string) => string(value)).tag('generic');
    const fn = s
        .func()
        .addParameter(string())
        .hasReturnType(number())
        .tag('function');
    expectTypeOf<InferType<typeof bool>>().toEqualTypeOf<
        boolean | undefined | null
    >();
    expectTypeOf<InferType<typeof date>>().toEqualTypeOf<Date | undefined>();
    expectTypeOf<InferType<typeof array>>().toEqualTypeOf<
        number[] | undefined
    >();
    expectTypeOf<InferType<typeof tuple>>().toEqualTypeOf<
        [string, number] | undefined
    >();
    expectTypeOf<InferType<typeof record>>().toEqualTypeOf<
        Record<string, number> | undefined
    >();
    expectTypeOf<InferType<typeof union>>().toEqualTypeOf<
        string | number | undefined
    >();
    expectTypeOf<InferType<typeof any>>().toEqualTypeOf<
        { value: string } | undefined
    >();
    expectTypeOf<InferType<typeof promise>>().toEqualTypeOf<
        Promise<string> | undefined
    >();
    expectTypeOf<
        InferExtensionMetadata<typeof generic>['tag']
    >().toEqualTypeOf<'generic'>();
    expectTypeOf<InferType<typeof fn>>().toEqualTypeOf<
        (arg: string) => number
    >();
});

test('metadata composes with existing literal-name and property-list extensions', () => {
    const naming = defineExtension({
        object: {
            named(this: ObjectSchemaBuilder<any>, name: string) {
                return this.withExtension('name', name) as typeof this & {
                    readonly [METHOD_LITERAL_BRAND]?: string;
                };
            },
            fields(
                this: ObjectSchemaBuilder<any>,
                name: string,
                ...fields: string[]
            ) {
                return this.withExtension(name, fields) as typeof this & {
                    readonly [EXTRA_TYPE_BRAND]?: Record<
                        string,
                        readonly string[]
                    >;
                };
            }
        }
    });
    const s = withExtensions(tagged, naming)
        .object({ name: string(), age: number() })
        .named('first')
        .tag('input')
        .fields('summary', 'name')
        .optional()
        .named('second')
        .tag('output');
    expectTypeOf<
        NonNullable<(typeof s)[typeof METHOD_LITERAL_BRAND]>
    >().toEqualTypeOf<'first' | 'second'>();
    expectTypeOf<
        NonNullable<(typeof s)[typeof EXTRA_TYPE_BRAND]>['summary']
    >().toEqualTypeOf<readonly 'name'[]>();
    expectTypeOf<
        InferExtensionMetadata<typeof s>['tag']
    >().toEqualTypeOf<'output'>();
    expectTypeOf<InferType<typeof s>>().toEqualTypeOf<
        { name: string; age: number } | undefined
    >();
    // @ts-expect-error extension-author methods stay hidden after fluent calls
    s.withExtension('tag', 'unsafe');
});
