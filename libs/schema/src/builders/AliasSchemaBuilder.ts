import { ISchemaBuilder, SchemaBuilder } from './SchemaBuilder.js';
import { Schema } from '../schema.js';
import { defaultSchemas } from '../defaultSchemas.js';

export interface IAliasSchemaBuilder<
    TSchemaName extends keyof TAliases,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TAliases extends Record<string, any> = never
> extends ISchemaBuilder<TRequired, TNullable> {
    readonly type: 'alias';
    schemaName: TSchemaName;

    optional(): IAliasSchemaBuilder<TSchemaName, false, TNullable, TAliases>;
    required(): IAliasSchemaBuilder<TSchemaName, true, TNullable, TAliases>;
    nullable(): IAliasSchemaBuilder<TSchemaName, TRequired, true, TAliases>;
    notNullable(): IAliasSchemaBuilder<TSchemaName, TRequired, false, TAliases>;
}

class AliasSchemaBuilder<
        TSchemaName extends keyof TAliases,
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TAliases extends Record<string, any> = never
    >
    extends SchemaBuilder<TRequired, TNullable>
    implements IAliasSchemaBuilder<TSchemaName, TRequired, TNullable, TAliases>
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
        TAliases extends Record<string, any> = never
    >(obj?: {
        schemaName: TSchemaName;
        isRequired: TRequired;
        isNullable: TNullable;
    }): IAliasSchemaBuilder<TSchemaName, TRequired, TNullable, TAliases> {
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

    optional(): IAliasSchemaBuilder<TSchemaName, false, TNullable, TAliases> {
        if (this.isRequired === false) {
            return this as IAliasSchemaBuilder<
                TSchemaName,
                false,
                TNullable,
                TAliases
            >;
        }

        return AliasSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: false
        }) as IAliasSchemaBuilder<TSchemaName, false, TNullable, TAliases>;
    }

    required(): IAliasSchemaBuilder<TSchemaName, true, TNullable, TAliases> {
        if (this.isRequired === true) {
            return this as IAliasSchemaBuilder<
                TSchemaName,
                true,
                TNullable,
                TAliases
            >;
        }

        return AliasSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: true
        }) as IAliasSchemaBuilder<TSchemaName, true, TNullable, TAliases>;
    }

    nullable(): IAliasSchemaBuilder<TSchemaName, TRequired, true, TAliases> {
        if (this._isNullable === true) {
            return this as IAliasSchemaBuilder<
                TSchemaName,
                TRequired,
                true,
                TAliases
            >;
        }
        return AliasSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: true
        }) as IAliasSchemaBuilder<TSchemaName, TRequired, true, TAliases>;
    }

    notNullable(): IAliasSchemaBuilder<
        TSchemaName,
        TRequired,
        false,
        TAliases
    > {
        if (this.isNullable === false) {
            return this as IAliasSchemaBuilder<
                TSchemaName,
                TRequired,
                false,
                TAliases
            >;
        }
        return AliasSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: false
        }) as IAliasSchemaBuilder<TSchemaName, TRequired, false, TAliases>;
    }
}

export const alias = <
    TSchemaName extends keyof TAliases,
    TAliases extends Record<string, any>
>(
    schemaName: TSchemaName
) =>
    AliasSchemaBuilder.create<TSchemaName, true, false, TAliases>({
        schemaName,
        isRequired: true,
        isNullable: false
    });
