import { UnionSchema, ValidationResult } from '../schema.js';
import SchemaRegistry from '../schemaRegistry.js';

export const validateUnion = async (
    obj: any,
    schema: UnionSchema<any>,
    validator: SchemaRegistry<any>
): Promise<ValidationResult> => {
    if (typeof obj === 'undefined' && schema.isRequired === false) {
        return {
            valid: true
        };
    }

    if (obj === null && schema.isNullable) {
        return {
            valid: true
        };
    }

    if (Array.isArray(schema.variants) && schema.variants.length > 0) {
        for (let i = 0; i < schema.variants.length; i++) {
            const variant = schema.variants[i];
            const result = await validator.validate(variant, obj);
            if (result.valid) {
                return result;
            }
        }
        return {
            valid: false,
            errors: ['object does not satisfy any scheme']
        };
    }

    throw new Error('variants should be non empty array');
};
