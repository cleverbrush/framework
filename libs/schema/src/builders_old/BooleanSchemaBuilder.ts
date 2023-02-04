import { Schema, Validator } from '../schema.js';
import { ISchemaBuilder, SchemaBuilder } from './SchemaBuilder.js';
import { defaultSchemas } from '../defaultSchemas.js';

export interface IBooleanSchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TEqualsTo extends boolean | undefined = undefined
> extends ISchemaBuilder<TRequired, TNullable> {
    equals<T extends boolean>(
        val: T
    ): IBooleanSchemaBuilder<TRequired, TNullable, T>;
    clearEqualsTo(): IBooleanSchemaBuilder<TRequired, TNullable, undefined>;
    optional(): IBooleanSchemaBuilder<false, TNullable, TEqualsTo>;
    required(): IBooleanSchemaBuilder<true, TNullable, TEqualsTo>;
    nullable(): IBooleanSchemaBuilder<TRequired, true, TEqualsTo>;
    notNullable(): IBooleanSchemaBuilder<TRequired, false, TEqualsTo>;
}

export class BooleanSchemaBuilder<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TEqualsTo extends boolean | undefined = undefined
    >
    extends SchemaBuilder<TRequired, TNullable>
    implements IBooleanSchemaBuilder<TRequired, TNullable, TEqualsTo>
{
    protected readonly type = 'boolean';

    public get _schema(): Schema {
        return Object.assign(
            {
                type: this.type
            },
            this.getCommonSchema(),
            typeof this._equals !== 'undefined' ? { equals: this._equals } : {}
        );
    }

    public clone(): this {
        return BooleanSchemaBuilder.create(this._schema as any) as this;
    }

    public static create<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TEqualsTo extends boolean | undefined = undefined
    >(obj?: {
        isRequired: TRequired;
        isNullable: TNullable;
        equals?: TEqualsTo;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
    }): IBooleanSchemaBuilder<TRequired, TNullable, TEqualsTo> {
        return new BooleanSchemaBuilder(obj as any);
    }

    private constructor(obj: {
        isRequired: TRequired;
        isNullable: TNullable;
        equals: TEqualsTo;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
    }) {
        super(obj);
        if (typeof obj === 'object' && obj) {
            if (typeof obj.equals !== 'undefined') {
                this._equals = obj.equals;
            }
        } else {
            const defaultSchema = defaultSchemas['boolean'] as any;
            this.isRequired = defaultSchema.isRequired;
            this.isNullable = defaultSchema.isNullable;
        }
    }

    protected _equals?: TEqualsTo;

    equals<T extends boolean>(
        val: T
    ): IBooleanSchemaBuilder<TRequired, TNullable, T> {
        if ((this._equals as any) === val) {
            return this as any as IBooleanSchemaBuilder<
                TRequired,
                TNullable,
                T
            >;
        }
        return BooleanSchemaBuilder.create({
            ...(this._schema as any),
            equals: val
        });
    }

    clearEqualsTo(): IBooleanSchemaBuilder<TRequired, TNullable, undefined> {
        if (typeof this._equals === 'undefined') {
            return this as IBooleanSchemaBuilder<
                TRequired,
                TNullable,
                undefined
            >;
        }
        return BooleanSchemaBuilder.create({
            ...(this._schema as any),
            equals: undefined
        });
    }

    optional(): IBooleanSchemaBuilder<false, TNullable, TEqualsTo> {
        if (this.isRequired === false) {
            return this as IBooleanSchemaBuilder<false, TNullable, TEqualsTo>;
        }
        return BooleanSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: false
        });
    }

    required(): IBooleanSchemaBuilder<true, TNullable, TEqualsTo> {
        if (this.isRequired === true) {
            return this as IBooleanSchemaBuilder<true, TNullable, TEqualsTo>;
        }
        return BooleanSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: true
        });
    }

    nullable(): IBooleanSchemaBuilder<TRequired, true, TEqualsTo> {
        if (this.isNullable === true) {
            return this as IBooleanSchemaBuilder<TRequired, true, TEqualsTo>;
        }
        return BooleanSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: true
        });
    }

    notNullable(): IBooleanSchemaBuilder<TRequired, false, TEqualsTo> {
        if (this.isNullable === false) {
            return this as IBooleanSchemaBuilder<TRequired, false, TEqualsTo>;
        }
        return BooleanSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: false
        });
    }
}

export const boolean = (): IBooleanSchemaBuilder =>
    BooleanSchemaBuilder.create();
