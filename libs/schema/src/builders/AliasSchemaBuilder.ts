import { ISchemaBuilder, SchemaBuilder } from './SchemaBuilder.js';
import { InferType, Schema } from '../schema.js';
import { defaultSchemas } from '../defaultSchemas.js';

export interface IAliasSchemaBuilder<
    TSchemaName extends keyof TAliases,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TAliases extends Record<string, any> = never,
    TAliasesCompiledType = any
> extends ISchemaBuilder<TRequired, TNullable> {
    readonly type: 'alias';
    schemaName: TSchemaName;

    optional(): IAliasSchemaBuilder<
        TSchemaName,
        false,
        TNullable,
        TAliases,
        TAliasesCompiledType
    >;
    required(): IAliasSchemaBuilder<
        TSchemaName,
        true,
        TNullable,
        TAliases,
        TAliasesCompiledType
    >;
    nullable(): IAliasSchemaBuilder<
        TSchemaName,
        TRequired,
        true,
        TAliases,
        TAliasesCompiledType
    >;
    notNullable(): IAliasSchemaBuilder<
        TSchemaName,
        TRequired,
        false,
        TAliases,
        TAliasesCompiledType
    >;
}

class AliasSchemaBuilder<
        TSchemaName extends keyof TAliases,
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TAliases extends Record<string, any> = never,
        TAliasesCompiledType = any
    >
    extends SchemaBuilder<TRequired, TNullable>
    implements
        IAliasSchemaBuilder<
            TSchemaName,
            TRequired,
            TNullable,
            TAliases,
            TAliasesCompiledType
        >
{
    public clone(): this {
        return AliasSchemaBuilder.create(this._schema as any) as this;
    }

    public get _schema(): Schema {
        return Object.assign(
            {
                type: this.type,
                schemaName: this.schemaName
            },
            this.getCommonSchema()
        );
    }

    public static create<
        TSchemaName extends keyof TAliases,
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TAliases extends Record<string, any> = never,
        TAliasesCompiledType = any
    >(obj?: {
        schemaName: TSchemaName;
        isRequired: TRequired;
        isNullable: TNullable;
    }): IAliasSchemaBuilder<
        TSchemaName,
        TRequired,
        TNullable,
        TAliases,
        TAliasesCompiledType
    > {
        return new AliasSchemaBuilder(obj as any);
    }

    public schemaName: TSchemaName;

    private constructor(obj: {
        schemaName: TSchemaName;
        isRequired: TRequired;
        isNullable: TNullable;
    }) {
        super(obj);
        if (typeof obj === 'object' && obj) {
            if (typeof obj.schemaName === 'string') {
                this.schemaName = obj.schemaName;
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
        TAliasesCompiledType
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
        TAliasesCompiledType
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
        TAliasesCompiledType
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
        TAliasesCompiledType
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
