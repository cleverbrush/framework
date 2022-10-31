import { ISchemaBuilder, SchemaBuilder } from './SchemaBuilder.js';
import { defaultSchemas } from '../defaultSchemas.js';
import {
    Schema,
    Validator,
    InferType,
    MakeOptional,
    MakeRequired,
    MakeNullable,
    MakeNotNullable
} from '../schema.js';

export interface IObjectSchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TNoUnknownProperties extends boolean = true,
    TProperties = {},
    TMapToType = undefined
> extends ISchemaBuilder<TRequired, TNullable> {
    optional(): IObjectSchemaBuilder<
        false,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    >;
    required(): IObjectSchemaBuilder<
        true,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    >;
    nullable(): IObjectSchemaBuilder<
        TRequired,
        true,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    >;
    notNullable(): IObjectSchemaBuilder<
        TRequired,
        false,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    >;
    addProps<T extends Record<string, any>>(
        val?: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties & T,
        TMapToType
    >;
    removeProp<T extends keyof TProperties>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        Omit<TProperties, T>,
        TMapToType
    >;
    canHaveUnknownProps(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        false,
        TProperties,
        TMapToType
    >;
    noUnknownProps(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        true,
        TProperties,
        TMapToType
    >;
    setPropPreprocessor<
        T extends keyof TProperties | '*',
        S = T extends keyof TProperties
            ?
                  | ((
                        value: any
                    ) =>
                        | undefined
                        | InferType<TProperties[T]>
                        | Promise<InferType<TProperties[T]>>)
                  | string
            : (value: InferType<this>) => void | Promise<void>
    >(
        property: T,
        validator: S
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    >;
    unsetPropPreprocessor<T extends keyof TProperties | '*'>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    >;
    clearPropsPreprocessors(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    >;
    makeAllPropsOptional<T extends keyof TProperties>(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        { [k in T]: MakeOptional<TProperties[k]> },
        TMapToType
    >;
    makePropOptional<T extends keyof TProperties>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        Omit<TProperties, T> & { [k in T]: MakeOptional<TProperties[k]> },
        TMapToType
    >;
    makePropRequired<T extends keyof TProperties>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        Omit<TProperties, T> & { [k in T]: MakeRequired<TProperties[k]> },
        TMapToType
    >;
    makePropNullable<T extends keyof TProperties>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        Omit<TProperties, T> & { [k in T]: MakeNullable<TProperties[k]> },
        TMapToType
    >;
    makePropNotNullable<T extends keyof TProperties>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        Omit<TProperties, T> & { [k in T]: MakeNotNullable<TProperties[k]> },
        TMapToType
    >;
    mapToType<T>(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        T
    >;
    clearMapToType(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        undefined
    >;
}

export class ObjectSchemaBuilder<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TNoUnknownProperties extends boolean = true,
        TProperties = {},
        TMapToType = undefined
    >
    extends SchemaBuilder<TRequired, TNullable>
    implements
        IObjectSchemaBuilder<
            TRequired,
            TNullable,
            TNoUnknownProperties,
            TProperties,
            TMapToType
        >
{
    protected readonly type = 'object';

    protected noUnknownProperties?: TNoUnknownProperties;
    protected properties?: TProperties;
    protected preprocessors?: {
        [S in keyof TProperties | '*']?: S extends keyof TProperties
            ?
                  | ((
                        value: any
                    ) =>
                        | undefined
                        | InferType<TProperties[S]>
                        | Promise<InferType<TProperties[S]>>)
                  | string
            : (value: InferType<TProperties>) => void | Promise<void>;
    };

    public clone(): this {
        return ObjectSchemaBuilder.create({
            isNullable: this._isNullable,
            isRequired: this._isRequired,
            noUnknownProperties: this.noUnknownProperties,
            properties: this.properties,
            preprocessor: this.preprocessor,
            preprocessors: this.preprocessors,
            validators: this.validators
        }) as any as this;
    }

    public get _schema(): Schema {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;
        return Object.assign(
            {
                type: this.type
            },
            this.getCommonSchema(),
            typeof that.properties !== 'undefined' && that.properties
                ? {
                      properties: Object.keys(that.properties).reduce(
                          (acc: any, curr) => {
                              if (!that.properties) return;
                              if (
                                  that.properties[curr] instanceof SchemaBuilder
                              ) {
                                  acc[curr] = that.properties[curr].clone();
                              } else {
                                  acc[curr] = that.properties[curr];
                              }
                              return acc;
                          },
                          {}
                      )
                  }
                : {},
            typeof that.noUnknownProperties !== 'undefined'
                ? { noUnknownProperties: that.noUnknownProperties }
                : {},
            typeof that.preprocessors !== 'undefined' && that.preprocessors
                ? {
                      preprocessors: {
                          ...that.preprocessors
                      }
                  }
                : {}
        );
    }

    private constructor(obj: {
        isRequired: TRequired;
        isNullable: TNullable;
        noUnknownProperties: TNoUnknownProperties;
        properties: TProperties;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
        preprocessors?: {
            [S in keyof TProperties | '*']?: S extends keyof TProperties
                ?
                      | ((
                            value: any
                        ) =>
                            | undefined
                            | InferType<TProperties[S]>
                            | Promise<InferType<TProperties[S]>>)
                      | string
                : (value: InferType<TProperties>) => void | Promise<void>;
        };
    }) {
        super(obj);
        if (typeof obj === 'object' && obj) {
            if (typeof obj.properties !== 'undefined') {
                this.properties = Object.keys(obj.properties).reduce(
                    (acc, curr) => {
                        if (obj.properties[curr] instanceof SchemaBuilder) {
                            acc[curr] = obj.properties[curr].clone();
                        } else {
                            acc[curr] = {
                                ...obj.properties[curr]
                            };
                        }
                        return acc;
                    },
                    {}
                ) as any;
            }
            if (typeof obj.preprocessors !== 'undefined') {
                this.preprocessors = { ...obj.preprocessors };
            }
            if (typeof obj.noUnknownProperties !== 'undefined') {
                this.noUnknownProperties = obj.noUnknownProperties;
            }
        } else {
            const defaultSchema = defaultSchemas['object'];
            this.isRequired = (defaultSchema as any).isRequired;
            this.isNullable = (defaultSchema as any).isNullable;
        }
    }

    public static create<
        TCRequired extends boolean = true,
        TCNullable extends boolean = false,
        TCNoUnknownProperties extends boolean = false,
        TCProperties = {},
        TMapToType = undefined
    >(obj?: {
        isRequired: TCRequired;
        isNullable: TCNullable;
        properties: TCProperties;
        noUnknownProperties: TCNoUnknownProperties;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
        preprocessors?: {
            [S in keyof TCProperties | '*']?: S extends keyof TCProperties
                ?
                      | ((
                            value: any
                        ) =>
                            | undefined
                            | InferType<TCProperties[S]>
                            | Promise<InferType<TCProperties[S]>>)
                      | string
                : (value: InferType<TCProperties>) => void | Promise<void>;
        };
    }): IObjectSchemaBuilder<
        TCRequired,
        TCNullable,
        TCNoUnknownProperties,
        TCProperties,
        TMapToType
    > {
        return new ObjectSchemaBuilder<
            TCRequired,
            TCNullable,
            TCNoUnknownProperties,
            TCProperties,
            TMapToType
        >(obj as any);
    }

    public canHaveUnknownProps(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        false,
        TProperties,
        TMapToType
    > {
        if (this.noUnknownProperties === false) {
            return this as IObjectSchemaBuilder<
                TRequired,
                TNullable,
                false,
                TProperties
            >;
        }
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            noUnknownProperties: false
        });
    }

    public noUnknownProps(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        true,
        TProperties,
        TMapToType
    > {
        if (this.noUnknownProperties === true) {
            return this as any;
        }
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            noUnknownProperties: true
        });
    }

    public optional(): IObjectSchemaBuilder<
        false,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    > {
        if (this.isRequired === false) {
            return this as any;
        }
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: false
        });
    }

    public required(): IObjectSchemaBuilder<
        true,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    > {
        if (this.isRequired === true) {
            return this as any;
        }
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: true
        });
    }

    public nullable(): IObjectSchemaBuilder<
        TRequired,
        true,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    > {
        if (this.isNullable === true) {
            return this as IObjectSchemaBuilder<
                TRequired,
                true,
                TNoUnknownProperties,
                TProperties
            >;
        }
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: true
        });
    }

    public notNullable(): IObjectSchemaBuilder<
        TRequired,
        false,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    > {
        if (this.isNullable === false) {
            return this as any;
        }
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: false
        });
    }

    public addProps<T extends Record<string, any>>(
        val?: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties & T,
        TMapToType
    > {
        if (typeof val === 'undefined') return this as any;
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            properties: {
                ...this.properties,
                ...val
            }
        });
    }

    public removeProp<T extends keyof TProperties>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        Omit<TProperties, T>,
        TMapToType
    > {
        if (typeof this.properties === 'undefined') {
            return this as any;
        }

        if (!(property in this.properties)) {
            return this as any;
        }

        const newProperties = {
            ...this.properties
        };

        delete newProperties[property];

        let newPreprocessors = this.preprocessors;
        if (
            typeof newPreprocessors !== 'undefined' &&
            property in newPreprocessors
        ) {
            if (Object.keys(newPreprocessors).length === 1) {
                newPreprocessors = undefined;
            } else {
                newPreprocessors = {
                    ...this.preprocessors
                } as any;
                delete (newPreprocessors as any)[property];
            }
        }
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            preprocessors: newPreprocessors,
            properties: newProperties
        });
    }

    public setPropPreprocessor<
        T extends keyof TProperties | '*',
        S = T extends keyof TProperties
            ?
                  | ((
                        value: any
                    ) =>
                        | undefined
                        | InferType<TProperties[T]>
                        | Promise<InferType<TProperties[T]>>)
                  | string
            : (value: InferType<T>) => void | Promise<void>
    >(
        property: T,
        validator: S
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    > {
        if (typeof this.preprocessors === 'undefined') {
            this.preprocessors = {
                [property]: validator
            } as any;
        } else {
            this.preprocessors = {
                ...this.preprocessors,
                [property]: validator
            };
        }
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            preprocessors: {
                ...this.preprocessors
            }
        });
    }

    public unsetPropPreprocessor<T extends keyof TProperties | '*'>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    > {
        if (
            typeof this.preprocessors === 'undefined' ||
            !(property in this.preprocessors)
        ) {
            return this;
        }
        let newPreprocessors;
        if (Object.keys(this.preprocessors).length === 1) {
            newPreprocessors = undefined;
        } else {
            newPreprocessors = {
                ...this.preprocessors
            };
            delete newPreprocessors[property];
        }
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            preprocessors: newPreprocessors
        });
    }

    public clearPropsPreprocessors(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        TMapToType
    > {
        if (typeof this.preprocessors === 'undefined') {
            return this;
        }
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            preprocessors: undefined
        });
    }

    public mapToType<T>(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        T
    > {
        return this as any;
    }

    public clearMapToType(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties,
        undefined
    > {
        return this as any;
    }

    public makeAllPropsOptional<
        T extends keyof TProperties
    >(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        { [k in T]: MakeOptional<TProperties[k]> },
        TMapToType
    > {
        let res = this;

        for (const prop in this.properties) {
            res = res.makePropOptional(prop) as any;
        }

        return res as any;
    }

    public makePropOptional<T extends keyof TProperties>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        Omit<TProperties, T> & { [k in T]: MakeOptional<TProperties[k]> },
        TMapToType
    > {
        if (typeof this.properties[property] === 'undefined')
            throw new Error(`Property ${property as string} does not exists`);
        if (this.properties[property] instanceof SchemaBuilder) {
            return ObjectSchemaBuilder.create({
                ...(this._schema as any),
                properties: {
                    ...this.properties,
                    [property]: (this.properties[property] as any).optional()
                }
            });
        } else {
            return ObjectSchemaBuilder.create({
                ...(this._schema as any),
                properties: {
                    ...this.properties,
                    [property]: {
                        ...this.properties[property],
                        isRequired: false
                    }
                }
            });
        }
    }

    public makePropRequired<T extends keyof TProperties>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        Omit<TProperties, T> & { [k in T]: MakeRequired<TProperties[k]> },
        TMapToType
    > {
        if (typeof this.properties[property] === 'undefined')
            throw new Error(`Property ${property as string} does not exists`);
        if (this.properties[property] instanceof SchemaBuilder) {
            return ObjectSchemaBuilder.create({
                ...(this._schema as any),
                properties: {
                    ...this.properties,
                    [property]: (this.properties[property] as any).required()
                }
            });
        } else {
            return ObjectSchemaBuilder.create({
                ...(this._schema as any),
                properties: {
                    ...this.properties,
                    [property]: {
                        ...this.properties[property],
                        isRequired: true
                    }
                }
            });
        }
    }

    public makePropNullable<T extends keyof TProperties>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        Omit<TProperties, T> & { [k in T]: MakeNullable<TProperties[k]> },
        TMapToType
    > {
        if (typeof this.properties[property] === 'undefined')
            throw new Error(`Property ${property as string} does not exists`);
        if (this.properties[property] instanceof SchemaBuilder) {
            return ObjectSchemaBuilder.create({
                ...(this._schema as any),
                properties: {
                    ...this.properties,
                    [property]: (this.properties[property] as any).nullable()
                }
            });
        } else {
            return ObjectSchemaBuilder.create({
                ...(this._schema as any),
                properties: {
                    ...this.properties,
                    [property]: {
                        ...this.properties[property],
                        isNullable: true
                    }
                }
            });
        }
    }

    public makePropNotNullable<T extends keyof TProperties>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        Omit<TProperties, T> & { [k in T]: MakeNotNullable<TProperties[k]> },
        TMapToType
    > {
        if (typeof this.properties[property] === 'undefined')
            throw new Error(`Property ${property as string} does not exists`);
        if (this.properties[property] instanceof SchemaBuilder) {
            return ObjectSchemaBuilder.create({
                ...(this._schema as any),
                properties: {
                    ...this.properties,
                    [property]: (this.properties[property] as any).notNullable()
                }
            });
        } else {
            return ObjectSchemaBuilder.create({
                ...(this._schema as any),
                properties: {
                    ...this.properties,
                    [property]: {
                        ...this.properties[property],
                        isNullable: false
                    }
                }
            });
        }
    }
}

export const object = <T>(
    properties?: T
): IObjectSchemaBuilder<
    true,
    false,
    true,
    T extends undefined ? {} : T,
    undefined
> =>
    typeof properties === 'undefined'
        ? ObjectSchemaBuilder.create()
        : (ObjectSchemaBuilder.create().addProps(properties) as any);
