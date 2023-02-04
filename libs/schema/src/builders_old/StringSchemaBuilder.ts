import { ISchemaBuilder, SchemaBuilder } from './SchemaBuilder.js';
import { Schema, Validator } from '../schema.js';
import { defaultSchemas } from '../defaultSchemas.js';

export interface IStringSchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TMinLength extends number | undefined = undefined,
    TMaxLength extends number | undefined = undefined,
    TEqualsTo extends string | undefined = undefined
> extends ISchemaBuilder<TRequired, TNullable> {
    optional(): IStringSchemaBuilder<
        false,
        TNullable,
        TMinLength,
        TMaxLength,
        TEqualsTo
    >;
    required(): IStringSchemaBuilder<
        true,
        TNullable,
        TMinLength,
        TMaxLength,
        TEqualsTo
    >;
    nullable(): IStringSchemaBuilder<
        TRequired,
        true,
        TMinLength,
        TMaxLength,
        TEqualsTo
    >;
    notNullable(): IStringSchemaBuilder<
        TRequired,
        false,
        TMinLength,
        TMaxLength,
        TEqualsTo
    >;
    minLength<K extends number>(
        val: K
    ): IStringSchemaBuilder<TRequired, TNullable, K, TMaxLength, TEqualsTo>;
    clearMinLength(): IStringSchemaBuilder<
        TRequired,
        TNullable,
        undefined,
        TMaxLength,
        TEqualsTo
    >;
    maxLength<K extends number>(
        val: K
    ): IStringSchemaBuilder<TRequired, TNullable, TMinLength, K, TEqualsTo>;
    clearMaxLength(): IStringSchemaBuilder<
        TRequired,
        TNullable,
        TMinLength,
        undefined,
        TEqualsTo
    >;
    equals<T extends string>(
        val: T
    ): IStringSchemaBuilder<TRequired, TNullable, TMinLength, TMaxLength, T>;
    clearEquals(): IStringSchemaBuilder<
        TRequired,
        TNullable,
        TMinLength,
        TMaxLength,
        undefined
    >;
}

class StringSchemaBuilder<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TMinLength extends number | undefined = undefined,
        TMaxLength extends number | undefined = undefined,
        TEqualsTo extends string | undefined = undefined
    >
    extends SchemaBuilder<TRequired, TNullable>
    implements
        IStringSchemaBuilder<
            TRequired,
            TNullable,
            TMinLength,
            TMaxLength,
            TEqualsTo
        >
{
    protected _minLength?: TMinLength;
    protected _maxLength?: TMaxLength;
    protected _equals?: TEqualsTo;

    protected readonly type = 'string';

    public clone(): this {
        return StringSchemaBuilder.create(this._schema as any) as this;
    }

    public get _schema(): Schema {
        return Object.assign(
            {
                type: this.type
            },
            this.getCommonSchema(),
            typeof this._minLength !== 'undefined'
                ? { minLength: this._minLength }
                : {},
            typeof this._maxLength !== 'undefined'
                ? { maxLength: this._maxLength }
                : {},
            typeof this._equals !== 'undefined' ? { equals: this._equals } : {}
        );
    }

    public optional(): IStringSchemaBuilder<
        false,
        TNullable,
        TMinLength,
        TMaxLength,
        TEqualsTo
    > {
        if (this.isRequired === false) {
            return this as IStringSchemaBuilder<
                false,
                TNullable,
                TMinLength,
                TMaxLength,
                TEqualsTo
            >;
        }
        return StringSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: false
        });
    }

    public required(): IStringSchemaBuilder<
        true,
        TNullable,
        TMinLength,
        TMaxLength,
        TEqualsTo
    > {
        if (this.isRequired === true) {
            return this as any as IStringSchemaBuilder<
                true,
                TNullable,
                TMinLength,
                TMaxLength,
                TEqualsTo
            >;
        }

        return StringSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: true
        });
    }

    public nullable(): IStringSchemaBuilder<
        TRequired,
        true,
        TMinLength,
        TMaxLength,
        TEqualsTo
    > {
        if (this.isNullable === true) {
            return this as any as IStringSchemaBuilder<
                TRequired,
                true,
                TMinLength,
                TMaxLength,
                TEqualsTo
            >;
        }
        return StringSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: true
        });
    }

    public notNullable(): IStringSchemaBuilder<
        TRequired,
        false,
        TMinLength,
        TMaxLength,
        TEqualsTo
    > {
        if (this.isNullable === false) {
            return this as any as IStringSchemaBuilder<
                TRequired,
                false,
                TMinLength,
                TMaxLength,
                TEqualsTo
            >;
        }
        return StringSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: false
        });
    }

    public minLength<K extends number>(
        val: K
    ): IStringSchemaBuilder<TRequired, TNullable, K, TMaxLength, TEqualsTo> {
        if ((this._minLength as any) === val) {
            return this as any as IStringSchemaBuilder<
                TRequired,
                TNullable,
                K,
                TMaxLength,
                TEqualsTo
            >;
        }
        return StringSchemaBuilder.create({
            ...(this._schema as any),
            minLength: val
        });
    }

    public clearMinLength(): IStringSchemaBuilder<
        TRequired,
        TNullable,
        undefined,
        TMaxLength,
        TEqualsTo
    > {
        if (typeof this._minLength === 'undefined') {
            return this as any as IStringSchemaBuilder<
                TRequired,
                TNullable,
                undefined,
                TMaxLength,
                TEqualsTo
            >;
        }
        return StringSchemaBuilder.create({
            ...(this._schema as any),
            minLength: undefined
        });
    }

    public maxLength<K extends number>(
        val: K
    ): IStringSchemaBuilder<TRequired, TNullable, TMinLength, K, TEqualsTo> {
        if ((this._maxLength as any) === val) {
            return this as any as IStringSchemaBuilder<
                TRequired,
                TNullable,
                TMinLength,
                K,
                TEqualsTo
            >;
        }
        return StringSchemaBuilder.create({
            ...(this._schema as any),
            maxLength: val
        });
    }

    public clearMaxLength(): IStringSchemaBuilder<
        TRequired,
        TNullable,
        TMinLength,
        undefined,
        TEqualsTo
    > {
        if (typeof this._maxLength === 'undefined') {
            return this as IStringSchemaBuilder<
                TRequired,
                TNullable,
                TMinLength,
                undefined,
                TEqualsTo
            >;
        }
        return StringSchemaBuilder.create({
            ...(this._schema as any),
            maxLength: undefined
        });
    }

    public equals<T extends string>(
        val: T
    ): IStringSchemaBuilder<TRequired, TNullable, TMinLength, TMaxLength, T> {
        if ((this._equals as any) === val) {
            return this as any as IStringSchemaBuilder<
                TRequired,
                TNullable,
                TMinLength,
                TMaxLength,
                T
            >;
        }

        return StringSchemaBuilder.create({
            ...(this._schema as any),
            equals: val as T
        });
    }

    public clearEquals(): IStringSchemaBuilder<
        TRequired,
        TNullable,
        TMinLength,
        TMaxLength,
        undefined
    > {
        if (typeof this._equals === 'undefined') {
            return this as IStringSchemaBuilder<
                TRequired,
                TNullable,
                TMinLength,
                TMaxLength,
                undefined
            >;
        }
        return StringSchemaBuilder.create({
            ...(this._schema as any),
            equals: undefined
        });
    }

    public static create<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TMinLength extends number | undefined = undefined,
        TMaxLength extends number | undefined = undefined,
        TEqualsTo extends string | undefined = undefined
    >(obj?: {
        isRequired: TRequired;
        isNullable: TNullable;
        minLength?: TMinLength;
        maxLength?: TMaxLength;
        equals?: TEqualsTo;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
    }): IStringSchemaBuilder<
        TRequired,
        TNullable,
        TMinLength,
        TMaxLength,
        TEqualsTo
    > {
        return new StringSchemaBuilder(obj as any);
    }

    private constructor(obj: {
        isRequired: TRequired;
        isNullable: TNullable;
        minLength: TMinLength;
        maxLength: TMaxLength;
        equals: TEqualsTo;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
    }) {
        super(obj);
        if (typeof obj === 'object' && obj) {
            if (typeof obj.minLength !== 'undefined') {
                this._minLength = obj.minLength;
            }
            if (typeof obj.maxLength !== 'undefined') {
                this._maxLength = obj.maxLength;
            }
            if (typeof obj.equals !== 'undefined') {
                this._equals = obj.equals;
            }
        } else {
            const defaultSchema = defaultSchemas['string'] as any;
            this.isRequired = defaultSchema.isRequired;
            this.isNullable = defaultSchema.isNullable;
        }
    }
}

export const string = <T extends string | undefined = undefined>(
    equals?: T
): IStringSchemaBuilder<
    true,
    false,
    undefined,
    undefined,
    T extends undefined ? undefined : T
> => {
    const res = StringSchemaBuilder.create();
    return typeof equals === 'string' ? res.equals(equals) : res;
};
