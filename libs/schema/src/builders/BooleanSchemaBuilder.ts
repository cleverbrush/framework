import {
    SchemaBuilder,
    ValidationResult,
    ValidationContext
} from './SchemaBuilder.js';

type BooleanSchemaBuilderCreateProps<R extends boolean = true> = Partial<
    ReturnType<BooleanSchemaBuilder<R>['introspect']>
>;

/**
 * Boolean schema builder class.
 */
export class BooleanSchemaBuilder<
    TResult = boolean,
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TFinalResult = TExplicitType extends undefined ? TResult : TExplicitType
> extends SchemaBuilder<TFinalResult, TRequired> {
    #equalsTo?: boolean;

    public static create(props: BooleanSchemaBuilderCreateProps<any>) {
        return new BooleanSchemaBuilder({
            type: 'boolean',
            ...props
        });
    }

    private constructor(props: BooleanSchemaBuilderCreateProps<TRequired>) {
        super(props as any);

        if (
            typeof props.equalsTo === 'boolean' ||
            typeof props.equalsTo === 'undefined'
        ) {
            this.#equalsTo = props.equalsTo;
        }
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * If set, restrict object to be equal to a certain value.
             */
            equalsTo: this.#equalsTo
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public hasType<T>(notUsed?: T): BooleanSchemaBuilder<TResult, true, T> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    public clearHasType(): BooleanSchemaBuilder<TResult, TRequired, undefined> {
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

        if (typeof objToValidate !== 'boolean') {
            return {
                valid: false,
                errors: [
                    {
                        message: 'expected to be boolean',
                        path: path as string
                    }
                ]
            };
        }

        if (
            typeof this.#equalsTo !== 'undefined' &&
            objToValidate !== this.#equalsTo
        ) {
            return {
                valid: false,
                errors: [
                    {
                        message: `is expected to be equal to '${
                            this.#equalsTo
                        }'`,
                        path: path as string
                    }
                ]
            };
        }

        return {
            valid: true,
            object: objToValidate as TResult
        };
    }

    protected createFromProps<TReq extends boolean>(
        props: BooleanSchemaBuilderCreateProps<TReq>
    ): this {
        return BooleanSchemaBuilder.create(props as any) as any;
    }

    public required(): BooleanSchemaBuilder<TResult, true, TExplicitType> {
        return super.required();
    }

    public optional(): BooleanSchemaBuilder<TResult, false, TExplicitType> {
        return super.optional();
    }

    /**
     * Restricts object to be equal to `value`.
     */
    public equals<T extends boolean>(value: T) {
        if (typeof value !== 'boolean') throw new Error('boolean expected');
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: value
        } as any) as any as BooleanSchemaBuilder<T, TRequired, TExplicitType>;
    }

    /**
     * Removes a `value` defeined by `equals()` call.
     */
    public clearEquals(): BooleanSchemaBuilder<
        boolean,
        TRequired,
        TExplicitType
    > {
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: undefined
        } as any) as any;
    }
}

/**
 * Creates a `boolean` schema.
 */
export const boolean = () =>
    BooleanSchemaBuilder.create({
        isRequired: true
    }) as BooleanSchemaBuilder<boolean, true>;
