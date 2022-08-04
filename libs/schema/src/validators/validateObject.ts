import { ObjectSchema, Schema, ValidationResult } from '../schema.js';
import SchemaRegistry from '../schemaRegistry.js';

export const validateObject = async (
    obj: any,
    schema: ObjectSchema<any>,
    validator: SchemaRegistry<any>
): Promise<ValidationResult> => {
    if (
        typeof obj === 'undefined' &&
        typeof schema === 'object' &&
        schema.isRequired === false
    ) {
        return {
            valid: true
        };
    }
    if (typeof obj !== 'object') {
        return {
            valid: false,
            errors: [
                `expected to have type='object', but saw '${typeof obj}' instead`
            ]
        };
    }

    if (typeof schema.preprocessors === 'object' && schema.preprocessors) {
        await Promise.all(
            Object.keys(schema.preprocessors).map(async (key: string) => {
                if (key === '*') return;
                if (typeof schema.preprocessors[key] === 'function') {
                    const res = await Promise.resolve(
                        (schema.preprocessors[key] as any)(obj[key])
                    );
                    if (typeof res !== 'undefined') {
                        obj[key] = res;
                    } else {
                        delete obj[key];
                    }
                } else {
                    const preprocessor = validator.preprocessors.get(
                        schema.preprocessors[key] as string
                    );
                    if (typeof preprocessor !== 'function') {
                        throw new Error(
                            `preprocessor '${schema.preprocessors[key]}' is unknown`
                        );
                    }
                    const res = await Promise.resolve(preprocessor(obj[key]));
                    if (typeof res !== 'undefined') {
                        obj[key] = res;
                    } else {
                        delete obj[key];
                    }
                }
            })
        );
        if ('*' in schema.preprocessors) {
            const objectPreprocessor = schema.preprocessors['*'];
            if (typeof objectPreprocessor === 'function') {
                await Promise.resolve((objectPreprocessor as any)(obj));
            } else {
                const preprocessor = validator.preprocessors.get(
                    objectPreprocessor as string
                );
                if (typeof preprocessor !== 'function') {
                    throw new Error(
                        `preprocessor '${objectPreprocessor}' is unknown`
                    );
                }
                await Promise.resolve(preprocessor(obj));
            }
        }
    }

    if (typeof schema.properties === 'object' && schema.properties) {
        const errors = [
            ...(await Promise.all(
                Object.entries(schema.properties).map(
                    async ([name, schema]: [string, Schema]) => {
                        const result = await validator.validate(
                            schema,
                            obj[name]
                        );
                        if (result.valid) return result;
                        return {
                            valid: false,
                            errors: (result.errors || []).map(
                                (e) => `->${name} ${e}`
                            )
                        };
                    }
                )
            )),
            ...(schema.noUnknownProperties
                ? Object.keys(obj)
                      .filter((k) => !(k in schema.properties))
                      .map((k) => ({
                          valid: false,
                          errors: [`-> ${k} - unknown field`]
                      }))
                : [])
        ]
            .filter((r) => !r.valid)
            .map((r) => r.errors)
            .flat(Infinity) as string[];

        if (errors.length) {
            return {
                valid: false,
                errors
            };
        }
    }

    return {
        valid: true
    };
};
