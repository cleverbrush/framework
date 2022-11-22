import { ISchemaRegistry as ISchemaRegistry, Unfold } from './index.js';
import { validateNumber } from './validators/validateNumber.js';
import { validateBoolean } from './validators/validateBoolean.js';
import { validateString } from './validators/validateString.js';
import { validateArray } from './validators/validateArray.js';
import { validateObject } from './validators/validateObject.js';
import { validateUnion } from './validators/validateUnion.js';
import { validateFunction } from './validators/validateFunction.js';
import {
    ArraySchema,
    BooleanSchema,
    DefaultSchemaType,
    NumberSchema,
    ObjectSchema,
    Schema,
    ReduceSchemaBuilder,
    SchemaSpecification,
    StringSchema,
    ValidationResult,
    ValidationResultRaw,
    ExpandSchemaBuilder,
    FunctionSchema
} from './schema.js';

import { number } from './builders/NumberSchemaBuilder.js';
import { union } from './builders/UnionSchemaBuilder.js';
import { object } from './builders/ObjectSchemaBuilder.js';
import { string } from './builders/StringSchemaBuilder.js';
import { boolean } from './builders/BooleanSchemaBuilder.js';
import { array } from './builders/ArraySchemaBuilder.js';
import { func } from './builders/FunctionSchemaBuilder.js';
import { defaultSchemas } from './defaultSchemas.js';
import { ISchemaBuilder, SchemaBuilder } from './builders/SchemaBuilder.js';

const defaultSchemaNames = ['string', 'boolean', 'number', 'array', 'function'];

const defaultSchemasValidationStrategies = {
    number: (obj: any, schema: NumberSchema): Promise<ValidationResult> =>
        validateNumber(obj, schema),
    boolean: (obj: any, schema: BooleanSchema): Promise<ValidationResult> =>
        validateBoolean(obj, schema),
    string: (obj: any, schema: StringSchema): Promise<ValidationResult> =>
        validateString(obj, schema),
    array: (
        obj: any,
        schema: ArraySchema<any>,
        validator: SchemaRegistry<any>
    ): Promise<ValidationResult> => validateArray(obj, schema, validator),
    function: (obj: any, schema: FunctionSchema): Promise<ValidationResult> =>
        validateFunction(obj, schema)
};

const isDefaultType = (name: string): boolean =>
    defaultSchemaNames.indexOf(name) !== -1;

export default class SchemaRegistry<T extends Record<string, Schema> = {}>
    implements ISchemaRegistry<T>
{
    private _schemasMap = new Map<string, Schema>();
    private _schemasCache: Unfold<T> = null;
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
    ): SchemaRegistry<T> {
        if (this._preprocessorsMap.has(name))
            throw new Error(`Preprocessor '${name}' is already registered`);
        if (typeof preprocessor !== 'function') {
            throw new Error('preprocessor must be a function');
        }
        this._preprocessorsMap.set(name, preprocessor);
        return this;
    }

    private _aliasBuilder = <TSchemaName extends keyof T>(
        schemaName: TSchemaName
    ): ExpandSchemaBuilder<T[TSchemaName]> => {
        if (typeof schemaName !== 'string' || !schemaName)
            throw new Error('schemaName must be non-empty string');
        const aliasSchema = this._schemasMap.get(schemaName.toString());
        if (!aliasSchema)
            throw new Error(`Schema name ${schemaName} is not defined.`);
        return aliasSchema;
    };

    private _externalAlias = <
        TExternalSchemaName extends keyof TExternalAliases,
        TExternalAliases extends Record<string, any>,
        TExternalSchemaRegistry extends ISchemaRegistry<TExternalAliases>
    >(
        registry: TExternalSchemaRegistry,
        schemaName: TExternalSchemaName
    ): ExpandSchemaBuilder<TExternalAliases[TExternalSchemaName]> => {
        if (typeof schemaName !== 'string' || !schemaName)
            throw new Error('schemaName must be non-empty string');
        // TODO: accessing private property here...
        const externalSchema = (registry as any)._schemasMap.get(schemaName);
        if (!externalSchema)
            throw new Error(`Schema name ${schemaName} is not defined.`);
        return externalSchema;
    };

    public addSchemaFrom<
        TOldName extends keyof T,
        TName extends string,
        TParam extends
            | Record<string, any>
            | ((params: {
                  base: ExpandSchemaBuilder<T[TOldName]>;
                  boolean: typeof boolean;
                  func: typeof func;
                  array: typeof array;
                  string: typeof string;
                  number: typeof number;
                  union: typeof union;
                  object: typeof object;
                  alias: <TSchemaName extends keyof T>(
                      schemaName: TSchemaName
                  ) => ExpandSchemaBuilder<T[TSchemaName]>;
              }) => TSchema),
        TSchema extends Schema | ISchemaBuilder
    >(
        oldName: TOldName,
        name: TName,
        param: TParam
    ): SchemaRegistry<{
        [key in keyof T | TName]: key extends keyof T
            ? T[key]
            : TParam extends (...args: any[]) => any
            ? ReduceSchemaBuilder<ReturnType<TParam>>
            : TParam;
    }> {
        if (!this._schemasMap.has(oldName.toString())) {
            throw new Error(`unknown schema name ${oldName.toString()}`);
        }

        const oldSchema = this._schemasMap.get(oldName.toString());

        const schema =
            typeof param === 'function'
                ? param({
                      base: oldSchema,
                      alias: this._aliasBuilder,
                      array,
                      boolean,
                      func,
                      number,
                      object,
                      string,
                      union
                  })
                : param;

        if (Array.isArray(schema)) {
            this._schemasMap.set(name.toString(), schema as Schema);
            this._schemasCache = null;
            return this as any;
        }

        if (typeof schema !== 'object')
            throw new Error('Array or Object is required');
        this._schemasMap.set(name.toString(), {
            ...(schema instanceof SchemaBuilder
                ? schema._schema
                : (schema as any))
        } as any as Schema);

        this._schemasCache = null;
        return this as any;
    }

    public addSchema<
        TName extends string,
        TParam extends
            | Record<string, any>
            | ((params: {
                  boolean: typeof boolean;
                  array: typeof array;
                  string: typeof string;
                  number: typeof number;
                  union: typeof union;
                  object: typeof object;
                  func: typeof func;
                  alias: <TSchemaName extends keyof T>(
                      schemaName: TSchemaName
                  ) => ExpandSchemaBuilder<T[TSchemaName]>;
                  external: <
                      TRegistryKeys,
                      TSchemaName extends keyof TRegistryKeys
                  >(
                      registry: SchemaRegistry<TRegistryKeys>,
                      schemaName: TSchemaName
                  ) => ExpandSchemaBuilder<TRegistryKeys[TSchemaName]>;
              }) => TSchema),
        TSchema extends Schema | ISchemaBuilder
    >(
        name: TName,
        param: TParam
    ): SchemaRegistry<{
        [key in keyof T | TName]: key extends keyof T
            ? T[key]
            : TParam extends (...args: any[]) => any
            ? ReduceSchemaBuilder<ReturnType<TParam>>
            : TParam;
    }> {
        if (typeof name !== 'string' || !name)
            throw new Error('Name is required');

        if (isDefaultType(name.toString()))
            throw new Error(
                `You can't add a schema named "${name}" because it's a name of a default schema, please consider another name to be used`
            );
        if (this._schemasMap.has(name.toString())) {
            throw new Error(`Schema "${name}" already exists`);
        }

        const schema =
            typeof param === 'function'
                ? param({
                      alias: this._aliasBuilder,
                      external: this._externalAlias,
                      array,
                      boolean,
                      number,
                      object,
                      string,
                      union,
                      func
                  })
                : param;

        if (Array.isArray(schema)) {
            this._schemasMap.set(name.toString(), schema as Schema);
            this._schemasCache = null;
            return this as any;
        }

        if (typeof schema !== 'object')
            throw new Error('Array or Object is required');
        this._schemasMap.set(
            name.toString(),
            schema instanceof SchemaBuilder ? schema.clone() : schema
        );

        this._schemasCache = null;
        return this as any;
    }

    public get schemas(): Unfold<T> {
        if (this._schemasCache) return this._schemasCache;
        const res = {};
        for (const key of this._schemasMap.keys()) {
            const parts = key.split('.');
            let curr = res;
            for (let i = 0; i < parts.length; i++) {
                if (i === parts.length - 1) {
                    curr[parts[i]] = {
                        validate: async (value: any): Promise<any> => {
                            const result = await this.validate(
                                this._schemasMap.get(key),
                                value
                            );
                            if (!result.valid) {
                                return result;
                            }
                            return {
                                ...result,
                                object: value
                            };
                        },
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
        this._schemasCache = res as Unfold<T>;
        return this._schemasCache;
    }

    private async validateDefaultType(
        name: DefaultSchemaType,
        value: any,
        mergeSchema?: Schema
    ): Promise<ValidationResult> {
        const strategy = defaultSchemasValidationStrategies[name] as (
            obj: any,
            schema: Schema,
            validator: SchemaRegistry<any>
        ) => ValidationResult;
        let finalSchema = defaultSchemas[name] as SchemaSpecification;
        if (strategy) {
            if (typeof mergeSchema === 'object' && mergeSchema) {
                finalSchema = Object.assign({}, finalSchema, mergeSchema);
            }
            if (typeof mergeSchema === 'number') {
                finalSchema = {
                    ...finalSchema,
                    equals: mergeSchema
                } as NumberSchema;
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
        schema: SchemaSpecification,
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
        schemaToValidate: keyof T | Schema,
        obj: any
    ): Promise<ValidationResult> {
        if (!schemaToValidate) throw new Error('schemaName is required');
        const schema =
            schemaToValidate instanceof SchemaBuilder
                ? schemaToValidate._schema
                : schemaToValidate;
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
                const objSchema = Object.assign(
                    {},
                    defaultSchemas.object,
                    this._schemasMap.get(schema)
                ) as ObjectSchema;
                const res = await validateObject(
                    obj,
                    objSchema as any,
                    this as any
                );
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
            const spec = schema as SchemaSpecification;
            if (typeof spec.type !== 'string')
                throw new Error('Schema has no type');

            if (isDefaultType(spec.type)) {
                return await this.validateDefaultType(
                    spec.type as DefaultSchemaType,
                    obj,
                    schema
                );
            } else if (spec.type === 'union') {
                return await validateUnion(obj, spec, this as any);
            } else if (spec.type === 'object') {
                const preliminaryResult = await validateObject(
                    obj,
                    schema as ObjectSchema<any>,
                    this as any
                );
                if (!preliminaryResult.valid) return preliminaryResult;

                return await this.checkValidators(
                    schema as SchemaSpecification,
                    obj
                );
            } else if (spec.type === 'function') {
                return await validateFunction(obj, spec);
            }
        }

        throw new Error("Couldn't understand the Schema provided");
    }
}
