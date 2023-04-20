import {
    SchemaBuilder,
    ValidationResult,
    ValidationContext,
    InferType
} from './SchemaBuilder.js';

type UnionSchemaBuilderCreateProps<
    T extends readonly SchemaBuilder<any, any>[],
    R extends boolean = true
> = Partial<ReturnType<UnionSchemaBuilder<T, R>['introspect']>>;

type SchemaArrayToUnion<TArr extends readonly any[]> = TArr['length'] extends 1
    ? InferType<TArr[0]>
    : TArr extends readonly [infer TFirst, ...infer TRest]
    ? InferType<TFirst> | SchemaArrayToUnion<[...TRest]>
    : never;

type TakeBeforeIndex<
    TArr extends readonly SchemaBuilder<any, any>[],
    TIndex extends number
> = TArr extends [
    ...infer TRest extends SchemaBuilder<any, any>[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    infer TLast extends SchemaBuilder<any, any>
]
    ? TRest['length'] extends TIndex
        ? TRest
        : TakeBeforeIndex<TRest, TIndex>
    : never;

type TakeAfterIndex<
    TArr extends readonly SchemaBuilder<any, any>[],
    TIndex extends number,
    TAcc extends readonly SchemaBuilder<any, any>[] = []
> = TArr extends [
    ...infer TRest extends SchemaBuilder<any, any>[],
    infer TLast extends SchemaBuilder<any, any>
]
    ? TRest['length'] extends TIndex
        ? TAcc
        : TakeAfterIndex<TRest, TIndex, [TLast, ...TAcc]>
    : never;

type TakeExceptIndex<
    TArr extends readonly SchemaBuilder<any, any>[],
    TIndex extends number
> = [...TakeBeforeIndex<TArr, TIndex>, ...TakeAfterIndex<TArr, TIndex>];

/**
 * Union schema builder class. Allows to create schemas
 * containing alternatives. E.g. string | number | Date.
 * Use it when you want to define a schema for a value
 * that can be of different types. The type of the value
 * will be determined by the first schema that succeeds
 * validation. Any schema type can be supplied as variant.
 * Which means that you are not limited to primitive types and
 * can construct complex types as well, e.g. object | array.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link union | union()} function instead.
 *
 * @example
 * ```ts
 * const schema = union(string('foo')).or(string('bar'));
 * const result = await schema.validate('foo');
 * // result.valid === true
 * // result.object === 'foo'
 * ```
 *
 * @example
 * ```ts
 * const schema = union(string('foo')).or(string('bar'));
 * const result = await schema.validate('baz');
 * // result.valid === false
 * ```
 *
 * @example
 * ```ts
 * const schema = union(string('yes')).or(string('no')).or(number(0)).or(number(1));
 * // equals to 'yes' | 'no' | 0 | 1 in TS
 * const result = await schema.validate('yes');
 * // result.valid === true
 * // result.object === 'yes'
 *
 * const result2 = await schema.validate(0);
 * // result2.valid === true
 * // result2.object === 0
 *
 * const result3 = await schema.validate('baz');
 * // result3.valid === false
 *
 * const result4 = await schema.validate(2);
 * // result4.valid === false
 * ```
 *
 * @see {@link union}
 */
export class UnionSchemaBuilder<
    TOptions extends readonly SchemaBuilder<any, any>[],
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TResult = TExplicitType extends undefined
        ? SchemaArrayToUnion<TOptions>
        : TExplicitType
> extends SchemaBuilder<TResult, TRequired> {
    #options: TOptions;

    public static create(props: UnionSchemaBuilderCreateProps<any>) {
        return new UnionSchemaBuilder({
            type: 'union',
            ...props
        });
    }

    private constructor(
        props: UnionSchemaBuilderCreateProps<TOptions, TRequired>
    ) {
        super(props as any);

        if (Array.isArray(props.options)) {
            this.#options = props.options;
        }
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * Array of schemas participating in the union.
             */
            options: this.#options
        };
    }

    /**
     * @hidden
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public hasType<T>(notUsed?: T): UnionSchemaBuilder<TOptions, true, T> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): UnionSchemaBuilder<TOptions, TRequired, undefined> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * Performs validion of the union schema over `object`.
     * @param context Optional `ValidationContext` settings.
     */
    public async validate(
        object: TResult,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        const superResult = await super.preValidate(object, context);

        const {
            valid,
            transaction: preValidationTransaction,
            context: prevalidationContext,
            errors
        } = superResult;

        const { path } = prevalidationContext;

        if (!valid) {
            return {
                valid,
                errors
            };
        }

        let {
            object: { validatedObject: objToValidate }
        } = preValidationTransaction!;

        if (
            !this.isRequired &&
            (typeof objToValidate === 'undefined' || objToValidate === null)
        ) {
            return {
                valid: true,
                object: objToValidate
            };
        }

        let minErrorsCount = Number.MAX_SAFE_INTEGER;
        let resultingErrors = [];

        for (let i = 0; i < this.#options.length; i++) {
            const {
                valid,
                errors,
                object: validatedOption
            } = await this.#options[i].validate(objToValidate, {
                ...prevalidationContext,
                path: `${path}[option ${i}]`
            });
            if (valid) {
                return {
                    valid: true,
                    object: validatedOption as TResult
                };
            } else {
                if (
                    Array.isArray(errors) &&
                    errors.length > 0 &&
                    errors.length < minErrorsCount
                ) {
                    resultingErrors = errors as any;
                    minErrorsCount = errors.length;
                }

                objToValidate =
                    preValidationTransaction!.rollback().validatedObject;
            }
        }

        return {
            valid: false,
            errors: resultingErrors
        };
    }

    protected createFromProps<
        T extends readonly SchemaBuilder<any, any>[],
        TReq extends boolean
    >(props: UnionSchemaBuilderCreateProps<T, TReq>): this {
        return UnionSchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(): UnionSchemaBuilder<TOptions, true, TExplicitType> {
        return super.required();
    }

    /**
     * @hidden
     */
    public optional(): UnionSchemaBuilder<TOptions, false, TExplicitType> {
        return super.optional();
    }

    /**
     * Adds a new schema option described by `schema`.
     * schema must be an instance of `SchemaBuilder` class ancestor.
     * @param schema schema to be added as an option.
     */
    public or<T extends SchemaBuilder<any, any>>(
        schema: T
    ): UnionSchemaBuilder<[...TOptions, T], TRequired, TExplicitType> {
        if (!(schema instanceof SchemaBuilder)) {
            throw new Error(
                'schema must be an instance of the SchemaBuilder class'
            );
        }
        return this.createFromProps({
            ...this.introspect(),
            options: [...this.#options, schema]
        } as any) as any;
    }

    /**
     * Removes option by its `index`. If `index` is out of bounds,
     * an error is thrown.
     * @param index index of the option, starting from `0`.
     */
    public removeOption<T extends number>(
        index: T
    ): UnionSchemaBuilder<
        TakeExceptIndex<TOptions, T>,
        TRequired,
        TExplicitType
    > {
        if (
            typeof index !== 'number' ||
            index < 0 ||
            index > this.#options.length
        ) {
            throw new Error('index must be >= 0 and <= count of the options');
        }
        return this.createFromProps({
            ...this.introspect(),
            options: this.#options.filter((v, i) => i !== index)
        } as any) as any;
    }

    /**
     * Removes first option from the union schema.
     */
    public removeFirstOption(): TOptions extends [
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer TFirst,
        ...infer TRest extends SchemaBuilder<any, any>[]
    ]
        ? UnionSchemaBuilder<TRest, TRequired, TExplicitType>
        : never {
        return this.removeOption(0) as any;
    }

    /**
     * Removes all options and replaces them by single `schema` option.
     * Equivalent to `union(schema)` function, but could be useful in some cases.
     * @param schema schema to be added as a single option to the new schema.
     */
    public reset<T extends SchemaBuilder<any, any>>(
        schema: T
    ): UnionSchemaBuilder<[T], TRequired, TExplicitType> {
        if (!(schema instanceof SchemaBuilder)) {
            throw new Error(
                'schema must be an instance of the SchemaBuilder class'
            );
        }
        return this.createFromProps({
            ...this.introspect(),
            options: [schema]
        } as any) as any;
    }
}

/**
 * Creates a union schema.
 * @param schema required and will be considered as a first option for the union shchema.
 */
export const union = <T extends SchemaBuilder<any, any>>(schema: T) =>
    UnionSchemaBuilder.create({
        isRequired: true,
        options: [schema]
    }) as UnionSchemaBuilder<[T]>;
