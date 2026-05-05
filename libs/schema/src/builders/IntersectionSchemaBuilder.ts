import {
    type BRAND,
    type InferType,
    SchemaBuilder,
    type ValidationContext,
    type ValidationResult
} from './SchemaBuilder.js';

type IntersectionSchemaBuilderCreateProps<
    TLeft extends SchemaBuilder<any, any, any, any, any>,
    TRight extends SchemaBuilder<any, any, any, any, any>,
    R extends boolean = true
> = Partial<
    ReturnType<IntersectionSchemaBuilder<TLeft, TRight, R>['introspect']>
>;

type SchemaIntersection<
    TLeft extends SchemaBuilder<any, any, any, any, any>,
    TRight extends SchemaBuilder<any, any, any, any, any>
> = InferType<TLeft> & InferType<TRight>;

export type IntersectionSchemaValidationResult<T> = ValidationResult<T>;

export class IntersectionSchemaBuilder<
    TLeft extends SchemaBuilder<any, any, any, any, any>,
    TRight extends SchemaBuilder<any, any, any, any, any>,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TExplicitType = undefined,
    THasDefault extends boolean = false,
    TExtensions = {}
> extends SchemaBuilder<
    TExplicitType extends undefined
        ? SchemaIntersection<TLeft, TRight>
        : TExplicitType,
    TRequired,
    TNullable,
    THasDefault,
    TExtensions
> {
    #left!: TLeft;
    #right!: TRight;

    /**
     * @hidden
     */
    public static create(
        props: IntersectionSchemaBuilderCreateProps<any, any>
    ) {
        return new IntersectionSchemaBuilder({
            type: 'intersection',
            ...props
        });
    }

    protected constructor(
        props: IntersectionSchemaBuilderCreateProps<TLeft, TRight, TRequired>
    ) {
        super(props as any);

        if (props.left instanceof SchemaBuilder) {
            this.#left = props.left;
        }
        if (props.right instanceof SchemaBuilder) {
            this.#right = props.right;
        }
    }

    public introspect() {
        return {
            ...super.introspect(),
            left: this.#left,
            right: this.#right
        };
    }

    /**
     * @override
     */
    protected override get isNullRequiredViolation(): boolean {
        return false;
    }

    /**
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): IntersectionSchemaBuilder<
        TLeft,
        TRight,
        true,
        TNullable,
        T,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public clearHasType(): IntersectionSchemaBuilder<
        TLeft,
        TRight,
        TRequired,
        TNullable,
        undefined,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public validate(
        object: TExplicitType extends undefined
            ? SchemaIntersection<TLeft, TRight>
            : TExplicitType,
        context?: ValidationContext
    ): IntersectionSchemaValidationResult<
        TExplicitType extends undefined
            ? SchemaIntersection<TLeft, TRight>
            : TExplicitType
    > {
        return super.validate(object, context) as any;
    }

    /**
     * @inheritdoc
     */
    public async validateAsync(
        object: TExplicitType extends undefined
            ? SchemaIntersection<TLeft, TRight>
            : TExplicitType,
        context?: ValidationContext
    ): Promise<
        IntersectionSchemaValidationResult<
            TExplicitType extends undefined
                ? SchemaIntersection<TLeft, TRight>
                : TExplicitType
        >
    > {
        return super.validateAsync(object, context) as any;
    }

    #mergeObjects(leftObj: any, rightObj: any): any {
        if (
            typeof leftObj === 'object' &&
            leftObj !== null &&
            typeof rightObj === 'object' &&
            rightObj !== null &&
            !Array.isArray(leftObj) &&
            !Array.isArray(rightObj)
        ) {
            return { ...leftObj, ...rightObj };
        }
        return rightObj;
    }

    #createValidationSetup(
        superResult: ReturnType<
            IntersectionSchemaBuilder<any, any>['preValidateSync']
        >
    ) {
        const {
            valid,
            transaction: preValidationTransaction,
            context: prevalidationContext,
            errors
        } = superResult;

        if (!valid) {
            return {
                needsValidation: false as const,
                result: { valid, errors } as any
            };
        }

        const {
            object: { validatedObject: objToValidate }
        } = preValidationTransaction!;

        if (
            (typeof objToValidate === 'undefined' && !this.isRequired) ||
            (objToValidate === null && (!this.isRequired || this.isNullable))
        ) {
            return {
                needsValidation: false as const,
                result: {
                    valid: true,
                    object: objToValidate
                } as any
            };
        }

        return {
            needsValidation: true as const,
            objToValidate,
            prevalidationContext
        };
    }

    /**
     * Performs synchronous validation.
     * Validates left schema first, then right schema.
     * Both must pass for the intersection to be valid.
     */
    protected _validate(
        object: TExplicitType extends undefined
            ? SchemaIntersection<TLeft, TRight>
            : TExplicitType,
        context?: ValidationContext
    ): IntersectionSchemaValidationResult<
        TExplicitType extends undefined
            ? SchemaIntersection<TLeft, TRight>
            : TExplicitType
    > {
        if (
            this.canSkipPreValidation &&
            !context?.doNotStopOnFirstError &&
            !context?.rootPropertyDescriptor
        ) {
            if (typeof object === 'undefined') {
                if (this.hasDefault) {
                    object = this.resolveDefaultValue();
                } else if (!this.isRequired) {
                    return { valid: true, object } as any;
                } else {
                    return {
                        valid: false,
                        errors: [
                            {
                                message: this.getValidationErrorMessageSync(
                                    this.requiredErrorMessage,
                                    object as any
                                )
                            }
                        ]
                    } as any;
                }
            } else if (
                object === null &&
                (!this.isRequired || this.isNullable)
            ) {
                return { valid: true, object } as any;
            }

            const leftResult = this.#left.validate(object as any);
            if (!leftResult.valid) {
                return {
                    valid: false,
                    errors: leftResult.errors
                } as any;
            }

            const rightResult = this.#right.validate(object as any);
            if (!rightResult.valid) {
                return {
                    valid: false,
                    errors: rightResult.errors
                } as any;
            }

            const mergedObject = this.#mergeObjects(
                leftResult.object,
                rightResult.object
            );
            return { valid: true, object: mergedObject } as any;
        }

        return this.#validateFull(object, context);
    }

    #validateFull(
        object: any,
        context?: ValidationContext
    ): IntersectionSchemaValidationResult<any> {
        const setup = this.#createValidationSetup(
            this.preValidateSync(object, context)
        );

        if (!setup.needsValidation) return setup.result;

        const { objToValidate, prevalidationContext } = setup;

        const leftResult = this.#left.validate(objToValidate, {
            ...prevalidationContext,
            currentPropertyDescriptor: undefined,
            rootPropertyDescriptor: undefined
        } as any);

        if (!leftResult.valid) {
            return {
                valid: false,
                errors: leftResult.errors
            };
        }

        const rightResult = this.#right.validate(objToValidate, {
            ...prevalidationContext,
            currentPropertyDescriptor: undefined,
            rootPropertyDescriptor: undefined
        } as any);

        if (!rightResult.valid) {
            return {
                valid: false,
                errors: rightResult.errors
            };
        }

        const mergedObject = this.#mergeObjects(
            leftResult.object,
            rightResult.object
        );

        return {
            valid: true,
            object: mergedObject
        };
    }

    /**
     * Performs async validation.
     */
    protected async _validateAsync(
        object: TExplicitType extends undefined
            ? SchemaIntersection<TLeft, TRight>
            : TExplicitType,
        context?: ValidationContext
    ): Promise<
        IntersectionSchemaValidationResult<
            TExplicitType extends undefined
                ? SchemaIntersection<TLeft, TRight>
                : TExplicitType
        >
    > {
        const setup = this.#createValidationSetup(
            await super.preValidateAsync(object, context)
        );

        if (!setup.needsValidation) return setup.result;

        const { objToValidate, prevalidationContext } = setup;

        const leftResult = await this.#left.validateAsync(objToValidate, {
            ...prevalidationContext,
            currentPropertyDescriptor: undefined,
            rootPropertyDescriptor: undefined
        } as any);

        if (!leftResult.valid) {
            return {
                valid: false,
                errors: leftResult.errors
            };
        }

        const rightResult = await this.#right.validateAsync(objToValidate, {
            ...prevalidationContext,
            currentPropertyDescriptor: undefined,
            rootPropertyDescriptor: undefined
        } as any);

        if (!rightResult.valid) {
            return {
                valid: false,
                errors: rightResult.errors
            };
        }

        const mergedObject = this.#mergeObjects(
            leftResult.object,
            rightResult.object
        );

        return {
            valid: true,
            object: mergedObject
        };
    }

    protected createFromProps<
        TL extends SchemaBuilder<any, any, any, any, any>,
        TR extends SchemaBuilder<any, any, any, any, any>,
        TReq extends boolean
    >(props: IntersectionSchemaBuilderCreateProps<TL, TR, TReq>): this {
        return IntersectionSchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: any
    ): IntersectionSchemaBuilder<
        TLeft,
        TRight,
        true,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): IntersectionSchemaBuilder<
        TLeft,
        TRight,
        false,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.optional();
    }

    /**
     * @hidden
     */
    public default(
        value:
            | (TExplicitType extends undefined
                  ? SchemaIntersection<TLeft, TRight>
                  : TExplicitType)
            | (() => TExplicitType extends undefined
                  ? SchemaIntersection<TLeft, TRight>
                  : TExplicitType)
    ): IntersectionSchemaBuilder<
        TLeft,
        TRight,
        true,
        TNullable,
        TExplicitType,
        true,
        TExtensions
    > &
        TExtensions {
        return super.default(value as any) as any;
    }

    /**
     * @hidden
     */
    public clearDefault(): IntersectionSchemaBuilder<
        TLeft,
        TRight,
        TRequired,
        TNullable,
        TExplicitType,
        false,
        TExtensions
    > &
        TExtensions {
        return super.clearDefault() as any;
    }

    /**
     * @hidden
     */
    public brand<TBrand extends string | symbol>(
        _name?: TBrand
    ): IntersectionSchemaBuilder<
        TLeft,
        TRight,
        TRequired,
        TNullable,
        (TExplicitType extends undefined
            ? SchemaIntersection<TLeft, TRight>
            : TExplicitType) & { readonly [K in BRAND]: TBrand },
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.brand(_name);
    }

    /**
     * @hidden
     */
    public readonly(): IntersectionSchemaBuilder<
        TLeft,
        TRight,
        TRequired,
        TNullable,
        Readonly<
            TExplicitType extends undefined
                ? SchemaIntersection<TLeft, TRight>
                : TExplicitType
        >,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.readonly();
    }

    /**
     * @hidden
     */
    public nullable(): IntersectionSchemaBuilder<
        TLeft,
        TRight,
        TRequired,
        true,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.nullable() as any;
    }

    /**
     * @hidden
     */
    public notNullable(): IntersectionSchemaBuilder<
        TLeft,
        TRight,
        TRequired,
        false,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.notNullable() as any;
    }

    /**
     * Gets the left side of this intersection.
     */
    public get leftSchema(): TLeft {
        return this.#left;
    }

    /**
     * Gets the right side of this intersection.
     */
    public get rightSchema(): TRight {
        return this.#right;
    }
}

/**
 * Creates an intersection schema.
 * The resulting schema validates that the input satisfies both `left` and `right` schemas.
 *
 * @example
 * ```ts
 * const schema = intersection(
 *     object({ name: string() }),
 *     object({ age: number() })
 * );
 * // InferType<typeof schema> === { name: string } & { age: number }
 * ```
 *
 * @param left - first schema
 * @param right - second schema
 */
export const intersection = <
    TLeft extends SchemaBuilder<any, any, any, any, any>,
    TRight extends SchemaBuilder<any, any, any, any, any>
>(
    left: TLeft,
    right: TRight
) =>
    IntersectionSchemaBuilder.create({
        isRequired: true,
        left,
        right
    }) as IntersectionSchemaBuilder<TLeft, TRight>;
