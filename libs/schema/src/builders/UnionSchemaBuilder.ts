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
            type: 'number',
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

    public hasType<T>(notUsed?: T): UnionSchemaBuilder<TOptions, true, T> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

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
            object: objToValidate,
            context: prevalidationContext
        } = superResult;

        const { path } = prevalidationContext;

        if (!valid) {
            return superResult;
        }

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
            const { valid, errors } = await this.#options[i].validate(
                objToValidate,
                {
                    ...prevalidationContext,
                    path: `${path}[option ${i}]`
                }
            );
            if (valid) {
                return {
                    valid: true,
                    object: objToValidate as TResult
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

    public required(): UnionSchemaBuilder<TOptions, true, TExplicitType> {
        return super.required();
    }

    public optional(): UnionSchemaBuilder<TOptions, false, TExplicitType> {
        return super.optional();
    }

    /**
     * Adds a new schema option described by `schema`.
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
     * Removes option by its `index`.
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
     * Removes first option.
     */
    public removeFirstOption(): TOptions extends [
        infer TFirst,
        ...infer TRest extends SchemaBuilder<any, any>[]
    ]
        ? UnionSchemaBuilder<TRest, TRequired, TExplicitType>
        : never {
        return this.removeOption(0) as any;
    }

    /**
     * Removes all options and replaces them by single `schema` option.
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
