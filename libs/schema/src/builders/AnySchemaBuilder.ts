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
 * in TypeScript.
 */
export class AnySchemaBuilder<
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TResult = TExplicitType extends undefined ? any : TExplicitType
> extends SchemaBuilder<TResult, TRequired> {
    public static create(props: AnySchemaBuilderCreateProps<any>) {
        return new AnySchemaBuilder({
            type: 'any',
            ...props
        });
    }

    private constructor(props: AnySchemaBuilderCreateProps<TRequired>) {
        super(props as any);
    }

    public hasType<T>(notUsed?: T): AnySchemaBuilder<true, T> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    public clearHasType(): AnySchemaBuilder<TRequired, undefined> {
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

        const { valid, object: objToValidate } = superResult;

        if (!valid) {
            return superResult;
        }

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

    public required(): AnySchemaBuilder<true, TExplicitType> {
        return super.required();
    }

    public optional(): AnySchemaBuilder<false, TExplicitType> {
        return super.optional();
    }
}

/**
 * Creates a `any` schema.
 */
export const any = () =>
    AnySchemaBuilder.create({
        isRequired: true
    }) as AnySchemaBuilder<true>;
