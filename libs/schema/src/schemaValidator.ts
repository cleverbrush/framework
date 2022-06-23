import { deepExtend, Merge } from '@cleverbrush/deep';
import {
    ISchemasProvider,
    Schema,
    ISchemaActions,
    ObjectSchemaDefinitionParam,
    ValidationResult,
    NumberSchemaDefinition,
    StringSchemaDefinition,
    CompositeSchema,
    ValidationResultRaw,
    ArraySchemaDefinition,
    ISchemaValidator,
    DefaultSchemaType,
    ObjectSchemaDefinition,
    BooleanSchemaDefinition,
    Cons,
    Unfold
} from './index';
import { validateNumber } from './validators/validateNumber';
import { validateBoolean } from './validators/validateBoolean';
import { validateString } from './validators/validateString';
import { validateArray } from './validators/validateArray';
import { validateObject } from './validators/validateObject';

const defaultSchemaNames = ['string', 'boolean', 'number', 'date', 'array'];

const defaultSchemas: { [key in DefaultSchemaType]?: Schema<any> } = {
    number: {
        type: 'number',
        isRequired: true,
        isNullable: false,
        ensureNotNaN: true,
        ensureIsFinite: true
    },
    boolean: {
        type: 'boolean',
        isRequired: true,
        isNullable: false
    },
    string: {
        type: 'string',
        isNullable: false,
        isRequired: true
    },
    array: {
        type: 'array'
    },
    object: {
        type: 'object',
        isNullable: false,
        isRequired: true
    }
};

const defaultSchemasValidationStrategies = {
    number: (
        obj: any,
        schema: NumberSchemaDefinition<any>,
        validator: ISchemaValidator<any, unknown[]>
    ): Promise<ValidationResult> => validateNumber(obj, schema, validator),
    boolean: (
        obj: any,
        schema: BooleanSchemaDefinition<any>,
        validator: ISchemaValidator<any, unknown[]>
    ): Promise<ValidationResult> => validateBoolean(obj, schema, validator),
    string: (
        obj: any,
        schema: StringSchemaDefinition<any>,
        validator: ISchemaValidator<any, unknown[]>
    ): Promise<ValidationResult> => validateString(obj, schema, validator),
    array: (
        obj: any,
        schema: ArraySchemaDefinition<any>,
        validator: ISchemaValidator<any, unknown[]>
    ): Promise<ValidationResult> => validateArray(obj, schema, validator)
};

const isDefaultType = (name: string): boolean =>
    defaultSchemaNames.indexOf(name) !== -1;

export default class SchemaValidator<
    T extends Record<string, never> = Record<string, never>,
    SchemaTypesStructures extends unknown[] = []
> implements
        ISchemasProvider<SchemaTypesStructures>,
        ISchemaValidator<T, SchemaTypesStructures>
{
    private _schemasMap = new Map<string, Schema<any>>();
    private _schemasCache: Merge<SchemaTypesStructures> = null;
    private _preprocessorsMap = new Map<
        string,
        (value: unknown) => unknown | Promise<unknown> | undefined
    >();

    public get preprocessors(): Map<string, (value: unknown) => unknown> {
        return this._preprocessorsMap;
    }

    public addPreprocessor(
        name: string,
        preprocessor: (value: unknown) => unknown | Promise<unknown>
    ): SchemaValidator<T, SchemaTypesStructures> {
        if (this._preprocessorsMap.has(name))
            throw new Error(`Preprocessor '${name}' is already registered`);
        this._preprocessorsMap.set(name, preprocessor);
        return this;
    }

    public addSchemaType<
        K,
        L extends ObjectSchemaDefinitionParam<M> | Array<Schema<any>>,
        M = any
    >(
        name: keyof K,
        schema: L
    ): SchemaValidator<
        T & { [key in keyof K]: L },
        Cons<Unfold<keyof K, ISchemaActions<L>>, SchemaTypesStructures>
    > {
        if (typeof name !== 'string' || !name)
            throw new Error('Name is required');

        if (isDefaultType(name.toString()))
            throw new Error(
                `You can't add a schema named "${name}" because it's a name of a default schema, please consider another name to be used`
            );
        if (this._schemasMap.has(name.toString())) {
            throw new Error(`Schema "${name}" already exists`);
        }

        if (Array.isArray(schema)) {
            this._schemasMap.set(name.toString(), schema as Schema<any>);
            this._schemasCache = null;
            return this as any as SchemaValidator<
                T & { [key in keyof K]: L },
                Cons<Unfold<keyof K, ISchemaActions<L>>, SchemaTypesStructures>
            >;
        }

        if (typeof schema !== 'object')
            throw new Error('Array or Object is required');
        this._schemasMap.set(name.toString(), {
            ...schema,
            type: 'object'
        } as Schema<any>);
        this._schemasCache = null;

        return this as any as SchemaValidator<
            T & { [key in keyof K]: L },
            Cons<Unfold<keyof K, ISchemaActions<L>>, SchemaTypesStructures>
        >;
    }

    public get schemas(): Merge<SchemaTypesStructures> {
        if (this._schemasCache) return this._schemasCache;
        const res = {};
        for (const key of this._schemasMap.keys()) {
            const parts = key.split('.');
            let curr = res;
            for (let i = 0; i < parts.length; i++) {
                if (i === parts.length - 1) {
                    curr[parts[i]] = {
                        validate: (value: any): Promise<any> =>
                            this.validate(this._schemasMap.get(key), value),
                        schema: this._schemasMap.get(key)
                    };
                } else {
                    if (typeof curr[parts[i]] === 'undefined') {
                        curr[parts[i]] = {};
                    }
                }
                curr = curr[parts[i]];
            }
        }
        this._schemasCache = res as Merge<SchemaTypesStructures>;
        return this._schemasCache;
    }

    private async validateDefaultType(
        name: DefaultSchemaType,
        value: any,
        mergeSchema?: Schema<any>
    ): Promise<ValidationResult> {
        const strategy = defaultSchemasValidationStrategies[name] as (
            obj: any,
            schema: Schema<any>,
            validator: ISchemaValidator<any, unknown[]>
        ) => ValidationResult;
        let finalSchema = defaultSchemas[name] as CompositeSchema<
            Record<string, never>
        >;
        if (strategy) {
            if (typeof mergeSchema === 'object') {
                finalSchema = deepExtend(finalSchema, mergeSchema) as any;
            }
            if (typeof mergeSchema === 'number') {
                finalSchema = {
                    ...finalSchema,
                    equals: mergeSchema
                } as NumberSchemaDefinition<any>;
                mergeSchema;
            }

            let preliminaryResult = await strategy(
                value,
                finalSchema,
                this as any
            );
            if (!preliminaryResult.valid) return preliminaryResult;

            preliminaryResult = await this.checkValidators(finalSchema, value);

            return preliminaryResult;
        }
        throw new Error('not implemented');
    }

    private async checkValidators(
        schema: CompositeSchema<Record<string, never>>,
        value: any
    ): Promise<ValidationResult> {
        if (!schema.isRequired && typeof value === 'undefined') {
            return {
                valid: true
            };
        }
        if (Array.isArray(schema.validators)) {
            const validatorsResults = await Promise.allSettled(
                schema.validators.map((v) => Promise.resolve(v(value)))
            );
            const rejections = validatorsResults
                .filter((f) => f.status === 'rejected')
                .map((f: PromiseRejectedResult) => f.reason);
            const errors = validatorsResults
                .filter(
                    (f) =>
                        f.status === 'fulfilled' &&
                        typeof f.value !== 'boolean' &&
                        f.value.valid === false
                )
                .map(
                    (f: PromiseFulfilledResult<ValidationResultRaw>) => f.value
                )
                .map((f: ValidationResultRaw) => f.errors);

            if (rejections.length === 0 && errors.length === 0) {
                return {
                    valid: true
                };
            }
            return {
                valid: false,
                errors: [...rejections, ...errors]
            };
        }
        return {
            valid: true
        };
    }

    public async validate<K>(
        schema: keyof T | DefaultSchemaType | Schema<K>,
        obj: any
    ): Promise<ValidationResult> {
        if (!schema) throw new Error('schemaName is required');
        if (typeof schema === 'string') {
            if (isDefaultType(schema)) {
                return await this.validateDefaultType(
                    schema as DefaultSchemaType,
                    obj
                );
            } else if (typeof this._schemasMap.get(schema) !== 'undefined') {
                if (Array.isArray(this._schemasMap.get(schema))) {
                    return this.validate(this._schemasMap.get(schema), obj);
                }
                const objSchema = deepExtend(
                    defaultSchemas.object,
                    this._schemasMap.get(schema)
                ) as ObjectSchemaDefinition<Record<string, never>>;
                const res = await validateObject(obj, objSchema, this as any);
                if (!res.valid) return res;
                return await this.checkValidators(objSchema, obj);
            } else {
                return await this.validateDefaultType('string', obj, {
                    type: 'string',
                    equals: schema
                });
            }
        }

        if (Array.isArray(schema)) {
            for (let i = 0; i < schema.length; i++) {
                const res = await this.validate(schema[i], obj);
                if (res.valid) {
                    return res;
                }
            }
            return {
                valid: false,
                errors: ['object does not match any schema']
            };
        }

        if (typeof schema === 'number') {
            return await this.validateDefaultType('number', obj, schema);
        }

        if (typeof schema === 'object') {
            if (typeof schema.type !== 'string')
                throw new Error('Schema has no type');

            if (isDefaultType(schema.type)) {
                return await this.validateDefaultType(
                    schema.type as DefaultSchemaType,
                    obj,
                    schema
                );
            } else if (schema.type === 'alias') {
                const alias = this.schemas[schema.schemaName]
                    .schema as Schema<any>;
                if (Array.isArray(alias)) {
                    if (
                        (!schema.isRequired && typeof obj === 'undefined') ||
                        (schema.isNullable && obj === null)
                    ) {
                        return {
                            valid: true
                        };
                    }
                    return await this.validate(alias, obj);
                }
                if (typeof alias !== 'object')
                    throw new Error(
                        'it is only possible to use a full schema schema definition as alias'
                    );

                const schemaToMerge = { ...(schema as any) };
                delete schemaToMerge.type;
                delete schemaToMerge.schemaName;
                const finalSchema: Schema<any> = deepExtend(
                    alias,
                    schemaToMerge
                );
                return await this.validate(finalSchema, obj);
            } else if (schema.type === 'object') {
                const preliminaryResult = await validateObject(
                    obj,
                    schema,
                    this as any
                );
                if (!preliminaryResult.valid) return preliminaryResult;

                return await this.checkValidators(
                    schema as CompositeSchema<Record<string, never>>,
                    obj
                );
            }
        }

        throw new Error("Coldn't understand the Schema provided");
    }
}
