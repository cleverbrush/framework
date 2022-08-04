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
    type: 'string';
    minLength?: TMinLength;
    maxLength?: TMaxLength;
    equals?: TEqualsTo;
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
    hasMinLength<K extends number>(
        val: K
    ): IStringSchemaBuilder<TRequired, TNullable, K, TMaxLength, TEqualsTo>;
    clearMinLength(): IStringSchemaBuilder<
        TRequired,
        TNullable,
        undefined,
        TMaxLength,
        TEqualsTo
    >;
    hasMaxLength<K extends number>(
        val: K
    ): IStringSchemaBuilder<TRequired, TNullable, TMinLength, K, TEqualsTo>;
    clearMaxLength(): IStringSchemaBuilder<
        TRequired,
        TNullable,
        TMinLength,
        undefined,
        TEqualsTo
    >;
    equalsTo<T extends string>(
        val: T
    ): IStringSchemaBuilder<TRequired, TNullable, TMinLength, TMaxLength, T>;
    clearEqualsTo(): IStringSchemaBuilder<
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
    public minLength?: TMinLength;
    public maxLength?: TMaxLength;
    public equals?: TEqualsTo;

    public get type(): 'string' {
        return 'string';
    }

    public clone(): this {
        return StringSchemaBuilder.create(this._schema as any) as this;
    }

    public get _schema(): Schema {
        return Object.assign(
            {
                type: this.type
            },
            this.getCommonSchema(),
            typeof this.minLength !== 'undefined'
                ? { minLength: this.minLength }
                : {},
            typeof this.maxLength !== 'undefined'
                ? { maxLength: this.maxLength }
                : {},
            typeof this.equals !== 'undefined' ? { equals: this.equals } : {}
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

    public hasMinLength<K extends number>(
        val: K
    ): IStringSchemaBuilder<TRequired, TNullable, K, TMaxLength, TEqualsTo> {
        if ((this.minLength as any) === val) {
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
        if (typeof this.minLength === 'undefined') {
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

    public hasMaxLength<K extends number>(
        val: K
    ): IStringSchemaBuilder<TRequired, TNullable, TMinLength, K, TEqualsTo> {
        if ((this.maxLength as any) === val) {
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
        if (typeof this.maxLength === 'undefined') {
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

    public equalsTo<T extends string>(
        val: T
    ): IStringSchemaBuilder<TRequired, TNullable, TMinLength, TMaxLength, T> {
        if ((this.equals as any) === val) {
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

    public clearEqualsTo(): IStringSchemaBuilder<
        TRequired,
        TNullable,
        TMinLength,
        TMaxLength,
        undefined
    > {
        if (typeof this.equals === 'undefined') {
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
                this.minLength = obj.minLength;
            }
            if (typeof obj.maxLength !== 'undefined') {
                this.maxLength = obj.maxLength;
            }
            if (typeof obj.equals !== 'undefined') {
                this.equals = obj.equals;
            }
        } else {
            const defaultSchema = defaultSchemas['string'] as any;
            this.isRequired = defaultSchema.isRequired;
            this.isNullable = defaultSchema.isNullable;
        }
    }
}

export const string = () => StringSchemaBuilder.create();
