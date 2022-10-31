import { Schema } from '../schema.js';
import { SchemaBuilder, ISchemaBuilder } from './SchemaBuilder.js';

export interface IUnionSchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TVariants extends any[] = []
> extends ISchemaBuilder<TRequired, TNullable> {
    optional(): IUnionSchemaBuilder<false, TNullable, TVariants>;
    required(): IUnionSchemaBuilder<true, TNullable, TVariants>;
    nullable(): IUnionSchemaBuilder<TRequired, true, TVariants>;
    notNullable(): IUnionSchemaBuilder<TRequired, false, TVariants>;
    or<T>(
        schema: T
    ): IUnionSchemaBuilder<TRequired, TNullable, [...TVariants, T]>;
    clearVariants(): IUnionSchemaBuilder<TRequired, TNullable, []>;
}

class UnionSchemaBuilder<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TVariants extends any[] = []
    >
    extends SchemaBuilder<TRequired, TNullable>
    implements IUnionSchemaBuilder<TRequired, TNullable, TVariants>
{
    protected readonly type = 'union';

    get _schema(): Schema {
        return Object.assign(
            {
                type: this.type
            },
            this.getCommonSchema(),
            {
                variants: this._variants.map((variant) => {
                    if (variant instanceof SchemaBuilder) {
                        return variant._schema;
                    }
                    return JSON.parse(JSON.stringify(variant));
                })
            }
        );
    }

    public clone(): this {
        return UnionSchemaBuilder.create(this._schema as any) as this;
    }

    protected _variants: TVariants;

    public static create<
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        TSchemas extends Schema[] = []
    >(obj: {
        isRequired: TRequired;
        isNullable: TNullable;
        variants?: TSchemas;
    }): IUnionSchemaBuilder<TRequired, TNullable, TSchemas> {
        return new UnionSchemaBuilder(obj);
    }

    private constructor(obj: {
        isRequired: TRequired;
        isNullable: TNullable;
        variants?: TVariants;
    }) {
        super(obj);
        this._variants = [] as TVariants;
        if (Array.isArray(obj.variants)) {
            for (let i = 0; i < obj.variants.length; i++) {
                this._variants.push(obj.variants[i]);
            }
        }
    }

    optional(): IUnionSchemaBuilder<false, TNullable, TVariants> {
        if (this.isRequired === false) {
            return this as IUnionSchemaBuilder<false, TNullable, TVariants>;
        }
        return UnionSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: false
        });
    }

    required(): IUnionSchemaBuilder<true, TNullable, TVariants> {
        if (this.isRequired === true) {
            return this as IUnionSchemaBuilder<true, TNullable, TVariants>;
        }
        return UnionSchemaBuilder.create({
            ...(this._schema as any),
            isRequired: true
        });
    }

    nullable(): IUnionSchemaBuilder<TRequired, true, TVariants> {
        if (this.isNullable === true) {
            return this as IUnionSchemaBuilder<TRequired, true, TVariants>;
        }
        return UnionSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: true
        });
    }

    notNullable(): IUnionSchemaBuilder<TRequired, false, TVariants> {
        if (this.isNullable === false) {
            return this as IUnionSchemaBuilder<TRequired, false, TVariants>;
        }
        return UnionSchemaBuilder.create({
            ...(this._schema as any),
            isNullable: false
        });
    }

    or<T>(
        schema: T
    ): IUnionSchemaBuilder<TRequired, TNullable, [...TVariants, T]> {
        return UnionSchemaBuilder.create({
            ...(this._schema as any),
            variants: [...this._variants, schema]
        });
    }

    clearVariants(): IUnionSchemaBuilder<TRequired, TNullable, []> {
        if (this._variants.length === 0)
            return this as any as IUnionSchemaBuilder<TRequired, TNullable, []>;
        return UnionSchemaBuilder.create({
            ...(this._schema as any),
            variants: []
        });
    }
}

export const union = <
    T extends ISchemaBuilder,
    K extends T[],
    TRequired extends boolean = true,
    TNullable extends boolean = false
>(
    ...schemas: K
): IUnionSchemaBuilder<TRequired, TNullable, K> => {
    if (schemas.length < 1) {
        throw new Error('should provide at least one variant');
    }
    let res = UnionSchemaBuilder.create({
        isRequired: true,
        isNullable: false,
        variants: [schemas[0] as any]
    });

    for (let i = 1; i < schemas.length; i++) {
        res = res.or(schemas[i]);
    }

    return res as any;
};
