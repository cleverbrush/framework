import { ISchemaBuilder, SchemaBuilder } from './SchemaBuilder.js';
import { defaultSchemas } from '../defaultSchemas.js';
import { Schema, Validator, InferType } from '../schema.js';

export interface IObjectSchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TNoUnknownProperties extends boolean = false,
    // @ts-ignore
    TProperties = {}
> extends ISchemaBuilder<TRequired, TNullable> {
    readonly type: 'object';
    noUnknownProperties?: TNoUnknownProperties;
    properties?: TProperties;
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
    optional(): IObjectSchemaBuilder<
        false,
        TNullable,
        TNoUnknownProperties,
        TProperties
    >;
    required(): IObjectSchemaBuilder<
        true,
        TNullable,
        TNoUnknownProperties,
        TProperties
    >;
    nullable(): IObjectSchemaBuilder<
        TRequired,
        true,
        TNoUnknownProperties,
        TProperties
    >;
    notNullable(): IObjectSchemaBuilder<
        TRequired,
        false,
        TNoUnknownProperties,
        TProperties
    >;
    hasProperties<T extends Record<string, any>>(
        val?: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties & T
    >;
    removeProperty<T extends keyof TProperties>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        Omit<TProperties, T>
    >;
    canHaveUnknownProperties(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        false,
        TProperties
    >;
    shouldNotHaveUnknownProperties(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        true,
        TProperties
    >;
    addFieldPreprocessor<
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
        TProperties
    >;
    removeFieldPreprocessor<T extends keyof TProperties | '*'>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties
    >;
    clearFieldPreprocessors(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties
    >;
}

export class ObjectSchemaBuilder<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TNoUnknownProperties extends boolean = false,
        TProperties = {}
    >
    extends SchemaBuilder<TRequired, TNullable>
    implements
        IObjectSchemaBuilder<
            TRequired,
            TNullable,
            TNoUnknownProperties,
            TProperties
        >
{
    get type(): 'object' {
        return 'object';
    }
    noUnknownProperties?: TNoUnknownProperties;
    properties?: TProperties;
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

    public clone(): this {
        return ObjectSchemaBuilder.create(this._schema as any) as any as this;
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
                                  acc[curr] = (
                                      that.properties[
                                          curr
                                      ] as any as SchemaBuilder
                                  ).clone()._schema;
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
                            acc[curr] = (
                                obj.properties[curr] as SchemaBuilder
                            ).clone();
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
        // @ts-ignore
        TCProperties = {}
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
        TCProperties
    > {
        return new ObjectSchemaBuilder<
            TCRequired,
            TCNullable,
            TCNoUnknownProperties,
            TCProperties
        >(obj as any);
    }

    public canHaveUnknownProperties(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        false,
        TProperties
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

    public shouldNotHaveUnknownProperties(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        true,
        TProperties
    > {
        if (this.noUnknownProperties === true) {
            return this as IObjectSchemaBuilder<
                TRequired,
                TNullable,
                true,
                TProperties
            >;
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
        TProperties
    > {
        if (this.isRequired === false) {
            return this as IObjectSchemaBuilder<
                false,
                TNullable,
                TNoUnknownProperties,
                TProperties
            >;
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
        TProperties
    > {
        if (this.isRequired === true) {
            return this as IObjectSchemaBuilder<
                true,
                TNullable,
                TNoUnknownProperties,
                TProperties
            >;
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
        TProperties
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
        TProperties
    > {
        if (this.isNullable === false) {
            return this as IObjectSchemaBuilder<
                TRequired,
                false,
                TNoUnknownProperties,
                TProperties
            >;
        }
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: false
        });
    }

    public hasProperties<T extends Record<string, any>>(
        val?: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties & T
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

    public removeProperty<T extends keyof TProperties>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        Omit<TProperties, T>
    > {
        if (typeof this.properties === 'undefined') {
            return this as any as IObjectSchemaBuilder<
                TRequired,
                TNullable,
                TNoUnknownProperties,
                Omit<TProperties, T>
            >;
        }

        if (!(property in this.properties)) {
            return this as any as IObjectSchemaBuilder<
                TRequired,
                TNullable,
                TNoUnknownProperties,
                Omit<TProperties, T>
            >;
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

    public addFieldPreprocessor<
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
        TProperties
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

    public removeFieldPreprocessor<T extends keyof TProperties | '*'>(
        property: T
    ): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties
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

    public clearFieldPreprocessors(): IObjectSchemaBuilder<
        TRequired,
        TNullable,
        TNoUnknownProperties,
        TProperties
    > {
        if (typeof this.preprocessors === 'undefined') {
            return this;
        }
        return ObjectSchemaBuilder.create({
            ...(this._schema as any),
            preprocessors: undefined
        });
    }
}

// TODO: use with a new TS version (seems to work with TS v4.8-beta)
// export const object = <T extends Record<string, any>>(
//     properties?: T
// ): T extends undefined
//     ? IObjectSchemaBuilder
//     : IObjectSchemaBuilder<true, false, T> =>
//     typeof properties === 'undefined'
//         ? ObjectSchemaBuilder.create()
//         : (ObjectSchemaBuilder.create().addProperties(properties) as any);

export const object = (): IObjectSchemaBuilder => ObjectSchemaBuilder.create();
