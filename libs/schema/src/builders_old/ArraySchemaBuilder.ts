import { ISchemaBuilder, SchemaBuilder } from './SchemaBuilder.js';
import { Schema, Validator } from '../schema.js';
import { defaultSchemas } from '../defaultSchemas.js';

export interface IArraySchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TOfType extends Schema | undefined = undefined,
    TMaxLength extends number | undefined = undefined,
    TMinLength extends number | undefined = undefined
> extends ISchemaBuilder<TRequired, TNullable> {
    optional(): IArraySchemaBuilder<
        false,
        TNullable,
        TOfType,
        TMaxLength,
        TMinLength
    >;
    required(): IArraySchemaBuilder<
        true,
        TNullable,
        TOfType,
        TMaxLength,
        TMinLength
    >;
    ofType<T extends Schema>(
        schema: T
    ): IArraySchemaBuilder<TRequired, TNullable, T, TMaxLength, TMinLength>;
    nullable(): IArraySchemaBuilder<
        TRequired,
        true,
        TOfType,
        TMaxLength,
        TMinLength
    >;
    notNullable(): IArraySchemaBuilder<
        TRequired,
        false,
        TOfType,
        TMaxLength,
        TMinLength
    >;
    clearOfType(): IArraySchemaBuilder<
        TRequired,
        TNullable,
        undefined,
        TMaxLength,
        TMinLength
    >;

    maxLength<T extends number>(
        length: T
    ): IArraySchemaBuilder<TRequired, TNullable, TOfType, T, TMinLength>;
    clearMaxLength(): IArraySchemaBuilder<
        TRequired,
        TNullable,
        TOfType,
        undefined,
        TMinLength
    >;
    minLength<T extends number>(
        length: T
    ): IArraySchemaBuilder<TRequired, TNullable, TOfType, TMaxLength, T>;

    clearMinLength(): IArraySchemaBuilder<
        TRequired,
        TNullable,
        TOfType,
        TMaxLength,
        TMinLength
    >;
}

class ArraySchemaBuilder<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TOfType extends Schema | undefined = undefined,
        TMaxLength extends number | undefined = undefined,
        TMinLength extends number | undefined = undefined
    >
    extends SchemaBuilder<TRequired, TNullable>
    implements
        IArraySchemaBuilder<
            TRequired,
            TNullable,
            TOfType,
            TMaxLength,
            TMinLength
        >
{
    public clone(): this {
        return ArraySchemaBuilder.create(this._schema as any) as this;
    }

    public get _schema(): Schema {
        return Object.assign(
            {
                type: this.type
            },
            this.getCommonSchema(),
            typeof this._ofType !== 'undefined'
                ? {
                      ofType: this._ofType as any
                  }
                : {},
            typeof this._minLength !== 'undefined'
                ? { minLength: this._minLength }
                : {},
            typeof this._maxLength !== 'undefined'
                ? { maxLength: this._maxLength }
                : {}
        );
    }

    public static create<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TOfType extends Schema | undefined = undefined,
        TMaxLength extends number | undefined = undefined,
        TMinLength extends number | undefined = undefined
    >(obj?: {
        isRequired: TRequired;
        isNullable: TNullable;
        ofType?: TOfType;
        maxLength?: TMaxLength;
        minLength?: TMinLength;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
    }): IArraySchemaBuilder<
        TRequired,
        TNullable,
        TOfType,
        TMaxLength,
        TMinLength
    > {
        return new ArraySchemaBuilder(obj as any);
    }

    private constructor(obj: {
        isRequired: TRequired;
        isNullable: TNullable;
        ofType?: TOfType;
        maxLength?: TMaxLength;
        minLength?: TMinLength;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
    }) {
        super(obj);
        if (typeof obj === 'object' && obj) {
            if (typeof obj.ofType !== 'undefined') {
                this._ofType =
                    obj.ofType instanceof SchemaBuilder
                        ? obj.ofType.clone()
                        : { ...(obj.ofType as any) };
            }
            if (typeof obj.maxLength !== 'undefined') {
                this._maxLength = obj.maxLength;
            }
            if (typeof obj.minLength !== 'undefined') {
                this._minLength = obj.minLength;
            }
        } else {
            const defaultSchema = defaultSchemas['array'] as any;
            this.isRequired = defaultSchema.isRequired;
            this.isNullable = defaultSchema.isNullable;
        }
    }

    protected readonly type = 'array';

    protected _ofType?: TOfType;
    protected _maxLength?: TMaxLength;
    protected _minLength?: TMinLength;

    optional(): IArraySchemaBuilder<
        false,
        TNullable,
        TOfType,
        TMaxLength,
        TMinLength
    > {
        if (this.isRequired === false) {
            return this as IArraySchemaBuilder<
                false,
                TNullable,
                TOfType,
                TMaxLength,
                TMinLength
            >;
        }

        return ArraySchemaBuilder.create({
            ...(this._schema as any),
            isRequired: false
        });
    }

    required(): IArraySchemaBuilder<
        true,
        TNullable,
        TOfType,
        TMaxLength,
        TMinLength
    > {
        if (this.isRequired === true) {
            return this as IArraySchemaBuilder<
                true,
                TNullable,
                TOfType,
                TMaxLength,
                TMinLength
            >;
        }

        return ArraySchemaBuilder.create({
            ...(this._schema as any),
            isRequired: true
        });
    }

    nullable(): IArraySchemaBuilder<
        TRequired,
        true,
        TOfType,
        TMaxLength,
        TMinLength
    > {
        if (this._isNullable === true) {
            return this as IArraySchemaBuilder<
                TRequired,
                true,
                TOfType,
                TMaxLength,
                TMinLength
            >;
        }
        return ArraySchemaBuilder.create({
            ...(this._schema as any),
            isNullable: true
        });
    }

    notNullable(): IArraySchemaBuilder<
        TRequired,
        false,
        TOfType,
        TMaxLength,
        TMinLength
    > {
        if (this.isNullable === false) {
            return this as IArraySchemaBuilder<
                TRequired,
                false,
                TOfType,
                TMaxLength,
                TMinLength
            >;
        }
        return ArraySchemaBuilder.create({
            ...(this._schema as any),
            isNullable: false
        });
    }

    ofType<T extends Schema>(
        schema: T
    ): IArraySchemaBuilder<TRequired, TNullable, T, TMaxLength, TMinLength> {
        return ArraySchemaBuilder.create({
            ...(this._schema as any),
            ofType: schema
        });
    }

    clearOfType(): IArraySchemaBuilder<
        TRequired,
        TNullable,
        undefined,
        TMaxLength,
        TMinLength
    > {
        if (typeof this._ofType === 'undefined') {
            return this as IArraySchemaBuilder<
                TRequired,
                TNullable,
                undefined,
                TMaxLength,
                TMinLength
            >;
        }
        return ArraySchemaBuilder.create({
            ...(this._schema as any),
            ofType: undefined
        });
    }

    maxLength<T extends number>(
        length: T
    ): IArraySchemaBuilder<TRequired, TNullable, TOfType, T, TMinLength> {
        if ((this._maxLength as any) === length) {
            return this as any as IArraySchemaBuilder<
                TRequired,
                TNullable,
                TOfType,
                T,
                TMinLength
            >;
        }
        return ArraySchemaBuilder.create({
            ...(this._schema as any),
            maxLength: length
        });
    }

    clearMaxLength(): IArraySchemaBuilder<
        TRequired,
        TNullable,
        TOfType,
        undefined,
        TMinLength
    > {
        if (typeof this._maxLength === 'undefined') {
            return this as IArraySchemaBuilder<
                TRequired,
                TNullable,
                TOfType,
                undefined,
                TMinLength
            >;
        }
        return ArraySchemaBuilder.create({
            ...(this._schema as any),
            maxLength: undefined
        });
    }

    minLength<T extends number>(
        length: T
    ): IArraySchemaBuilder<TRequired, TNullable, TOfType, TMaxLength, T> {
        if ((this._minLength as any) === length) {
            return this as any as IArraySchemaBuilder<
                TRequired,
                TNullable,
                TOfType,
                TMaxLength,
                T
            >;
        }
        return ArraySchemaBuilder.create({
            ...(this._schema as any),
            minLength: length
        });
    }

    clearMinLength(): IArraySchemaBuilder<
        TRequired,
        TNullable,
        TOfType,
        TMaxLength,
        TMinLength
    > {
        if (typeof this._minLength === 'undefined') {
            return this as IArraySchemaBuilder<
                TRequired,
                TNullable,
                TOfType,
                TMaxLength,
                TMinLength
            >;
        }
        return ArraySchemaBuilder.create({
            ...(this._schema as any),
            minLength: undefined
        });
    }
}

export const array = () => ArraySchemaBuilder.create();
