import {
    SchemaBuilder,
    ValidationResult,
    ValidationContext,
    InferType
} from './SchemaBuilder.js';

type TupleSchemaBuilderCreateProps<
    TItems extends readonly SchemaBuilder<any, any>[],
    R extends boolean = true
> = Partial<ReturnType<TupleSchemaBuilder<TItems, R>['introspect']>>;

/**
 * Helper type that maps an array of `SchemaBuilder` instances to a TypeScript tuple type.
 * For example, `[StringSchemaBuilder, NumberSchemaBuilder]` maps to `[string, number]`.
 */
export type SchemaArrayToTuple<
    TArr extends readonly SchemaBuilder<any, any>[]
> = TArr extends readonly []
    ? []
    : TArr extends readonly [
          infer TFirst extends SchemaBuilder<any, any>,
          ...infer TRest extends readonly SchemaBuilder<any, any>[]
      ]
    ? [InferType<TFirst>, ...SchemaArrayToTuple<TRest>]
    : never;

/**
 * Tuple schema builder class. Similar to TypeScript tuple types.
 * Allows to define a schema for a fixed-length array where each position
 * has its own type constraint.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link tuple | tuple()} function instead.
 *
 * @example
 * ```ts
 * const schema = tuple([string(), number()]);
 * const result = await schema.validate(['hello', 42]);
 * // result.valid === true
 * // result.object === ['hello', 42]
 * ```
 *
 * @example
 * ```ts
 * const schema = tuple([string(), number()]);
 * const result = await schema.validate(['hello', 'world']);
 * // result.valid === false
 * // result.errors[0].message contains a type error for index 1
 * ```
 *
 * @example
 * ```ts
 * const schema = tuple([string(), number()]).optional();
 * const result = await schema.validate(undefined);
 * // result.valid === true
 * // result.object === undefined
 * ```
 *
 * @example
 * ```ts
 * const schema = tuple([string(), number()]).readonly();
 * // InferType<typeof schema> === readonly [string, number]
 * ```
 *
 * @see {@link tuple}
 */
export class TupleSchemaBuilder<
    TItems extends readonly SchemaBuilder<any, any>[],
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TReadonly extends boolean = false
> extends SchemaBuilder<
    TExplicitType extends undefined
        ? TReadonly extends true
            ? Readonly<SchemaArrayToTuple<TItems>>
            : SchemaArrayToTuple<TItems>
        : TExplicitType,
    TRequired
> {
    #items: TItems;
    #isReadonly = false;

    /**
     * @hidden
     */
    public static create(props: TupleSchemaBuilderCreateProps<any>) {
        return new TupleSchemaBuilder({
            type: 'tuple',
            ...props
        });
    }

    private constructor(
        props: TupleSchemaBuilderCreateProps<TItems, TRequired>
    ) {
        super(props as any);

        if (Array.isArray(props.items)) {
            this.#items = props.items as any;
        } else {
            this.#items = [] as any;
        }

        if (typeof props.isReadonly === 'boolean') {
            this.#isReadonly = props.isReadonly;
        }
    }

    /**
     * @hidden
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public hasType<T>(notUsed?: T): TupleSchemaBuilder<TItems, true, T> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): TupleSchemaBuilder<
        TItems,
        TRequired,
        undefined,
        TReadonly
    > {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * Array of schemas for each tuple element position.
             */
            items: [...this.#items] as unknown as TItems,
            /**
             * If `true`, the inferred type will be `readonly`.
             */
            isReadonly: this.#isReadonly
        };
    }

    /**
     * Performs validation of the tuple schema over `object`.
     * Checks that the value is an array of exactly the right length,
     * and that each element satisfies its corresponding schema.
     * @param context Optional `ValidationContext` settings.
     */
    public async validate(
        object: any,
        context?: ValidationContext
    ): Promise<
        ValidationResult<
            TExplicitType extends undefined
                ? TReadonly extends true
                    ? Readonly<SchemaArrayToTuple<TItems>>
                    : SchemaArrayToTuple<TItems>
                : TExplicitType
        >
    > {
        const superResult = await super.preValidate(object, context);

        const {
            valid,
            context: prevalidationContext,
            errors,
            transaction: preValidationTransaction
        } = superResult;

        const { path } = prevalidationContext;

        if (!valid) {
            return {
                valid,
                errors
            };
        }

        const {
            object: { validatedObject: objToValidate }
        } = preValidationTransaction!;

        if (
            (typeof objToValidate === 'undefined' || objToValidate === null) &&
            this.isRequired === false
        ) {
            return {
                valid: true,
                object: objToValidate
            };
        }

        if (!Array.isArray(objToValidate)) {
            return {
                valid: false,
                errors: [{ message: 'tuple expected', path: path as string }]
            };
        }

        const expectedLength = this.#items.length;

        if (objToValidate.length !== expectedLength) {
            return {
                valid: false,
                errors: [
                    {
                        message: `expected tuple of length ${expectedLength}, got ${objToValidate.length}`,
                        path: path as string
                    }
                ]
            };
        }

        const validatedItems: any[] = new Array(expectedLength);

        if (prevalidationContext.doNotStopOnFirstError) {
            const results = await Promise.all(
                this.#items.map((itemSchema, i) =>
                    itemSchema.validate(objToValidate[i], {
                        ...prevalidationContext,
                        path: `${path}[${i}]`
                    })
                )
            );

            let allValid = true;
            const allErrors: any[] = [];

            for (let i = 0; i < results.length; i++) {
                if (!results[i].valid) {
                    allValid = false;
                    if (Array.isArray(results[i].errors)) {
                        allErrors.push(...(results[i].errors as any));
                    }
                } else {
                    validatedItems[i] = results[i].object;
                }
            }

            if (!allValid) {
                return {
                    valid: false,
                    errors: allErrors
                };
            }
        } else {
            for (let i = 0; i < expectedLength; i++) {
                const { valid, errors, object: validatedItem } =
                    await this.#items[i].validate(objToValidate[i], {
                        ...prevalidationContext,
                        path: `${path}[${i}]`
                    });

                if (!valid) {
                    return {
                        valid: false,
                        errors:
                            Array.isArray(errors) && errors.length > 0
                                ? [errors[0]]
                                : []
                    };
                }

                validatedItems[i] = validatedItem;
            }
        }

        return {
            valid: true,
            object: validatedItems as any
        };
    }

    /**
     * @hidden
     */
    protected createFromProps<TReq extends boolean>(
        props: TupleSchemaBuilderCreateProps<TItems, TReq>
    ): this {
        return TupleSchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(): TupleSchemaBuilder<
        TItems,
        true,
        TExplicitType,
        TReadonly
    > {
        return super.required();
    }

    /**
     * @hidden
     */
    public optional(): TupleSchemaBuilder<
        TItems,
        false,
        TExplicitType,
        TReadonly
    > {
        return super.optional();
    }

    /**
     * Marks the inferred type as `readonly`. Returns a new schema whose
     * validated type is `readonly [T0, T1, ...]` instead of `[T0, T1, ...]`.
     * This is a type-level-only change — runtime validation behaviour is unchanged.
     *
     * @example
     * ```ts
     * const schema = tuple([string(), number()]).readonly();
     * // InferType<typeof schema> === readonly [string, number]
     * ```
     */
    public readonly(): TupleSchemaBuilder<
        TItems,
        TRequired,
        TExplicitType,
        true
    > {
        return this.createFromProps({
            ...this.introspect(),
            isReadonly: true
        } as any) as any;
    }

    /**
     * Removes the `readonly` modifier added by `.readonly()`.
     * Returns a schema with a mutable tuple type.
     *
     * @example
     * ```ts
     * const schema = tuple([string(), number()]).readonly().notReadonly();
     * // InferType<typeof schema> === [string, number]
     * ```
     */
    public notReadonly(): TupleSchemaBuilder<
        TItems,
        TRequired,
        TExplicitType,
        false
    > {
        return this.createFromProps({
            ...this.introspect(),
            isReadonly: false
        } as any) as any;
    }
}

/**
 * Creates a `tuple` schema for a fixed-length array where each element
 * must satisfy its corresponding schema.
 *
 * @example
 * ```typescript
 * const schema = tuple([string(), number(), boolean()]);
 * // valid:   ['hello', 42, true]
 * // invalid: ['hello', 42]          // wrong length
 * // invalid: ['hello', 'world', true] // wrong type at index 1
 * // invalid: null                   // not an array
 * ```
 *
 * @example
 * ```typescript
 * const coord = tuple([number(), number()]);
 * const result = await coord.validate([10, 20]);
 * // result.valid === true
 * // result.object === [10, 20]
 * // InferType<typeof coord> === [number, number]
 * ```
 *
 * @example
 * ```typescript
 * const schema = tuple([string(), number()]).readonly();
 * // InferType<typeof schema> === readonly [string, number]
 * ```
 *
 * @param items Array of schema builders, one per tuple element.
 */
export const tuple = <TItems extends readonly SchemaBuilder<any, any>[]>(
    items: [...TItems]
) =>
    TupleSchemaBuilder.create({
        isRequired: true,
        items
    }) as TupleSchemaBuilder<TItems, true>;
