import {
    InferType,
    SchemaBuilder,
    ValidationContext,
    ValidationResult
} from './SchemaBuilder.js';

/**
 * A symbol to mark property descriptors in the schema.
 * Normally, you should not use it directly unless you want
 * to develop some advanced features or extend the library.
 * In normal conditions it's used internally by the library.
 */
export const SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR = Symbol();

/**
 * Describes a property in a schema. And gives you
 * a possibility to access property value and set it.
 * suppose you have a schema like this:
 * ```ts
 * const schema = object({
 *  name: string(),
 *  address: object({
 *   city: string(),
 *   country: string()
 *  }),
 *  id: number()
 * });
 * ```
 * then you can get a property descriptor for the `address.city` property
 * like this:
 * ```ts
 * const addressCityDescriptor = schema.getPropertiesFor(schema).address.city;
 * ```
 *
 * And then you can use it to get and set the value of this property having the object:
 * ```ts
 * const obj = {
 * name: 'Leo',
 * address: {
 *  city: 'Kozelsk',
 *  country: 'Russia'
 *  },
 *  id: 123
 * };
 *
 * const success = addressCityDescriptor.setValue(obj, 'Venyov');
 * // this returns you a boolean value indicating if the value was set successfully
 * ```
 */
export type PropertyDescriptor<
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    TPropertyType
> = {
    [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: {
        /**
         * Sets a new value to the property. If the process was successful,
         * the method returns `true`, otherwise `false`.
         * It can return `false` if the property could not be set to the object
         * which can happen if the `setValue` method is called with an object
         * which does not comply with the schema.
         * for example, if you have a schema and property descriptopr like this:
         * ```ts
         * const schema = object({
         *  name: string(),
         *  address: object({
         *   city: string(),
         *   country: string()
         *  }),
         *  id: number()
         * });
         *
         * const addressCityDescriptor = schema.getPropertiesFor(schema).address.city;
         * ```
         * And then you try to set a new value to the `address.city` property on the object
         * which does not have `address` property:
         * ```ts
         * const obj = {
         * name: 'Leo'
         * };
         *
         * const success = addressCityDescriptor.setValue(obj, 'Venyov');
         * // success === false
         * ```
         *
         * @param obj Object to set the value to
         * @param value a new value to set to the property
         * @returns
         */
        setValue: (obj: InferType<TSchema>, value: TPropertyType) => boolean;
        /**
         * Gets the value of the property from the object.
         * @param obj object to get the value from
         * @returns an object containing a `value` and `success` properties. `value` is the value of the property
         * if it was found in the object, `success` is a boolean value indicating if the property was found in the object.
         */
        getValue: (obj: InferType<TSchema>) => {
            value?: TPropertyType;
            success: boolean;
        };
    };
};

/**
 * A tree of property descriptors for the schema.
 * Has a possibility to filter properties by the type (`TAssignableTo` type parameter).
 */
export type PropertyDescriptorTree<
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    TRootSchema extends ObjectSchemaBuilder<any, any, any> = TSchema,
    TAssignableTo = any
> =
    TSchema extends ObjectSchemaBuilder<infer TProperties, any, any>
        ? {
              [K in keyof TProperties]: TProperties[K] extends ObjectSchemaBuilder<
                  any,
                  any,
                  any
              >
                  ? PropertyDescriptorTree<TProperties[K], TRootSchema> &
                        PropertyDescriptor<
                            TRootSchema,
                            InferType<TProperties[K]>
                        >
                  : InferType<TProperties[K]> extends TAssignableTo
                    ? PropertyDescriptor<TRootSchema, InferType<TProperties[K]>>
                    : never;
          }
        : never;

/**
 * A callback function to select properties from the schema.
 * Normally it's provided by the user to select property descriptors
 * from the schema for the further usage. e.g. to select source and destination
 * properties for object mappings
 */
export type SchemaPropertySelector<
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    TPropertyType,
    TAssignableTo = any
> = (
    l: PropertyDescriptorTree<TSchema, TSchema, TAssignableTo>
) => PropertyDescriptor<TSchema, TPropertyType>;

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
        context?: ValidationContext
    ): Promise<
        ValidationResult<
            undefined extends TExplicitType
                ? InferType<
                      SchemaBuilder<
                          undefined extends TExplicitType
                              ? Id<RespectPropsOptionality<TProperties>>
                              : TExplicitType,
                          TRequired
                      >
                  >
                : TExplicitType
        >
    > {
        const prevalidatedResult = await super.preValidate(object, context);
        const {
            valid,
            context: prevalidationContext,
            transaction: validationTransaction,
            errors: preValidationErrors
        } = prevalidatedResult;

        const { path, doNotStopOnFirstError } = prevalidationContext;
        let errors = prevalidatedResult.errors || [];

        if (!valid && !doNotStopOnFirstError) {
            return {
                valid,
                errors: preValidationErrors
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
                object: validationTransaction!.commit().validatedObject
            };
        }

        if (typeof objToValidate !== 'object') {
            errors.push({
                message: 'must be an object',
                path: path as string
            });

            if (!doNotStopOnFirstError) {
                if (validationTransaction) {
                    validationTransaction.rollback();
                }
                return {
                    valid: false,
                    errors: [errors[0]]
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
                        errors
                    };
                }
                if (validationTransaction) {
                    validationTransaction.commit().validatedObject;
                }
                return {
                    valid: true,
                    object: {} as any
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
                        path: `${path}.${key}`
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
                errors.push({
                    message: `unknown property '${key}'`,
                    path: path as string
                });
                if (!doNotStopOnFirstError) {
                    if (validationTransaction) {
                        validationTransaction.rollback();
                    }
                    return {
                        valid: false,
                        errors: [errors[0]]
                    };
                }
            }
        }

        if (notValidResults.length === 0 && errors.length === 0) {
            const commited = validationTransaction!.commit();
            return {
                valid: true,
                object: commited.validatedObject
            };
        }

        validationTransaction!.rollback();

        return {
            valid: false,
            errors: doNotStopOnFirstError
                ? errors
                : errors[0]
                  ? [errors[0]]
                  : []
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
}

const object = ((props) => {
    return ObjectSchemaBuilder.create({
        isRequired: true,
        properties: props
    }) as any;
}) as Object;

const propertyDescriptorTreeMap = new WeakMap<
    ObjectSchemaBuilder<any, any, any>,
    PropertyDescriptorTree<any, any>
>();

const createPropertyDescriptorFor = (
    selector: (any) => any,
    propertyName: string
) => ({
    [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: {
        setValue: (obj, newValue) => {
            const selectorResult = selector(obj);
            if (!selectorResult) return false;

            selectorResult[propertyName] = newValue;
            return true;
        },
        getValue: (obj) => {
            const selectorResult = selector(obj);
            if (!selectorResult)
                return {
                    success: false
                };

            if (Object.hasOwn(selectorResult, propertyName)) {
                return {
                    success: true,
                    value: selectorResult[propertyName]
                };
            }

            return {
                success: false
            };
        }
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
    schema: ObjectSchemaBuilder<TProperties, TRequired, TExplicitType>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // this is to make possibility to traverse the tree and select properties
    selector?: (any) => any,
    // parent object to have a possibility to get link to itself
    parentSelector?: any,
    currentName?: string
): PropertyDescriptorTree<TSchema, TSchema> => {
    if (!(schema instanceof ObjectSchemaBuilder)) {
        throw new Error(
            'schema must be an instance of the ObjectSchemaBuilder class'
        );
    }
    const introspected = schema.introspect();
    if (!introspected.properties) {
        return {} as any;
    }

    const propsNames = Object.keys(introspected.properties);

    if (propsNames.length === 0) {
        return {} as any;
    }

    if (propertyDescriptorTreeMap.has(schema)) {
        return propertyDescriptorTreeMap.get(schema) as any;
    }

    const result =
        typeof selector !== 'function' || !parentSelector || !currentName
            ? {}
            : createPropertyDescriptorFor(
                  (obj) => parentSelector(obj),
                  currentName
              );

    if (typeof selector !== 'function') {
        selector = (o) => o;
    }

    for (const propName of propsNames) {
        const propSchema = introspected.properties[propName];
        if (propSchema instanceof ObjectSchemaBuilder) {
            result[propName] = (object.getPropertiesFor as any)(
                propSchema,
                (tree) => {
                    const selectorResult = selector(tree);
                    if (selectorResult) {
                        return selectorResult[propName];
                    }
                    return null;
                },
                selector,
                propName
            );
        } else {
            result[propName] = createPropertyDescriptorFor(selector, propName);
        }

        propertyDescriptorTreeMap.set(schema, result);
    }

    return result as any;
};

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
