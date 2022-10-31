import { Schema, Validator } from '../schema.js';
import { ISchemaBuilder, SchemaBuilder } from './SchemaBuilder.js';
import { defaultSchemas } from '../defaultSchemas.js';

export interface IFunctionSchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false
> extends ISchemaBuilder<TRequired, TNullable> {
    optional(): IFunctionSchemaBuilder<false, TNullable>;
    required(): IFunctionSchemaBuilder<true, TNullable>;
    nullable(): IFunctionSchemaBuilder<TRequired, true>;
    notNullable(): IFunctionSchemaBuilder<TRequired, false>;
}

export class FunctionSchemaBuilder<
        TRequired extends boolean = true,
        TNullable extends boolean = false
    >
    extends SchemaBuilder<TRequired, TNullable>
    implements IFunctionSchemaBuilder<TRequired, TNullable>
{
    protected readonly type = 'function';

    public get _schema(): Schema {
        return Object.assign(
            {
                type: this.type
            },
            this.getCommonSchema()
        );
    }

    public clone(): this {
        return FunctionSchemaBuilder.create(this._schema as any) as this;
    }

    public static create<
        TRequired extends boolean = true,
        TNullable extends boolean = false
    >(obj?: {
        isRequired: TRequired;
        isNullable: TNullable;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
    }): IFunctionSchemaBuilder<TRequired, TNullable> {
        return new FunctionSchemaBuilder(obj as any);
    }

    private constructor(obj: {
        isRequired: TRequired;
        isNullable: TNullable;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
    }) {
        super(obj);
        if (typeof obj !== 'object' || !obj) {
            const defaultSchema = defaultSchemas['function'] as any;
            this.isRequired = defaultSchema.isRequired;
            this.isNullable = defaultSchema.isNullable;
        }
    }

    optional(): IFunctionSchemaBuilder<false, TNullable> {
        if (this.isRequired === false) {
            return this as IFunctionSchemaBuilder<false, TNullable>;
        }
        return FunctionSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: false
        });
    }

    required(): IFunctionSchemaBuilder<true, TNullable> {
        if (this.isRequired === true) {
            return this as IFunctionSchemaBuilder<true, TNullable>;
        }
        return FunctionSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: true
        });
    }

    nullable(): IFunctionSchemaBuilder<TRequired, true> {
        if (this.isNullable === true) {
            return this as IFunctionSchemaBuilder<TRequired, true>;
        }
        return FunctionSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: true
        });
    }

    notNullable(): IFunctionSchemaBuilder<TRequired, false> {
        if (this.isNullable === false) {
            return this as IFunctionSchemaBuilder<TRequired, false>;
        }
        return FunctionSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: false
        });
    }
}

export const func = (): IFunctionSchemaBuilder =>
    FunctionSchemaBuilder.create();
