import { BooleanSchema, ValidationResult } from '../schema.js';

export const validateBoolean = async (
    obj: any,
    schema: BooleanSchema
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
    if (typeof obj !== 'boolean')
        return {
            valid: false,
            errors: [`expected type boolean, but saw ${typeof obj}`]
        };

    const bool = obj as boolean;

    if (typeof schema.equals === 'boolean') {
        return schema.equals === bool
            ? { valid: true }
            : {
                  valid: false,
                  errors: [`must be equal to ${schema.equals}`]
              };
    }

    return {
        valid: true
    };
};
