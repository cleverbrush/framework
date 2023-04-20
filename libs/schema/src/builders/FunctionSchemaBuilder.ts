import {
    SchemaBuilder,
    ValidationResult,
    ValidationContext
} from './SchemaBuilder.js';

type FunctionSchemaBuilderCreateProps<R extends boolean = true> = Partial<
    ReturnType<FunctionSchemaBuilder<R>['introspect']>
>;

/**
 * Schema builder for functions. Allows to define a schema for a function.
 * It can be: required or optional.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link func | func()} function instead.
 *
 * @example
 * ```ts
 * const schema = func();
 * const result = await schema.validate(() => {});
 * // result.valid === true
 * // result.object === () => {}
 * ```
 *
 * @example
 * ```ts
 * const schema = func().optional();
 * const result = await schema.validate(undefined);
 * // result.valid === true
 * // result.object === undefined
 * ```
 *
 * @see {@link func}
 */
export class FunctionSchemaBuilder<
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TResult = TExplicitType extends undefined
        ? (...args: any[]) => any
        : TExplicitType
> extends SchemaBuilder<TResult, TRequired> {
    public static create(props: FunctionSchemaBuilderCreateProps<any>) {
        return new FunctionSchemaBuilder({
            type: 'function',
            ...props
        });
    }

    private constructor(props: FunctionSchemaBuilderCreateProps<TRequired>) {
        super(props as any);
    }

    /**
     * @hidden
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public hasType<T>(notUsed?: T): FunctionSchemaBuilder<true, T> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): FunctionSchemaBuilder<TRequired, undefined> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * Performs validion of the schema over `object`. Basically runs
     * validators, preprocessors and checks for required (if schema is not optional).
     * @param context Optional `ValidationContext` settings.
     */
    public async validate(
        object: TResult,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        const superResult = await super.preValidate(object, context);

        const {
            valid,
            context: prevalidationContext,
            transaction: preValidationTransaction,
            errors
        } = superResult;
        const { path } = prevalidationContext;

        if (!valid) {
            return { valid, errors };
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

        if (typeof objToValidate !== 'function') {
            return {
                valid: false,
                errors: [
                    {
                        message: `expected type function, but saw ${typeof objToValidate}`,
                        path: path as string
                    }
                ]
            };
        }

        return {
            valid: true,
            object: objToValidate
        };
    }

    protected createFromProps<TReq extends boolean>(
        props: FunctionSchemaBuilderCreateProps<TReq>
    ): this {
        return FunctionSchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(): FunctionSchemaBuilder<true, TExplicitType> {
        return super.required();
    }

    /**
     * @hidden
     */
    public optional(): FunctionSchemaBuilder<false, TExplicitType> {
        return super.optional();
    }
}

/**
 * Creates a `function` schema.
 * @retuns {@link FunctionSchemaBuilder}
 */
export const func = () =>
    FunctionSchemaBuilder.create({
        isRequired: true
    }) as FunctionSchemaBuilder<true>;
