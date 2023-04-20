import {
    SchemaBuilder,
    ValidationResult,
    ValidationContext
} from './SchemaBuilder.js';

type AnySchemaBuilderCreateProps<R extends boolean = true> = Partial<
    ReturnType<AnySchemaBuilder<R>['introspect']>
>;

/**
 * Any schema builder class. Similar to the `any` type
 * in TypeScript. Allows to define a schema for `any` value.
 * Use it when you don't know the type of the value.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use `any()` function instead.
 *
 * @example
 * ```ts
 * const schema = any();
 * const result = await schema.validate(123);
 * // result.valid === true
 * // result.object === 123
 * ```
 */
export class AnySchemaBuilder<
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TResult = TExplicitType extends undefined ? any : TExplicitType
> extends SchemaBuilder<TResult, TRequired> {
    /**
     * @hidden
     */
    public static create(props: AnySchemaBuilderCreateProps<any>) {
        return new AnySchemaBuilder({
            type: 'any',
            ...props
        });
    }

    private constructor(props: AnySchemaBuilderCreateProps<TRequired>) {
        super(props as any);
    }

    /**
     * @hidden
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public hasType<T>(notUsed?: T): AnySchemaBuilder<true, T> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): AnySchemaBuilder<TRequired, undefined> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * Performs validation of the schema over `object`. Basically runs
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
            transaction: preValidationTransaction,
            errors
        } = superResult;

        if (!valid) {
            return {
                valid,
                errors
            };
        }

        const {
            object: { validatedObject: objToValidate }
        } = preValidationTransaction!;

        return {
            valid: true,
            object: objToValidate
        };
    }

    protected createFromProps<TReq extends boolean>(
        props: AnySchemaBuilderCreateProps<TReq>
    ): this {
        return AnySchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(): AnySchemaBuilder<true, TExplicitType> {
        return super.required();
    }

    /**
     * @hidden
     */
    public optional(): AnySchemaBuilder<false, TExplicitType> {
        return super.optional();
    }
}

/**
 * Creates a `any` schema.
 * @example
 * ```
 *  const anyObject = any();
 *
 * // null - invalid
 * // undefined - invalid
 * // string - valid
 * // {} - valid
 * // Date -valid
 * // { someProp: 123 } - valid
 * // etc
 * ```
 * @example
 * ```
 *  const anyObject = any().optional();
 *  // null - valid
 *  // undefined - valid
 *  // string - valid
 *  // {} - valid
 *  // Date -valid
 *  // { someProp: 123 } - valid
 * ```
 */
export const any = () =>
    AnySchemaBuilder.create({
        isRequired: true
    }) as AnySchemaBuilder<true>;
