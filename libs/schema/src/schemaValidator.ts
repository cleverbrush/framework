import { deepExtend } from '@cleverbrush/deep';
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
    ObjectSchemaDefinition
} from './index';
import { validateNumber } from './validators/validateNumber';
import { validateString } from './validators/validateString';
import { validateArray } from './validators/validateArray';
import { validateObject } from './validators/validateObject';

const defaultSchemaNames = ['string', 'number', 'date', 'array'];

const defaultSchemas: { [key in DefaultSchemaType]?: Schema<any> } = {
    number: {
        type: 'number',
        isRequired: true,
        isNullable: false,
        ensureNotNaN: true,
        ensureIsFinite: true
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
        validator: ISchemaValidator<any>
    ): Promise<ValidationResult> => validateNumber(obj, schema, validator),
    string: (
        obj: any,
        schema: StringSchemaDefinition<any>,
        validator: ISchemaValidator<any>
    ): Promise<ValidationResult> => validateString(obj, schema, validator),
    array: (
        obj: any,
        schema: ArraySchemaDefinition<any>,
        validator: ISchemaValidator<any>
    ): Promise<ValidationResult> => validateArray(obj, schema, validator)
};

const isDefaultType = (name: string): boolean =>
    defaultSchemaNames.indexOf(name) !== -1;

export default class SchemaValidator<T = Record<string, never>>
    implements ISchemasProvider<T>, ISchemaValidator<T>
{
    private _schemasMap = new Map<string, Schema<any>>();
    private _schemasCache: { [K in keyof T]: ISchemaActions<T, K> } = null;

    public addSchemaType<K, L extends ObjectSchemaDefinitionParam<M>, M = any>(
        name: keyof K,
        schema: L | Array<Schema<any>>
    ): SchemaValidator<T & { [key in keyof K]: L }> {
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
            return this as any as SchemaValidator<T & { [key in keyof K]: L }>;
        }

        if (typeof schema !== 'object')
            throw new Error('Array or Object is required');
        this._schemasMap.set(name.toString(), {
            ...schema,
            type: 'object'
        } as Schema<any>);
        this._schemasCache = null;

        return this as any as SchemaValidator<T & { [key in keyof K]: L }>;
    }

    public get schemas(): { [K in keyof T]: ISchemaActions<T, K> } {
        if (this._schemasCache) return this._schemasCache;
        const res = {};
        for (const key of this._schemasMap.keys()) {
            res[key] = {
                validate: (value: any): Promise<any> =>
                    this.validate(this._schemasMap.get(key), value),
                schema: this._schemasMap.get(key)
            };
        }
        this._schemasCache = res as { [K in keyof T]: ISchemaActions<T, K> };
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
            validator: ISchemaValidator<any>
        ) => ValidationResult;
        let finalSchema = defaultSchemas[name] as CompositeSchema<
            Record<string, never>
        >;
        if (strategy) {
            if (typeof mergeSchema === 'object') {
                finalSchema = deepExtend(finalSchema, mergeSchema);
            }
            if (typeof mergeSchema === 'number') {
                finalSchema = {
                    ...finalSchema,
                    equals: mergeSchema
                } as NumberSchemaDefinition<any>;
                mergeSchema;
            }

            let preliminaryResult = await strategy(value, finalSchema, this);
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

    public async validate(
        schema: keyof T | DefaultSchemaType | Schema<any>,
        obj: any
    ): Promise<ValidationResult> {
        if (!schema) throw new Error('schemaName is required');
        if (typeof schema === 'string') {
            if (isDefaultType(schema)) {
                return await this.validateDefaultType(
                    schema as DefaultSchemaType,
                    obj
                );
            } else if (typeof this.schemas[schema as keyof T] !== 'undefined') {
                if (Array.isArray(this.schemas[schema as keyof T].schema)) {
                    return this.validate(
                        this.schemas[schema as keyof T]
                            .schema as any as Schema<any>,
                        obj
                    );
                }
                const objSchema = deepExtend(
                    defaultSchemas.object,
                    this.schemas[schema as keyof T].schema
                ) as ObjectSchemaDefinition<Record<string, never>>;
                const res = await validateObject(obj, objSchema, this);
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
                if (Array.isArray(alias))
                    throw new Error(
                        'it is impossible to use alternative schema alias as "type" field'
                    );
                if (typeof alias !== 'object')
                    throw new Error(
                        'it is only possible to use a full schema schema definition as alias'
                    );

                const schemaToMerge = { ...schema };
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
                    this
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
