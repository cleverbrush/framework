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
    readonly type: 'array';
    ofType?: TOfType;
    maxLength?: TMaxLength;
    minLength?: TMinLength;
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
    hasElementOfType<T extends Schema>(
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
    clearElementType(): IArraySchemaBuilder<
        TRequired,
        TNullable,
        undefined,
        TMaxLength,
        TMinLength
    >;

    hasMaxLength<T extends number>(
        length: T
    ): IArraySchemaBuilder<TRequired, TNullable, TOfType, T, TMinLength>;
    clearMaxLength(): IArraySchemaBuilder<
        TRequired,
        TNullable,
        TOfType,
        undefined,
        TMinLength
    >;
    hasMinLength<T extends number>(
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
            typeof this.ofType !== 'undefined'
                ? {
                      ofType:
                          this.ofType instanceof SchemaBuilder
                              ? this.ofType._schema
                              : JSON.parse(JSON.stringify(this.ofType))
                  }
                : {},
            typeof this.minLength !== 'undefined'
                ? { minLength: this.minLength }
                : {},
            typeof this.maxLength !== 'undefined'
                ? { maxLength: this.maxLength }
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
                this.ofType =
                    obj.ofType instanceof SchemaBuilder
                        ? obj.ofType.clone()
                        : { ...(obj.ofType as any) };
            }
            if (typeof obj.maxLength !== 'undefined') {
                this.maxLength = obj.maxLength;
            }
            if (typeof obj.minLength !== 'undefined') {
                this.minLength = obj.minLength;
            }
        } else {
            const defaultSchema = defaultSchemas['array'] as any;
            this.isRequired = defaultSchema.isRequired;
            this.isNullable = defaultSchema.isNullable;
        }
    }

    get type(): 'array' {
        return 'array';
    }

    ofType?: TOfType;
    maxLength?: TMaxLength;
    minLength?: TMinLength;

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

    hasElementOfType<T extends Schema>(
        schema: T
    ): IArraySchemaBuilder<TRequired, TNullable, T, TMaxLength, TMinLength> {
        return ArraySchemaBuilder.create({
            ...(this._schema as any),
            ofType: schema
        });
    }

    clearElementType(): IArraySchemaBuilder<
        TRequired,
        TNullable,
        undefined,
        TMaxLength,
        TMinLength
    > {
        if (typeof this.ofType === 'undefined') {
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

    hasMaxLength<T extends number>(
        length: T
    ): IArraySchemaBuilder<TRequired, TNullable, TOfType, T, TMinLength> {
        if ((this.maxLength as any) === length) {
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
        if (typeof this.maxLength === 'undefined') {
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

    hasMinLength<T extends number>(
        length: T
    ): IArraySchemaBuilder<TRequired, TNullable, TOfType, TMaxLength, T> {
        if ((this.minLength as any) === length) {
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
        if (typeof this.minLength === 'undefined') {
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
