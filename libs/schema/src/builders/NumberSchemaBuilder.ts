import { ISchemaBuilder, SchemaBuilder } from './SchemaBuilder.js';
import { defaultSchemas } from '../defaultSchemas.js';
import { Schema, Validator } from '../schema.js';

export interface INumberSchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TMin extends number | undefined = undefined,
    TMax extends number | undefined = undefined,
    TIsInteger extends boolean | undefined = undefined,
    TEnsureNotNaN extends boolean = true,
    TEnsureIsFinite extends boolean = true,
    TEqualsTo extends number | undefined = undefined
> extends ISchemaBuilder<TRequired, TNullable> {
    min<K extends number>(
        val: K
    ): INumberSchemaBuilder<
        TRequired,
        TNullable,
        K,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    >;
    clearMin(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        undefined,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    >;
    max<K extends number>(
        val: K
    ): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        K,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    >;
    clearMax(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        undefined,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    >;
    optional(): INumberSchemaBuilder<
        false,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    >;
    required(): INumberSchemaBuilder<
        true,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    >;
    nullable(): INumberSchemaBuilder<
        TRequired,
        true,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    >;
    notNullable(): INumberSchemaBuilder<
        TRequired,
        false,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    >;
    equals<T extends number>(
        val: T
    ): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        T
    >;
    clearEquals(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        undefined
    >;
    isInteger(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        true,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    >;
    canBeNotInteger(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        undefined,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    >;
    notNaN(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        true,
        TEnsureIsFinite,
        TEqualsTo
    >;
    canBeNaN(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        false,
        TEnsureIsFinite,
        TEqualsTo
    >;

    isFinite(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        true,
        TEqualsTo
    >;
    canBeInfinite(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        false,
        TEqualsTo
    >;
}

export class NumberSchemaBuilder<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TMin extends number | undefined = undefined,
        TMax extends number | undefined = undefined,
        TIsInteger extends boolean | undefined = undefined,
        TEnsureNotNaN extends boolean = true,
        TEnsureIsFinite extends boolean = true,
        TEqualsTo extends number | undefined = undefined
    >
    extends SchemaBuilder<TRequired, TNullable>
    implements
        INumberSchemaBuilder<
            TRequired,
            TNullable,
            TMin,
            TMax,
            TIsInteger,
            TEnsureNotNaN,
            TEnsureIsFinite,
            TEqualsTo
        >
{
    public clone(): this {
        return NumberSchemaBuilder.create(this._schema as any) as this;
    }

    public get _schema(): Schema {
        return Object.assign(
            {
                type: this.type,
                ensureNotNaN: this._ensureNotNaN,
                ensureIsFinite: this._ensureIsFinite
            },
            this.getCommonSchema(),
            typeof this._min !== 'undefined' ? { min: this._min } : {},
            typeof this._max !== 'undefined' ? { max: this._max } : {},
            typeof this._isInteger !== 'undefined'
                ? { isInteger: this._isInteger }
                : {},
            typeof this._equals !== 'undefined' ? { equals: this._equals } : {}
        );
    }

    public static create<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TMin extends number | undefined = undefined,
        TMax extends number | undefined = undefined,
        TIsInteger extends boolean | undefined = undefined,
        TEnsureNotNaN extends boolean = true,
        TEnsureIsFinite extends boolean = true,
        TEqualsTo extends number | undefined = undefined
    >(obj?: {
        isRequired: TRequired;
        isNullable: TNullable;
        min: TMin;
        max: TMax;
        isInteger: TIsInteger;
        ensureNotNaN: TEnsureNotNaN;
        ensureIsFinite: TEnsureIsFinite;
        equals: TEqualsTo;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
    }): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    > {
        return new NumberSchemaBuilder(obj as any);
    }

    private constructor(obj: {
        isRequired: TRequired;
        isNullable: TNullable;
        min: TMin;
        max: TMax;
        isInteger: TIsInteger;
        ensureNotNaN: TEnsureNotNaN;
        ensureIsFinite: TEnsureIsFinite;
        equals: TEqualsTo;
        validators?: Validator[];
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
    }) {
        super(obj);
        if (typeof obj === 'object' && obj) {
            if (typeof obj.min !== 'undefined') {
                this._min = obj.min;
            }
            if (typeof obj.max !== 'undefined') {
                this._max = obj.max;
            }
            if (typeof obj.isInteger !== 'undefined') {
                this._isInteger = obj.isInteger;
            }
            if (typeof obj.ensureNotNaN !== 'undefined') {
                this._ensureNotNaN = obj.ensureNotNaN;
            }
            if (typeof obj.ensureIsFinite !== 'undefined') {
                this._ensureIsFinite = obj.ensureIsFinite;
            }
            if (typeof obj.equals !== 'undefined') {
                this._equals = obj.equals;
            }
        } else {
            const defaultSchema = defaultSchemas['number'] as any;
            this.isRequired = defaultSchema.isRequired;
            this.isNullable = defaultSchema.isNullable;
            this._ensureNotNaN = defaultSchema.ensureNotNaN;
            this._ensureIsFinite = defaultSchema.ensureIsFinite;
        }
    }

    protected readonly type = 'number';

    _min?: TMin;
    _max?: TMax;
    _isInteger?: TIsInteger;
    _ensureNotNaN: TEnsureNotNaN = true as TEnsureNotNaN;
    _ensureIsFinite: TEnsureIsFinite = true as TEnsureIsFinite;
    _equals?: TEqualsTo;

    min<K extends number>(
        val: K
    ): INumberSchemaBuilder<
        TRequired,
        TNullable,
        K,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    > {
        if ((this._min as any) === val) {
            return this as any as INumberSchemaBuilder<
                TRequired,
                TNullable,
                K,
                TMax,
                TIsInteger,
                TEnsureNotNaN,
                TEnsureIsFinite,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            min: val
        });
    }

    clearMin(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        undefined,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    > {
        if (typeof this._min === 'undefined') {
            return this as any as INumberSchemaBuilder<
                TRequired,
                TNullable,
                undefined,
                TMax,
                TIsInteger,
                TEnsureNotNaN,
                TEnsureIsFinite,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            min: undefined
        });
    }

    max<K extends number>(
        val: K
    ): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        K,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    > {
        if ((this._max as any) === val) {
            return this as any as INumberSchemaBuilder<
                TRequired,
                TNullable,
                TMin,
                K,
                TIsInteger,
                TEnsureNotNaN,
                TEnsureIsFinite,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            max: val
        });
    }

    clearMax(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        undefined,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    > {
        if (typeof this._max === 'undefined') {
            return this as INumberSchemaBuilder<
                TRequired,
                TNullable,
                TMin,
                undefined,
                TIsInteger,
                TEnsureNotNaN,
                TEnsureIsFinite,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            max: undefined
        });
    }

    optional(): INumberSchemaBuilder<
        false,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    > {
        if (this.isRequired === false) {
            return this as INumberSchemaBuilder<
                false,
                TNullable,
                TMin,
                TMax,
                TIsInteger,
                TEnsureNotNaN,
                TEnsureIsFinite,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: false
        }) as INumberSchemaBuilder<
            false,
            TNullable,
            TMin,
            TMax,
            TIsInteger,
            TEnsureNotNaN,
            TEnsureIsFinite,
            TEqualsTo
        >;
    }

    required(): INumberSchemaBuilder<
        true,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    > {
        if (this.isRequired === true) {
            return this as INumberSchemaBuilder<
                true,
                TNullable,
                TMin,
                TMax,
                TIsInteger,
                TEnsureNotNaN,
                TEnsureIsFinite,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: true
        });
    }

    nullable(): INumberSchemaBuilder<
        TRequired,
        true,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    > {
        if (this.isNullable === true) {
            return this as INumberSchemaBuilder<
                TRequired,
                true,
                TMin,
                TMax,
                TIsInteger,
                TEnsureNotNaN,
                TEnsureIsFinite,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: true
        });
    }

    notNullable(): INumberSchemaBuilder<
        TRequired,
        false,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    > {
        if (this.isNullable === false) {
            return this as INumberSchemaBuilder<
                TRequired,
                false,
                TMin,
                TMax,
                TIsInteger,
                TEnsureNotNaN,
                TEnsureIsFinite,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: false
        }) as INumberSchemaBuilder<
            TRequired,
            false,
            TMin,
            TMax,
            TIsInteger,
            TEnsureNotNaN,
            TEnsureIsFinite,
            TEqualsTo
        >;
    }

    equals<T extends number>(
        val: T
    ): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        T
    > {
        if ((this._equals as any) === val) {
            return this as any as INumberSchemaBuilder<
                TRequired,
                TNullable,
                TMin,
                TMax,
                TIsInteger,
                TEnsureNotNaN,
                TEnsureIsFinite,
                T
            >;
        }

        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            equals: val as T
        });
    }

    clearEquals(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        TEnsureIsFinite,
        undefined
    > {
        if (typeof this._equals === 'undefined') {
            return this as INumberSchemaBuilder<
                TRequired,
                TNullable,
                TMin,
                TMax,
                TIsInteger,
                TEnsureNotNaN,
                TEnsureIsFinite,
                undefined
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            equals: undefined
        });
    }

    isInteger(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        true,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    > {
        if (this._isInteger === true) {
            return this as INumberSchemaBuilder<
                TRequired,
                TNullable,
                TMin,
                TMax,
                true,
                TEnsureNotNaN,
                TEnsureIsFinite,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            isInteger: true
        });
    }

    canBeNotInteger(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        undefined,
        TEnsureNotNaN,
        TEnsureIsFinite,
        TEqualsTo
    > {
        if (typeof this._isInteger === 'undefined') {
            return this as INumberSchemaBuilder<
                TRequired,
                TNullable,
                TMin,
                TMax,
                undefined,
                TEnsureNotNaN,
                TEnsureIsFinite,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            isInteger: undefined
        });
    }

    notNaN(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        true,
        TEnsureIsFinite,
        TEqualsTo
    > {
        if (this._ensureNotNaN === true) {
            return this as INumberSchemaBuilder<
                TRequired,
                TNullable,
                TMin,
                TMax,
                TIsInteger,
                true,
                TEnsureIsFinite,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            ensureNotNaN: true
        });
    }

    canBeNaN(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        false,
        TEnsureIsFinite,
        TEqualsTo
    > {
        if (this._ensureNotNaN === false) {
            return this as INumberSchemaBuilder<
                TRequired,
                TNullable,
                TMin,
                TMax,
                TIsInteger,
                false,
                TEnsureIsFinite,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            ensureNotNaN: false
        });
    }

    isFinite(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        true,
        TEqualsTo
    > {
        if (this._ensureIsFinite === true) {
            return this as INumberSchemaBuilder<
                TRequired,
                TNullable,
                TMin,
                TMax,
                TIsInteger,
                TEnsureNotNaN,
                true,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            ensureIsFinite: true
        });
    }

    canBeInfinite(): INumberSchemaBuilder<
        TRequired,
        TNullable,
        TMin,
        TMax,
        TIsInteger,
        TEnsureNotNaN,
        false,
        TEqualsTo
    > {
        if (this._ensureIsFinite === false) {
            return this as INumberSchemaBuilder<
                TRequired,
                TNullable,
                TMin,
                TMax,
                TIsInteger,
                TEnsureNotNaN,
                false,
                TEqualsTo
            >;
        }
        return NumberSchemaBuilder.create({
            ...(this._schema as any),
            ensureIsFinite: false
        });
    }
}

export const number = () => NumberSchemaBuilder.create();
