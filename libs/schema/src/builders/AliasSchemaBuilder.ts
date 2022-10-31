import { ISchemaBuilder, SchemaBuilder } from './SchemaBuilder.js';
import { InferType, Schema } from '../schema.js';
import { defaultSchemas } from '../defaultSchemas.js';
import { ISchemaRegistry } from '../index.js';

export interface IAliasSchemaBuilder<
    TSchemaName extends keyof TAliases,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TAliases extends Record<string, any> = never,
    TAliasesCompiledType = any,
    TExternalRegistryKeys extends Record<string, any> = {}
> extends ISchemaBuilder<TRequired, TNullable> {
    readonly type: 'alias';
    schemaName: TSchemaName;
    externalRegistry: ISchemaRegistry<TExternalRegistryKeys>;

    optional(): IAliasSchemaBuilder<
        TSchemaName,
        false,
        TNullable,
        TAliases,
        TAliasesCompiledType,
        TExternalRegistryKeys
    >;
    required(): IAliasSchemaBuilder<
        TSchemaName,
        true,
        TNullable,
        TAliases,
        TAliasesCompiledType,
        TExternalRegistryKeys
    >;
    nullable(): IAliasSchemaBuilder<
        TSchemaName,
        TRequired,
        true,
        TAliases,
        TAliasesCompiledType,
        TExternalRegistryKeys
    >;
    notNullable(): IAliasSchemaBuilder<
        TSchemaName,
        TRequired,
        false,
        TAliases,
        TAliasesCompiledType,
        TExternalRegistryKeys
    >;
}

class AliasSchemaBuilder<
        TSchemaName extends keyof TAliases,
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TAliases extends Record<string, any> = never,
        TAliasesCompiledType = any,
        TExternalRegistryKeys extends Record<string, any> = {}
    >
    extends SchemaBuilder<TRequired, TNullable>
    implements
        IAliasSchemaBuilder<
            TSchemaName,
            TRequired,
            TNullable,
            TAliases,
            TAliasesCompiledType,
            TExternalRegistryKeys
        >
{
    public clone(): this {
        return AliasSchemaBuilder.create(this._schema as any) as this;
    }

    public get _schema(): Schema {
        return Object.assign(
            {
                type: this.type,
                schemaName: this.schemaName,
                externalRegistry: this.externalRegistry
            },
            this.getCommonSchema()
        );
    }

    public static create<
        TSchemaName extends keyof TAliases,
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TAliases extends Record<string, any> = never,
        TAliasesCompiledType = any,
        TExternalRegistryKeys extends Record<string, any> = {}
    >(obj?: {
        schemaName: TSchemaName;
        isRequired: TRequired;
        isNullable: TNullable;
        externalRegistry?: ISchemaRegistry<TExternalRegistryKeys>;
    }): IAliasSchemaBuilder<
        TSchemaName,
        TRequired,
        TNullable,
        TAliases,
        TAliasesCompiledType,
        TExternalRegistryKeys
    > {
        return new AliasSchemaBuilder(obj as any) as any;
    }

    public schemaName: TSchemaName;
    public externalRegistry: ISchemaRegistry<TExternalRegistryKeys>;

    private constructor(obj: {
        schemaName: TSchemaName;
        isRequired: TRequired;
        isNullable: TNullable;
        externalRegistry?: ISchemaRegistry<any>;
    }) {
        super(obj);
        if (typeof obj === 'object' && obj) {
            if (typeof obj.schemaName === 'string') {
                this.schemaName = obj.schemaName;
            }
            if (
                typeof obj.externalRegistry === 'object' &&
                obj.externalRegistry
            ) {
                this.externalRegistry = obj.externalRegistry;
            }
        } else {
            const defaultSchema = defaultSchemas['alias'] as any;
            this.isRequired = defaultSchema.isRequired;
            this.isNullable = defaultSchema.isNullable;
        }
    }

    get type(): 'alias' {
        return 'alias';
    }

    optional(): IAliasSchemaBuilder<
        TSchemaName,
        false,
        TNullable,
        TAliases,
        TAliasesCompiledType,
        TExternalRegistryKeys
    > {
        if (this.isRequired === false) {
            return this as any;
        }

        return AliasSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: false
        });
    }

    required(): IAliasSchemaBuilder<
        TSchemaName,
        true,
        TNullable,
        TAliases,
        TAliasesCompiledType,
        TExternalRegistryKeys
    > {
        if (this.isRequired === true) {
            return this as any;
        }

        return AliasSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: true
        });
    }

    nullable(): IAliasSchemaBuilder<
        TSchemaName,
        TRequired,
        true,
        TAliases,
        TAliasesCompiledType,
        TExternalRegistryKeys
    > {
        if (this._isNullable === true) {
            return this as any;
        }
        return AliasSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: true
        });
    }

    notNullable(): IAliasSchemaBuilder<
        TSchemaName,
        TRequired,
        false,
        TAliases,
        TAliasesCompiledType,
        TExternalRegistryKeys
    > {
        if (this.isNullable === false) {
            return this as any;
        }
        return AliasSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: false
        });
    }
}

export const alias = <
    TSchemaName extends keyof TAliases,
    TAliases extends Record<string, any>,
    TAliasesCompiledType = InferType<TAliases[TSchemaName]>
>(
    schemaName: TSchemaName
) =>
    AliasSchemaBuilder.create<
        TSchemaName,
        true,
        false,
        TAliases,
        TAliasesCompiledType
    >({
        schemaName,
        isRequired: true,
        isNullable: false
    });

export const externalAlias = <
    TSchemaName extends keyof TAliases,
    TAliases extends Record<string, any>,
    TExternalSchemaRegistry extends ISchemaRegistry<TAliases>,
    TAliasesCompiledType = InferType<TAliases[TSchemaName]>
>(
    registry: TExternalSchemaRegistry,
    schemaName: TSchemaName
) =>
    AliasSchemaBuilder.create<
        TSchemaName,
        true,
        false,
        TAliases,
        TAliasesCompiledType
    >({
        schemaName,
        isRequired: true,
        isNullable: false,
        externalRegistry: registry
    });
