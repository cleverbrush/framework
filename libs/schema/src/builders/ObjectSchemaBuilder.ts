import {
    InferType,
    NestedValidationError,
    PreValidationResult,
    PropertyDescriptor,
    PropertyDescriptorTree,
    PropertySetterOptions,
    SchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR,
    ValidationContext,
    ValidationResult
} from './SchemaBuilder.js';

import { PropertyValidationError } from './PropertyValidationError.js';

const MUST_BE_AN_OBJECT_ERROR_MESSSAGE = 'must be an object';

/**
 * A callback function to select properties from the schema.
 * Normally it's provided by the user to select property descriptors
 * from the schema for the further usage. e.g. to select source and destination
 * properties for object mappings
 */
export type SchemaPropertySelector<
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    TPropertySchema extends SchemaBuilder<any, any>,
    TAssignableTo = any
> = (
    l: PropertyDescriptorTree<TSchema, TSchema, TAssignableTo>
) => PropertyDescriptor<TSchema, TPropertySchema>;

type ObjectSchemaBuilderProps<
    T extends Record<string, SchemaBuilder> = {},
    TRequired extends boolean = true
> = ReturnType<ObjectSchemaBuilder<T, TRequired>['introspect']>;

type ObjectSchemaBuilderCreateProps<
    T extends Record<string, SchemaBuilder> = {},
    TRequired extends boolean = true
> = Partial<ObjectSchemaBuilderProps<T, TRequired>>;

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export type RespectPropsOptionality<
    T extends Record<string, SchemaBuilder<any, any>>
> = {
    [K in RequiredProps<T>]: InferType<T[K]>;
} & {
    [K in NotRequiredProps<T>]?: InferType<T[K]>;
};

type MakeChildrenRequired<T extends Record<string, SchemaBuilder<any, any>>> = {
    [K in keyof T]: ReturnType<T[K]['required']>;
};

type MakeChildrenOptional<T extends Record<string, SchemaBuilder<any, any>>> = {
    [K in keyof T]: ReturnType<T[K]['optional']>;
};

type MakeChildOptional<
    T extends Record<any, SchemaBuilder<any, any>>,
    TProp extends keyof T
> = {
    [K in keyof T]: K extends TProp ? ReturnType<T[K]['optional']> : T[K];
};

type MakeChildRequired<
    T extends Record<any, SchemaBuilder<any, any>>,
    TProp extends keyof T
> = {
    [K in keyof T]: K extends TProp ? ReturnType<T[K]['required']> : T[K];
};

type ModifyPropSchema<
    T extends Record<any, SchemaBuilder<any, any>>,
    TProp extends keyof T,
    TSchema extends SchemaBuilder<any, any>
> = {
    [K in keyof T]: K extends TProp ? TSchema : T[K];
};

export type ObjectSchemaValidationResult<
    T,
    TRootSchema extends ObjectSchemaBuilder<any, any, any>,
    TSchema extends ObjectSchemaBuilder<any, any, any> = TRootSchema
> = ValidationResult<T> & {
    /**
     * Returns a nested validation error for the property selected by the `selector` function.
     * @param selector a callback function to select property from the schema.
     */
    getErrorsFor<TPropertySchema>(
        selector?: (
            properties: PropertyDescriptorTree<TSchema, TRootSchema>
        ) => PropertyDescriptor<TRootSchema, TPropertySchema>
    ): TPropertySchema extends ObjectSchemaBuilder<any, any, any>
        ? PropertyValidationError<TPropertySchema, TRootSchema>
        : NestedValidationError<InferType<TPropertySchema>>;
};

/**
 * Object schema builder class. Similar to the `object` type
 * in JS. Allows to define a schema for `object` value.
 * Should be used to validate objects with specific properties.
 * Properties should be defined as their own schema builders.
 * You can use any `SchemaBuilder` e.g. `string()`, `number()`,
 * `boolean()`, `array()`, `object()`, etc. to define properties.
 * Which means that you can define nested objects and arrays of
 * any complexity.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link object | object()} function instead.
 *
 * @example
 * ```ts
 * const schema = object({
 *    name: string(),
 *    age: number()
 * });
 *
 * const result = await schema.validate({
 *   name: 'John',
 *   age: 30
 * });
 *
 * // result.valid === true
 * // result.object === { name: 'John', age: 30 }
 * ```
 *
 * @example
 * ```ts
 * const schema = object({
 *   name: string(),
 *   age: number().optional()
 * });
 *
 * const result = await schema.validate({
 *  name: 'John'
 * });
 * // result.valid === true
 * // result.object === { name: 'John' }
 * ```
 *
 * @example
 * ```ts
 * const schema = object({
 *  name: string(),
 *  age: number();
 * });
 * const result = await schema.validate({
 *  name: 'John'
 * });
 *
 * // result.valid === false
 * // result.errors[0].message === "is expected to have property 'age'"
 * ```
 *
 * @example
 * ```ts
 * const schema = object({
 * name: string(),
 * address: object({
 *     city: string(),
 *     country: string()
 *   })
 * });
 * const result = await schema.validate({
 * name: 'John',
 * address: {
 *    city: 'New York',
 *    country: 'USA'
 *  }
 * });
 * // result.valid === true
 * // result.object === {
 * //   name: 'John',
 * //   address: {
 * //     city: 'New York',
 * //     country: 'USA'
 * //   }
 * // }
 * ```
 * @see {@link object}
 */
export class ObjectSchemaBuilder<
    TProperties extends Record<string, SchemaBuilder<any, any>> = {},
    TRequired extends boolean = true,
    TExplicitType = undefined
> extends SchemaBuilder<
    undefined extends TExplicitType
        ? RespectPropsOptionality<TProperties>
        : TExplicitType,
    TRequired
> {
    #properties: TProperties = {} as any;
    #acceptUnknownProps = false;

    #propertyDescriptorTreeMap: PropertyDescriptorMap = new WeakMap() as any;

    public static create<
        P extends Record<string, SchemaBuilder>,
        R extends boolean
    >(props: ObjectSchemaBuilderCreateProps<P, R>) {
        return new ObjectSchemaBuilder({
            type: 'object',
            ...props
        } as any);
    }

    protected createFromProps<
        T extends Record<string, SchemaBuilder>,
        R extends boolean = true
    >(props: ObjectSchemaBuilderCreateProps<T, R>): this {
        return ObjectSchemaBuilder.create(props as any) as any;
    }

    private constructor(props: ObjectSchemaBuilderCreateProps) {
        super(props as any);

        if (typeof props.properties === 'object' && props.properties) {
            this.#properties = props.properties as any;
        }

        if (typeof props.acceptUnknownProps === 'boolean') {
            this.#acceptUnknownProps = props.acceptUnknownProps;
        }
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * Properties defined in schema
             */
            properties: { ...this.#properties },
            /**
             * If set to `true`, schema validation will not
             * return errors if object contains fields which
             * are not defined in the schema `properties`.
             * Set to `false` by default
             */
            acceptUnknownProps: this.#acceptUnknownProps
        };
    }

    /**
     * @hidden
     */
    public required(): ObjectSchemaBuilder<TProperties, true, TExplicitType> {
        return super.required();
    }

    /**
     * @hidden
     */
    public optional(): ObjectSchemaBuilder<TProperties, false, TExplicitType> {
        return super.optional();
    }

    protected async preValidate(
        /**
         * Object to validate
         */
        object: any,
        context?: ValidationContext<this>
    ): Promise<
        PreValidationResult<
            InferType<
                SchemaBuilder<
                    undefined extends TExplicitType
                        ? Id<RespectPropsOptionality<TProperties>>
                        : TExplicitType,
                    TRequired
                >
            >,
            { validatedObject: any }
        >
    > {
        const result = await super.preValidate(object, context);
        if (
            !ObjectSchemaBuilder.isValidPropertyDescriptor(
                result?.context?.rootPropertyDescriptor as any
            )
        ) {
            (result.context.rootPropertyDescriptor as any) =
                ObjectSchemaBuilder.getPropertiesFor(this);
        }

        if (
            !ObjectSchemaBuilder.isValidPropertyDescriptor(
                result.context.currentPropertyDescriptor as any
            )
        ) {
            result.context.currentPropertyDescriptor =
                result.context.rootPropertyDescriptor;
        }

        if (
            !result.context.rootValidationObject &&
            result.transaction?.object?.validatedObject
        ) {
            result.context.rootValidationObject =
                result.transaction.object.validatedObject;
        }

        return result;
    }

    /**
     * Performs validion of object schema over the `object`.
     * @param context Optional `ValidationContext` settings.
     */
    public async validate(
        object: undefined extends TExplicitType
            ? InferType<
                  SchemaBuilder<
                      undefined extends TExplicitType
                          ? Id<RespectPropsOptionality<TProperties>>
                          : TExplicitType,
                      TRequired
                  >
              >
            : TExplicitType,
        context?: ValidationContext<this>
    ): Promise<
        ObjectSchemaValidationResult<
            undefined extends TExplicitType
                ? InferType<
                      SchemaBuilder<
                          undefined extends TExplicitType
                              ? Id<RespectPropsOptionality<TProperties>>
                              : TExplicitType,
                          TRequired
                      >
                  >
                : TExplicitType,
            this
        >
    > {
        const prevalidatedResult = await this.preValidate(object, context);
        const {
            valid,
            context: prevalidationContext,
            transaction: validationTransaction,
            errors: preValidationErrors
        } = prevalidatedResult;

        const propertyDescriptorToErrorMap = new WeakMap<
            PropertyDescriptor<any, any>,
            PropertyValidationError<any, any>
        >() as any;

        const { path, doNotStopOnFirstError, rootValidationObject } =
            prevalidationContext;

        const rootPropertyDescriptor: PropertyDescriptor<this, this> =
            prevalidationContext.rootPropertyDescriptor as any;

        const currentPropertyDescriptor: PropertyDescriptor<this, this> =
            prevalidationContext.currentPropertyDescriptor as any;

        const addErrorFor = (
            propertyDescriptor: PropertyDescriptor<any, any>,
            message: string
        ) => {
            if (
                !ObjectSchemaBuilder.isValidPropertyDescriptor(
                    propertyDescriptor
                )
            ) {
                throw new Error('invalid property descriptor');
            }

            let validationError: PropertyValidationError<this, any> =
                propertyDescriptorToErrorMap.has(propertyDescriptor)
                    ? propertyDescriptorToErrorMap.get(propertyDescriptor)
                    : (null as any);

            if (!validationError) {
                validationError = new PropertyValidationError(
                    propertyDescriptor,
                    rootValidationObject
                );

                propertyDescriptorToErrorMap.set(
                    propertyDescriptor,
                    validationError
                );
            }

            validationError.addError(message);
        };

        const getErrorsFor = (<TPropertySchema extends SchemaBuilder<any, any>>(
            selector?: (
                properties: PropertyDescriptorTree<this>
            ) => PropertyDescriptor<this, TPropertySchema>
        ): PropertyValidationError<this, any> => {
            const descriptor: PropertyDescriptor<this, any> =
                typeof selector === 'function'
                    ? selector(currentPropertyDescriptor as any)
                    : currentPropertyDescriptor;

            if (
                !ObjectSchemaBuilder.isValidPropertyDescriptor(
                    descriptor as any
                )
            ) {
                throw new Error('invalid property descriptor');
            }

            if (!propertyDescriptorToErrorMap.has(descriptor)) {
                propertyDescriptorToErrorMap.set(
                    descriptor,
                    new PropertyValidationError(
                        descriptor,
                        rootValidationObject
                    )
                );
            }

            return propertyDescriptorToErrorMap.get(descriptor);
        }) as any;

        let errors = prevalidatedResult.errors || [];

        if (!valid && !doNotStopOnFirstError) {
            return {
                valid,
                errors: preValidationErrors,
                getErrorsFor
            };
        }

        const {
            object: { validatedObject: objToValidate }
        } = validationTransaction!;

        if (
            !this.isRequired &&
            (typeof objToValidate === 'undefined' || objToValidate === null)
        ) {
            return {
                valid: true,
                object: validationTransaction!.commit().validatedObject,
                getErrorsFor
            };
        }

        if (typeof objToValidate !== 'object') {
            errors.push({
                message: MUST_BE_AN_OBJECT_ERROR_MESSSAGE,
                path: path as string
            });
            addErrorFor(
                currentPropertyDescriptor,
                MUST_BE_AN_OBJECT_ERROR_MESSSAGE
            );

            if (!doNotStopOnFirstError) {
                if (validationTransaction) {
                    validationTransaction.rollback();
                }
                return {
                    valid: false,
                    errors: [errors[0]],
                    getErrorsFor
                };
            }
        }

        const propKeys = Object.keys(this.#properties);
        const objKeys = Object.keys(objToValidate as Object);

        if (propKeys.length === 0) {
            if (objKeys.length === 0) {
                if (doNotStopOnFirstError && errors.length > 0) {
                    return {
                        valid: false,
                        errors,
                        getErrorsFor
                    };
                }
                if (validationTransaction) {
                    validationTransaction.commit().validatedObject;
                }
                return {
                    valid: true,
                    object: {} as any,
                    getErrorsFor
                };
            }
        }

        const validationResults = await Promise.all(
            propKeys.map(async (key) => ({
                key,
                result: await this.#properties[key].validate(
                    objToValidate[key],
                    {
                        ...context,
                        path: `${path}.${key}`,
                        rootPropertyDescriptor: rootPropertyDescriptor as any,
                        currentPropertyDescriptor:
                            currentPropertyDescriptor[key]
                    }
                )
            }))
        );

        const notValidResults = validationResults.filter(
            (res) => !res.result.valid
        );

        validationResults
            .filter((res) => res.result.valid)
            .forEach(({ key, result }) => {
                objToValidate[key] = result.object;
            });

        errors = [
            ...errors,
            ...notValidResults.reduce(
                (acc, val) => [...acc, ...(val?.result?.errors || [])],
                []
            )
        ];

        for (let i = 0; i < objKeys.length; i++) {
            const key = objKeys[i];
            if (!(key in this.#properties) && !this.#acceptUnknownProps) {
                const message = `unknown property '${key}'`;
                errors.push({
                    message,
                    path: path as string
                });
                addErrorFor(currentPropertyDescriptor, message);
                if (!doNotStopOnFirstError) {
                    if (validationTransaction) {
                        validationTransaction.rollback();
                    }
                    return {
                        valid: false,
                        errors: [errors[0]],
                        getErrorsFor
                    };
                }
            }
        }

        if (notValidResults.length === 0 && errors.length === 0) {
            const commited = validationTransaction!.commit();
            return {
                valid: true,
                object: commited.validatedObject,
                getErrorsFor
            };
        }

        notValidResults.forEach(({ key, result }) => {
            const descriptor = currentPropertyDescriptor[key];
            if (
                typeof (result as any).getErrorsFor === 'function' &&
                ObjectSchemaBuilder.isValidPropertyDescriptor(descriptor)
            ) {
                // const seenValue =
                //     currentPropertyDescriptor[key][
                //         SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
                //     ].getValue(rootValidationObject);
                // console.log(seenValue);
                // console.log(
                //     'errors',
                //     (result as any).getErrorsFor(currentPropertyDescriptor[key])
                //         .errors
                // );
            } else if (Array.isArray(result.errors)) {
                result.errors.forEach((error) => {
                    addErrorFor(descriptor, error.message);
                });
            }
        });

        validationTransaction!.rollback();

        return {
            valid: false,
            errors: doNotStopOnFirstError
                ? errors
                : errors[0]
                  ? [errors[0]]
                  : [],
            getErrorsFor
        };
    }

    /**
     * Fields not defined in `properties` will not be validated
     * and will be passed through the validation.
     */
    public acceptUnknownProps(): ObjectSchemaBuilder<
        TProperties,
        TRequired,
        TExplicitType
    > {
        return this.createFromProps({
            ...this.introspect(),
            acceptUnknownProps: true
        } as ObjectSchemaBuilderProps<TProperties, TRequired>) as any;
    }

    /**
     * Fields not defined in `properties` will be considered
     * as schema violation. This is the default behavior.
     */
    public notAcceptUnknownProps(): ObjectSchemaBuilder<
        TProperties,
        TRequired,
        TExplicitType
    > {
        return this.createFromProps({
            ...this.introspect(),
            acceptUnknownProps: false
        } as ObjectSchemaBuilderProps) as any;
    }

    /**
     * @hidden
     */
    public hasType<T>(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        notUsed?: T
    ): ObjectSchemaBuilder<TProperties, TRequired, T> {
        return this.createFromProps({
            ...this.introspect()
        } as ObjectSchemaBuilderProps) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): ObjectSchemaBuilder<TProperties, TRequired> {
        return this.createFromProps({
            ...this.introspect()
        } as ObjectSchemaBuilderProps) as any;
    }

    /**
     * Adds a new property to the object schema. The new property
     * will be validated according to the provided schema.
     * @param propName name of the new property
     * @param schema schema builder of the new property
     */
    public addProp<TType extends SchemaBuilder<any, any>, TName extends string>(
        propName: TName,
        schema: TType
    ): ObjectSchemaBuilder<
        TProperties & {
            [k in TName]: TType;
        },
        TRequired,
        TExplicitType
    > {
        if (typeof propName !== 'string' || !propName) {
            throw new Error('propName must be a non empty string');
        }
        if (propName in this.#properties) {
            throw new Error(`Property ${propName} already exists`);
        }
        if (!(schema instanceof SchemaBuilder)) {
            throw new Error(
                'schema must be an instance of the SchemaBuilder class'
            );
        }

        return this.createFromProps({
            ...this.introspect(),
            properties: {
                ...this.introspect().properties,
                [propName]: schema
            }
        } as any) as any;
    }

    /**
     * @hidden
     * @deprecated this is for internal use, do not use if you are
     * not sure you need it.
     *
     * TODO: This is used to avoid `&` in resulting types. For example,
     * when you have a schema like `object({prop1: string()})` and then use `addProp({prop2: string()})` method,
     * the resulting type without `optimize` will be something like `{prop1: string} & {prop2: string}`. Which
     * is not we would like to have. Instead we want to have `{prop1: string, prop2: string}`. This is what
     * `optimize` method does. However it is not always possible to do this optimization without losing
     * JSDoc comments, which is sucks. For example, I had to disable optimization for UnionSchemas, because
     * comments were lost. Hopefully it will be fixed in the future by Typescript team or somebody will
     * find a workaround/fix and create a pull request.
     */
    public optimize(): SchemaBuilder<
        undefined extends TExplicitType
            ? Id<RespectPropsOptionality<TProperties>>
            : TExplicitType
    > {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * Adds new properties to the object schema. The same as `.addProp()` but
     * allows to add multiple properties with one call. The new properties
     * will be validated according to the provided schemas.
     * @param props a key/schema object map.
     */
    public addProps<TProps extends Record<string, SchemaBuilder<any, any>>>(
        props: TProps
    ): ObjectSchemaBuilder<TProperties & TProps, TRequired, undefined>;

    /**
     * Adds all properties from the `schema` object schema to the current schema.
     * @param schema an instance of `ObjectSchemaBuilder`
     */
    public addProps<K extends ObjectSchemaBuilder<any, any, any>>(
        schema: K
    ): K extends ObjectSchemaBuilder<
        infer TProp,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer TReq,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer TExpType
    >
        ? ObjectSchemaBuilder<
              Omit<TProperties, keyof TProp> & TProp,
              TRequired,
              TExplicitType
          >
        : never;

    public addProps(props) {
        if (props instanceof ObjectSchemaBuilder) {
            return this.addProps(props.introspect().properties);
        }

        if (typeof props !== 'object') {
            throw new Error('props should be an object');
        }
        if (props === null) {
            throw new Error('props should not be null');
        }

        const newProps = { ...this.#properties } as any;

        for (const key in props) {
            if (key in this.#properties) {
                throw new Error(`property '${key}' already exists`);
            }

            if (!(props[key] instanceof SchemaBuilder)) {
                throw new Error(`${key} is not a SchemaBuilder`);
            }

            newProps[key] = props[key] as any;
        }

        return this.createFromProps({
            ...this.introspect(),
            properties: newProps
        } as ObjectSchemaBuilderProps) as any;
    }

    /**
     * Omits properties listed in `properties` from the schema.
     * Consider `Omit<Type, 'prop1'|'prop2'...>` as a good illustration
     * from the TS world.
     * @param properties - array of property names (strings) to remove from the schema.
     */
    public omit<K extends keyof TProperties>(
        properties: K[]
    ): ObjectSchemaBuilder<Omit<TProperties, K>, TRequired, TExplicitType>;
    /**
     * Removes `propName` from the list of properties.
     * @param propName property name to remove. Schema should contain
     * this property. An error will be thrown otherwise.
     */
    public omit<TProperty extends keyof TProperties>(
        propName: TProperty
    ): ObjectSchemaBuilder<
        Omit<TProperties, TProperty>,
        TRequired,
        TExplicitType
    >;
    /**
     * Removes all properties of `schema` from the current schema.
     * `Omit<TSchema, keyof TAnotherSchema>` as a good illustration
     * from the TS world.
     * @param schema schema builder to take properties from.
     */
    public omit<T>(
        schema: T
    ): T extends ObjectSchemaBuilder<
        infer TProps,
        infer TRequired,
        infer TExplicitType
    >
        ? ObjectSchemaBuilder<
              Omit<TProperties, keyof TProps>,
              TRequired,
              TExplicitType
          >
        : never;

    public omit(propNameOrArrayOrPropsOrBuilder): any {
        if (typeof propNameOrArrayOrPropsOrBuilder === 'string') {
            // remove one field
            const propName =
                propNameOrArrayOrPropsOrBuilder as keyof TProperties;

            if (!propName || !(propName in this.#properties)) {
                throw new Error(
                    `property ${propName.toString()} does not exists in the schema`
                );
            }

            return this.createFromProps({
                ...this.introspect(),
                properties: (() => {
                    const result = { ...this.#properties };
                    delete result[propName];
                    return result;
                })()
            } as any);
        } else if (Array.isArray(propNameOrArrayOrPropsOrBuilder)) {
            const propsArray = propNameOrArrayOrPropsOrBuilder as Array<
                keyof TProperties
            >;

            const distinctKeys = new Map<keyof TProperties, true>();
            propsArray.forEach((key) => {
                if (typeof key !== 'string' || !key) {
                    throw new Error('property name must be a string');
                }

                if (!(key in this.#properties)) {
                    throw new Error(
                        `property ${key.toString()} does not exists in the schema`
                    );
                }

                distinctKeys.set(key.toString(), true);
            });

            if (distinctKeys.size === 0) {
                throw new Error('please provide at least one property to omit');
            }

            const props = {
                ...this.introspect()
            };

            for (const key of distinctKeys.keys()) {
                delete props.properties[key];
            }

            return this.createFromProps(props as any);
        } else if (
            propNameOrArrayOrPropsOrBuilder instanceof ObjectSchemaBuilder
        ) {
            const propsToOmit = {
                ...propNameOrArrayOrPropsOrBuilder.introspect().properties
            };

            const props = {
                ...this.introspect()
            };

            for (const key in propsToOmit) {
                if (key in props.properties) {
                    delete props.properties[key];
                }
            }

            return this.createFromProps(props as any);
        }

        throw new Error('this parameter type is not supported');
    }

    /**
     * Adds all properties from `schema` to the current schema.
     * `TSchema & TAnotherSchema` is a good example of the similar concept
     * in the TS type system.
     * @param schema an object schema to take properties from
     */
    public intersect<T extends ObjectSchemaBuilder<any, any, any>>(
        schema: T
    ): T extends ObjectSchemaBuilder<
        infer TProps,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer TReq,
        infer TExplType
    >
        ? ObjectSchemaBuilder<
              Omit<TProperties, keyof TProps> & TProps,
              TRequired,
              TExplType
          >
        : never {
        if (!(schema instanceof ObjectSchemaBuilder)) {
            throw new Error(
                'schema must be an instance of the ObjectSchemaBuilder class'
            );
        }

        const remoteProps = schema.introspect().properties;

        const localProps = this.introspect();

        const newProps = Object.keys(localProps.properties).reduce(
            (acc, curr) => {
                acc[curr] =
                    curr in remoteProps ? remoteProps[curr] : localProps[curr];
                return acc;
            },
            {}
        );

        return this.createFromProps({
            ...this.introspect(),
            properties: newProps
        } as any) as any;
    }

    /**
     * Marks all properties in the current schema as optional.
     * It is the same as call `.optional('propname')` where `propname` is the name
     * of every property in the schema.
     */
    public partial(): ObjectSchemaBuilder<
        MakeChildrenOptional<TProperties>,
        TRequired,
        TExplicitType
    >;
    /**
     * Marks all properties from `properties` as optional in the schema.
     * @param properties list of property names (string) to make optional
     */
    public partial<K extends keyof TProperties>(
        properties: K[]
    ): ObjectSchemaBuilder<
        Omit<TProperties, K> & Pick<MakeChildrenOptional<TProperties>, K>,
        TRequired,
        TExplicitType
    >;
    /**
     * Marks property `propName` as optional in the schema.
     * @param propName the name of the property (string).
     */
    public partial<TProperty extends keyof TProperties>(
        propName: TProperty
    ): ObjectSchemaBuilder<
        Omit<TProperties, TProperty> &
            Pick<MakeChildrenOptional<TProperties>, TProperty>,
        TRequired,
        TExplicitType
    >;

    public partial(propNameOrArray?): any {
        if (
            typeof propNameOrArray === 'undefined' ||
            propNameOrArray === null
        ) {
            return this.createFromProps({
                ...this.introspect(),
                properties: Object.keys(this.#properties).reduce((acc, key) => {
                    acc[key] = this.#properties[key].optional();
                    return acc;
                }, {})
            } as ObjectSchemaBuilderProps);
        }

        if (Array.isArray(propNameOrArray)) {
            const propsArray = propNameOrArray as (keyof TProperties)[];
            if (propsArray.length === 0) {
                throw new Error('properties cannot be empty');
            }

            const newProps = {
                ...this.introspect()
            } as ObjectSchemaBuilderProps<TProperties, TRequired>;

            propsArray.forEach((key) => {
                if (typeof key !== 'string') {
                    throw new Error(
                        'each propery in property list must be as string value'
                    );
                }
                if (!(key in newProps.properties)) {
                    throw new Error(
                        `property ${key as string} does not exists`
                    );
                }

                newProps.properties[key as keyof TProperties] =
                    newProps.properties[key].optional();
            });

            return this.createFromProps(newProps);
        }

        if (typeof propNameOrArray === 'string') {
            return this.modifyPropSchema(
                propNameOrArray as keyof TProperties,
                (schema) => schema.optional()
            );
        }

        throw new Error('expecting string or string[] parameter');
    }

    /**
     * Returns a new schema containing only properties listed in
     * `properties` array.
     * @param properties array of property names (strings)
     */
    public pick<K extends keyof TProperties>(
        properties: K[]
    ): ObjectSchemaBuilder<Pick<TProperties, K>, TRequired, undefined>;
    /**
     * Returns new schema based on the current schema. This new schema
     * will consists only from properties which names are taken from the
     * `schema` object schema.
     * @param schema schema to take property names list from
     */
    public pick<K extends ObjectSchemaBuilder<any, any, any>>(
        schema: K
    ): K extends ObjectSchemaBuilder<
        infer TProps,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer T1,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer T2
    >
        ? ObjectSchemaBuilder<
              Omit<TProperties, keyof Omit<TProperties, keyof TProps>>,
              TRequired,
              undefined
          >
        : never;

    /**
     * Returns a new schema consisting of only one property
     * (taken from the `property` property name). If the property
     * does not exists in the current schema, an error will be thrown.
     * @param property the name of the property (string).
     */
    public pick<K extends keyof TProperties>(
        property: K
    ): ObjectSchemaBuilder<Pick<TProperties, K>, TRequired, undefined>;

    public pick(properties): any {
        if (typeof properties === 'string') {
            const property = properties as string;

            if (!property) {
                throw new Error('property cannot be empty');
            }

            if (!(property in this.#properties)) {
                throw new Error(`property ${property} does not exists`);
            }

            return this.createFromProps({
                ...this.introspect(),
                properties: {
                    [property]: this.#properties[property]
                }
            } as any);
        }

        if (Array.isArray(properties)) {
            if (properties.length === 0) {
                throw new Error('properties must be a non empty erray');
            }
            const newProperties = properties.reduce((acc, curr) => {
                if (typeof curr !== 'string' || !curr) {
                    throw new Error(
                        'each property name must be a non empty string'
                    );
                }
                if (!(curr in this.#properties)) {
                    throw new Error(`property ${curr} does not exists`);
                }

                acc[curr] = this.#properties[curr];
                return acc;
            }, {});

            return this.createFromProps({
                ...this.introspect(),
                properties: newProperties
            } as any);
        }

        if (properties instanceof ObjectSchemaBuilder) {
            const externalSchema = properties as ObjectSchemaBuilder;

            const props = Object.keys(
                externalSchema.introspect().properties
            ).filter((p) => typeof this.#properties[p] !== 'undefined');
            if (props.length === 0) {
                throw new Error(
                    'there are no common properties in provided schemas'
                );
            }
            return this.pick(props as any as keyof TProperties);
        }

        throw new Error('string, array or ObjectSchemaBuilder is expected');
    }

    /**
     * Modify schema for `propName` and return a new schema.
     * Could be useful if you want to leave all schema intact, but
     * change a type of one property.
     * @param propName name of the property (string)
     * @param callback callback function returning a new schema fo the `propName`. As a first parameter
     * you will receive an old schema for `propName`.
     * @returns
     */
    public modifyPropSchema<
        K extends keyof TProperties,
        R extends SchemaBuilder<any, any>
    >(
        propName: K,
        callback: (builder: TProperties[K]) => R
    ): ObjectSchemaBuilder<
        ModifyPropSchema<TProperties, K, R>,
        TRequired,
        TExplicitType
    > {
        if (typeof propName !== 'string' || !propName) {
            throw new Error('propName must be a non empty string');
        }

        if (!(propName in this.#properties)) {
            throw new Error(
                `property ${propName} does not exists in the schema`
            );
        }

        if (typeof callback !== 'function') {
            throw new Error('callback must be a function');
        }

        const callbackResult = callback(this.#properties[propName]);
        if (!(callbackResult instanceof SchemaBuilder)) {
            throw new Error('callback must return a SchemaBuilder object');
        }

        const props = {
            ...this.introspect()
        } as ObjectSchemaBuilderProps;

        props.properties = {
            ...props.properties,
            [propName]: callbackResult
        };

        return this.createFromProps(props) as any;
    }

    /**
     * An alias for `.partial(prop: string)`
     * @param prop name of the property
     */
    public makePropOptional<K extends keyof TProperties>(
        prop: K
    ): ObjectSchemaBuilder<
        MakeChildOptional<TProperties, K>,
        TRequired,
        TExplicitType
    > {
        return this.modifyPropSchema(prop, (builder) =>
            builder.optional()
        ) as any;
    }

    /**
     * Marks `prop` as required property.
     * If `prop` does not exists in the current schema,
     * an error will be thrown.
     * @param prop name of the property
     */
    public makePropRequired<K extends keyof TProperties>(
        prop: K
    ): ObjectSchemaBuilder<
        MakeChildRequired<TProperties, K>,
        TRequired,
        TExplicitType
    > {
        return this.modifyPropSchema(prop, (builder) =>
            builder.required()
        ) as any;
    }

    /**
     * `Partial<T>` would be a good example of the
     * same operation in the TS world.
     */
    public makeAllPropsOptional(): ObjectSchemaBuilder<
        MakeChildrenOptional<TProperties>,
        TRequired,
        TExplicitType
    > {
        return this.createFromProps({
            ...this.introspect(),
            properties: Object.keys(this.#properties).reduce((acc, curr) => {
                acc[curr] = this.#properties[curr].optional();
                return acc;
            }, {})
        } as any) as any;
    }

    /**
     * `Required<T>` would be a good example of the
     * same operation in the TS world.
     */
    public makeAllPropsRequired(): ObjectSchemaBuilder<
        MakeChildrenRequired<TProperties>,
        TRequired,
        TExplicitType
    > {
        return this.createFromProps({
            ...this.introspect(),
            properties: Object.keys(this.#properties).reduce((acc, curr) => {
                acc[curr] = this.#properties[curr].required();
                return acc;
            }, {})
        } as any) as any;
    }

    static #getPropertiesFor<
        TProperties extends Record<string, SchemaBuilder<any, any>> = {},
        TRequired extends boolean = true,
        TExplicitType = undefined,
        TSchema extends ObjectSchemaBuilder<
            any,
            any,
            any
        > = ObjectSchemaBuilder<TProperties, TRequired, TExplicitType>
    >(
        schema: TSchema,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        // this is to make possibility to traverse the tree and select properties
        selector?: (arg1: any, any) => any,
        // parent object to have a possibility to get link to itself
        parentSelector?: any,
        currentName?: string
    ): PropertyDescriptorTree<TSchema> {
        const introspected = schema.introspect();
        if (!introspected.properties) {
            return {} as any;
        }

        const propsNames = Object.keys(introspected.properties);

        if (propsNames.length === 0) {
            return {} as any;
        }

        if (typeof selector !== 'function') {
            selector = (o) => o;
        }
        const result =
            // typeof selector !== 'function' || !parentSelector || !currentName
            //     ? {}
            //     :
            createPropertyDescriptorFor(
                (obj, createMissingStructure) =>
                    (parentSelector || selector)(obj, createMissingStructure),
                currentName,
                schema
            );

        for (const propName of propsNames) {
            const propSchema = introspected.properties[propName];
            if (propSchema instanceof ObjectSchemaBuilder) {
                result[propName] = (
                    ObjectSchemaBuilder.#getPropertiesFor as any
                )(
                    propSchema,
                    (tree, createMissingStructure) => {
                        const selectorResult = selector(
                            tree,
                            createMissingStructure
                        );
                        if (selectorResult) {
                            if (
                                createMissingStructure &&
                                !selectorResult[propName]
                            ) {
                                selectorResult[propName] = {};
                            }
                            return selectorResult[propName];
                        }
                        return null;
                    },
                    selector,
                    propName
                );
            } else {
                result[propName] = createPropertyDescriptorFor(
                    selector,
                    propName
                );
            }
        }

        return result as any;
    }

    public static getPropertiesFor<
        TProperties extends Record<string, SchemaBuilder<any, any>> = {},
        TRequired extends boolean = true,
        TExplicitType = undefined,
        TSchema extends ObjectSchemaBuilder<
            any,
            any,
            any
        > = ObjectSchemaBuilder<TProperties, TRequired, TExplicitType>
    >(schema: TSchema): PropertyDescriptorTree<TSchema, TSchema> {
        if (!(schema instanceof ObjectSchemaBuilder)) {
            throw new Error(
                'schema must be an instance of the ObjectSchemaBuilder class'
            );
        }

        if (schema.#propertyDescriptorTreeMap.has(schema)) {
            return schema.#propertyDescriptorTreeMap.get(schema) as any;
        }

        const result = ObjectSchemaBuilder.#getPropertiesFor(schema);
        schema.#propertyDescriptorTreeMap.set(schema, result);

        return result;
    }

    public static isValidPropertyDescriptor(
        descriptor: PropertyDescriptor<any, any>
    ) {
        return (
            typeof descriptor === 'object' &&
            descriptor !== null &&
            typeof descriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR] === 'object'
        );
    }
}

export interface Object {
    /**
     * Defines a schema for empty object `{}`
     */
    (): ObjectSchemaBuilder<{}, true>;
    /**
     * Defines an object schema, properties definitions are takens from `props`.
     * @param props key/schema object map for schema's properties.
     */
    <TProps extends Record<string, SchemaBuilder<any, any>>>(
        props: TProps
    ): ObjectSchemaBuilder<TProps, true>;
    /**
     * Defines an object schema, properties definitions are takens from `props`.
     * @param props key/schema object map for schema's properties.
     */
    <TProps extends Record<string, SchemaBuilder<any, any>>>(
        props?: TProps
    ): ObjectSchemaBuilder<TProps, true>;
    /**
     * Returns a tree of property descriptors for the given `schema`.
     * The structure of the tree is the same as the structure of the `schema`.
     * Which gives you an opportunity to access property descriptors for each
     * property in the schema in a useful and type-safe way.
     * @param schema
     */
    getPropertiesFor<
        TProperties extends Record<string, SchemaBuilder<any, any>> = {},
        TRequired extends boolean = true,
        TExplicitType = undefined,
        TSchema extends ObjectSchemaBuilder<
            any,
            any,
            any
        > = ObjectSchemaBuilder<TProperties, TRequired, TExplicitType>
    >(
        schema: TSchema
    ): PropertyDescriptorTree<TSchema, TSchema>;

    /**
     * Verifies if the given `descriptor` is a valid property descriptor.
     * @param descriptor a property descriptor to check
     */
    isValidPropertyDescriptor(
        descriptor: PropertyDescriptor<any, any>
    ): boolean;
}

const object = ((props) => {
    return ObjectSchemaBuilder.create({
        isRequired: true,
        properties: props
    }) as any;
}) as Object;

type PropertyDescriptorMap = Map<
    ObjectSchemaBuilder<any, any, any>,
    PropertyDescriptorMap | PropertyDescriptorTree<any, any>
>;

const createPropertyDescriptorFor = (
    selector: (any, boolean) => any,
    propertyName?: string,
    schema?: SchemaBuilder<any, any>
) => ({
    [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: {
        setValue: (obj, newValue, options?: PropertySetterOptions) => {
            const selectorResult = selector(
                obj,
                !!options?.createMissingStructure
            );
            if (!selectorResult) return false;

            if (typeof propertyName === 'string') {
                selectorResult[propertyName] = newValue;
            }

            return true;
        },
        getValue: (obj) => {
            const selectorResult = selector(obj, false);
            if (!selectorResult)
                return {
                    success: false
                };

            if (typeof propertyName !== 'string') {
                return {
                    success: true,
                    value: selectorResult
                };
            }

            if (Object.hasOwn(selectorResult, propertyName)) {
                return {
                    success: true,
                    value: selectorResult[propertyName]
                };
            }

            return {
                success: false
            };
        },

        getSchema: () => schema
    }
});

(object as any).getPropertiesFor = <
    TProperties extends Record<string, SchemaBuilder<any, any>> = {},
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TSchema extends ObjectSchemaBuilder<any, any, any> = ObjectSchemaBuilder<
        TProperties,
        TRequired,
        TExplicitType
    >
>(
    schema: ObjectSchemaBuilder<TProperties, TRequired, TExplicitType>
): PropertyDescriptorTree<TSchema, TSchema> =>
    ObjectSchemaBuilder.getPropertiesFor(schema) as any;

(object as any).isValidPropertyDescriptor =
    ObjectSchemaBuilder.isValidPropertyDescriptor;

export { object };

type RequiredProps<T extends Record<string, SchemaBuilder<any, any>>> = keyof {
    [k in keyof T as T[k] extends SchemaBuilder<
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer TRes,
        infer TReq
    >
        ? TReq extends true
            ? k
            : never
        : never]: T[k];
};

type NotRequiredProps<T extends Record<string, SchemaBuilder<any, any>>> =
    keyof {
        [k in keyof T as T[k] extends SchemaBuilder<
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            infer TRes,
            infer TReq
        >
            ? TReq extends true
                ? never
                : k
            : never]: T[k];
    };
