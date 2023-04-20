import {
    InferType,
    SchemaBuilder,
    ValidationContext,
    ValidationResult
} from './SchemaBuilder.js';

type ObjectSchemaBuilderProps<
    T extends Record<string, SchemaBuilder> = {},
    TRequired extends boolean = true
> = ReturnType<ObjectSchemaBuilder<T, TRequired>['introspect']>;

type ObjectSchemaBuilderCreateProps<
    T extends Record<string, SchemaBuilder> = {},
    TRequired extends boolean = true
> = Partial<ObjectSchemaBuilderProps<T, TRequired>>;

type RequiredPropertyNames<T> = {
    [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

type OptionalPropertyNames<T> = {
    [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

type SpreadProperties<L, R, K extends keyof L & keyof R> = {
    [P in K]: L[P] | Exclude<R[P], undefined>;
};

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type MergeTwo<L, R> = Id<
    Pick<L, Exclude<keyof L, keyof R>> &
        Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
        Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
        SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>;

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
    TExplicitType = undefined,
    TResult = {},
    TFinalResult = undefined extends TExplicitType ? TResult : TExplicitType
> extends SchemaBuilder<TFinalResult, TRequired> {
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
    public required(): ObjectSchemaBuilder<
        TProperties,
        true,
        TExplicitType,
        TResult
    > {
        return super.required();
    }

    /**
     * @hidden
     */
    public optional(): ObjectSchemaBuilder<
        TProperties,
        false,
        TExplicitType,
        TResult
    > {
        return super.optional();
    }

    /**
     * Performs validion of object schema over the `object`.
     * @param context Optional `ValidationContext` settings.
     */
    public async validate(
        object: InferType<
            SchemaBuilder<
                undefined extends TExplicitType
                    ? MergeTwo<
                          Omit<
                              {
                                  [k in keyof TResult]?: k extends OptionalPropertyNames<TResult>
                                      ? TResult[k]
                                      : never;
                              },
                              RequiredPropertyNames<TResult>
                          >,
                          Omit<
                              {
                                  [k in keyof TResult]: k extends OptionalPropertyNames<TResult>
                                      ? never
                                      : TResult[k];
                              },
                              OptionalPropertyNames<TResult>
                          >
                      >
                    : TResult,
                TRequired
            >
        >,
        context?: ValidationContext
    ): Promise<
        ValidationResult<
            InferType<
                SchemaBuilder<
                    undefined extends TExplicitType
                        ? MergeTwo<
                              Omit<
                                  {
                                      [k in keyof TResult]?: k extends OptionalPropertyNames<TResult>
                                          ? TResult[k]
                                          : never;
                                  },
                                  RequiredPropertyNames<TResult>
                              >,
                              Omit<
                                  {
                                      [k in keyof TResult]: k extends OptionalPropertyNames<TResult>
                                          ? never
                                          : TResult[k];
                                  },
                                  OptionalPropertyNames<TResult>
                              >
                          >
                        : TResult,
                    TRequired
                >
            >
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
        TExplicitType,
        TResult
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
        TExplicitType,
        TResult
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
    ): ObjectSchemaBuilder<TProperties, TRequired, T, TResult> {
        return this.createFromProps({
            ...this.introspect()
        } as ObjectSchemaBuilderProps) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): ObjectSchemaBuilder<
        TProperties,
        TRequired,
        undefined,
        TResult
    > {
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
        TExplicitType,
        TResult &
            (TType extends SchemaBuilder<
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                infer K,
                infer TR
            >
                ? TR extends false
                    ? {
                          [k in TName]?: InferType<TType>;
                      }
                    : {
                          [k in TName]: InferType<TType>;
                      }
                : never)
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
     */
    public optimize(): ObjectSchemaBuilder<
        TProperties,
        TRequired,
        TExplicitType,
        undefined extends TExplicitType
            ? MergeTwo<
                  Omit<
                      {
                          [k in keyof TResult]?: k extends OptionalPropertyNames<TResult>
                              ? TResult[k]
                              : never;
                      },
                      RequiredPropertyNames<TResult>
                  >,
                  Omit<
                      {
                          [k in keyof TResult]: k extends OptionalPropertyNames<TResult>
                              ? never
                              : TResult[k];
                      },
                      OptionalPropertyNames<TResult>
                  >
              >
            : TResult
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
    public addProps<
        TProps extends Record<string, SchemaBuilder<any, any>>,
        TOptProps = Pick<
            TProps,
            keyof {
                [k in keyof TProps as TProps[k] extends SchemaBuilder<
                    any,
                    infer TReq
                >
                    ? TReq extends false
                        ? k
                        : never
                    : never]: TProps[k];
            }
        >,
        TReqProps = Pick<
            TProps,
            keyof {
                [k in keyof TProps as TProps[k] extends SchemaBuilder<
                    any,
                    infer TReq
                >
                    ? TReq extends true
                        ? k
                        : never
                    : never]: TProps[k];
            }
        >
    >(
        props: TProps
    ): ObjectSchemaBuilder<
        TProperties & {
            [k in keyof TProps]: TProps[k];
        },
        true,
        undefined,
        TResult & {
            [k in keyof TOptProps]?: InferType<TOptProps[k]>;
        } & {
            [k in keyof TReqProps]: InferType<TReqProps[k]>;
        }
    >;

    /**
     * Adds all properties from the `schema` object schema to the current schema.
     * @param schema an instance of `ObjectSchemaBuilder`
     */
    public addProps<K extends ObjectSchemaBuilder<any, any, any, any>>(
        schema: K
    ): K extends ObjectSchemaBuilder<
        infer TProp,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer TReq,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer TExpType,
        infer TRes
    >
        ? ObjectSchemaBuilder<
              Omit<TProperties, keyof TProp> & {
                  [k in keyof TProp]: TProp[k];
              },
              TRequired,
              TExplicitType,
              Omit<TResult, keyof TRes> & Omit<TRes, keyof TResult>
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
    ): ObjectSchemaBuilder<
        Omit<TProperties, K>,
        TRequired,
        TExplicitType,
        Omit<TResult, K>
    >;
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
        TExplicitType,
        Omit<TResult, TProperty>
    >;
    /**
     * Removes all properties of `schema` from the current schema.
     * `Omit<TSchema, keyof TAnotherSchema>` as a good illustration
     * from the TS world.
     * @param schema schema builder to take properties from.
     */
    public omit<T>(schema: T): T extends ObjectSchemaBuilder<
        infer TProps,
        infer TRequired,
        infer TExplicitType,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer TExternalResult
    >
        ? ObjectSchemaBuilder<
              Omit<TProperties, keyof TProps>,
              TRequired,
              TExplicitType,
              Omit<TResult, keyof TProps>
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
    public intersect<T extends ObjectSchemaBuilder<any, any, any, any, any>>(
        schema: T
    ): T extends ObjectSchemaBuilder<
        infer TProps,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer TReq,
        infer TExplType,
        infer TRes,
        any
    >
        ? ObjectSchemaBuilder<
              Omit<TProperties, keyof TProps> & TProps,
              TRequired,
              TExplType,
              Omit<TResult, keyof TRes> & TRes
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
        {
            [k in keyof TProperties]: ReturnType<TProperties[k]['optional']>;
        },
        TRequired,
        TExplicitType,
        Partial<TResult>
    >;
    /**
     * Marks all properties from `properties` as optional in the schema.
     * @param properties list of property names (string) to make optional
     */
    public partial<K extends keyof TProperties>(
        properties: K[]
    ): ObjectSchemaBuilder<
        Omit<TProperties, K> & {
            [k in keyof TProperties as K extends k ? k : never]: ReturnType<
                TProperties[k]['optional']
            >;
        },
        TRequired,
        TExplicitType,
        Omit<TResult, K> & {
            [k in keyof TResult as K extends k ? k : never]?: TResult[k];
        }
    >;
    /**
     * Marks property `propName` as optional in the schema.
     * @param propName the name of the property (string).
     */
    public partial<TProperty extends keyof TProperties>(
        propName: TProperty
    ): ObjectSchemaBuilder<
        Omit<TProperties, TProperty> & {
            [k in TProperty]: ReturnType<TProperties[k]['optional']>;
        },
        TRequired,
        TExplicitType,
        Omit<TResult, TProperty> & {
            [k in keyof TResult as TProperty extends k
                ? k
                : never]?: TResult[k];
        }
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
    ): ObjectSchemaBuilder<
        Pick<TProperties, K>,
        TRequired,
        undefined,
        {
            [k in keyof TResult as K extends k ? k : never]: TResult[k];
        }
    >;
    /**
     * Returns new schema based on the current schema. This new schema
     * will consists only from properties which names are taken from the
     * `schema` object schema.
     * @param schema schema to take property names list from
     */
    public pick<K extends ObjectSchemaBuilder<any, any, any, any, any>>(
        schema: K
    ): K extends ObjectSchemaBuilder<
        infer TProps,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer T1,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer T2,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        infer T3
    >
        ? ObjectSchemaBuilder<
              {
                  [k in keyof TProps as k extends keyof TProperties
                      ? k
                      : never]: k extends keyof TProperties
                      ? TProperties[k]
                      : never;
              },
              TRequired,
              undefined,
              {
                  [k in keyof TProps as k extends keyof TProperties
                      ? k
                      : never]: k extends keyof TResult ? TResult[k] : never;
              }
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
    ): ObjectSchemaBuilder<
        Pick<TProperties, K>,
        TRequired,
        undefined,
        K extends keyof TResult ? Pick<TResult, K> : TResult
    >;

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
        Omit<TProperties, K> & {
            [k in K]: R;
        },
        TRequired,
        TExplicitType,
        R extends SchemaBuilder<
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            infer S,
            infer TReq
        >
            ? Omit<TResult, K> &
                  (TReq extends false
                      ? {
                            [k in K]?: InferType<R>;
                        }
                      : {
                            [k in K]: InferType<R>;
                        })
            : never
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
    public makePropOptional<
        K extends keyof TProperties,
        R = ReturnType<TProperties[K]['optional']>
    >(
        prop: K
    ): ObjectSchemaBuilder<
        Omit<TProperties, K> & {
            [k in K]: R;
        },
        TRequired,
        TExplicitType,
        R extends SchemaBuilder<
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            infer S,
            infer TReq
        >
            ? Omit<TResult, K> &
                  (TReq extends false
                      ? {
                            [k in K]?: InferType<R>;
                        }
                      : {
                            [k in K]: InferType<R>;
                        })
            : never
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
    public makePropRequired<
        K extends keyof TProperties,
        R = ReturnType<TProperties[K]['required']>
    >(
        prop: K
    ): ObjectSchemaBuilder<
        Omit<TProperties, K> & {
            [k in K]: R;
        },
        TRequired,
        TExplicitType,
        R extends SchemaBuilder<
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            infer S,
            infer TReq
        >
            ? Omit<TResult, K> &
                  (TReq extends false
                      ? {
                            [k in K]?: InferType<R>;
                        }
                      : {
                            [k in K]: InferType<R>;
                        })
            : never
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
        {
            [k in keyof TProperties]: ReturnType<TProperties[k]['optional']>;
        },
        TRequired,
        TExplicitType,
        Partial<TResult>
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
        {
            [k in keyof TProperties]: ReturnType<TProperties[k]['required']>;
        },
        TRequired,
        TExplicitType,
        {
            [k in keyof TResult]: NonNullable<TResult[k]>;
        }
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

/**
 * Defines a schema for empty object `{}`
 */
export function object(): ObjectSchemaBuilder<{}, true, undefined, {}>;

/**
 * Defines an object schema, properties definitions are takens from `props`.
 * @param props key/schema object map for schema's properties.
 */
export function object<TProps extends Record<string, SchemaBuilder<any, any>>>(
    props: TProps
): ObjectSchemaBuilder<
    {
        [k in keyof TProps]: TProps[k];
    },
    true,
    undefined,
    {
        [k in keyof TProps]: InferType<TProps[k]>;
    }
>;

export function object<TProps extends Record<string, SchemaBuilder<any, any>>>(
    props?: TProps
): ObjectSchemaBuilder<
    {
        [k in keyof TProps]: TProps[k];
    },
    true,
    undefined,
    {
        [k in keyof TProps as TProps[k] extends SchemaBuilder<
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            infer TRes,
            infer TReq
        >
            ? TReq extends false
                ? k
                : never
            : never]?: InferType<TProps[k]>;
    } & {
        [k in keyof TProps as TProps[k] extends SchemaBuilder<
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            infer TRes,
            infer TReq
        >
            ? TReq extends false
                ? never
                : k
            : never]: InferType<TProps[k]>;
    }
> {
    return ObjectSchemaBuilder.create({
        isRequired: true,
        properties: props
    }) as any;
}
