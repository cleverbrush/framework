import { Schema, Validator } from '../schema.js';
import { ISchemaBuilder, SchemaBuilder } from './SchemaBuilder.js';
import { defaultSchemas } from '../defaultSchemas.js';

export interface IFunctionSchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TMapToType = undefined
> extends ISchemaBuilder<TRequired, TNullable> {
    optional(): IFunctionSchemaBuilder<false, TNullable, TMapToType>;
    required(): IFunctionSchemaBuilder<true, TNullable, TMapToType>;
    nullable(): IFunctionSchemaBuilder<TRequired, true, TMapToType>;
    notNullable(): IFunctionSchemaBuilder<TRequired, false, TMapToType>;
    mapToType<T>(): IFunctionSchemaBuilder<TRequired, TNullable, T>;
}

export class FunctionSchemaBuilder<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TMapToType = undefined
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

    public mapToType<T>(): IFunctionSchemaBuilder<TRequired, TNullable, T> {
        return this as any;
    }

    public static create<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TMapToType = undefined
    >(obj?: {
        isRequired: TRequired;
        isNullable: TNullable;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
    }): IFunctionSchemaBuilder<TRequired, TNullable, TMapToType> {
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

    optional(): IFunctionSchemaBuilder<false, TNullable, TMapToType> {
        if (this.isRequired === false) {
            return this as any;
        }
        return FunctionSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: false
        });
    }

    required(): IFunctionSchemaBuilder<true, TNullable, TMapToType> {
        if (this.isRequired === true) {
            return this as any;
        }
        return FunctionSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: true
        });
    }

    nullable(): IFunctionSchemaBuilder<TRequired, true, TMapToType> {
        if (this.isNullable === true) {
            return this as any;
        }
        return FunctionSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: true
        });
    }

    notNullable(): IFunctionSchemaBuilder<TRequired, false, TMapToType> {
        if (this.isNullable === false) {
            return this as any;
        }
        return FunctionSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: false
        });
    }
}

export const func = (): IFunctionSchemaBuilder =>
    FunctionSchemaBuilder.create();
