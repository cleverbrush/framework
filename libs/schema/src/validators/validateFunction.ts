import { FunctionSchema, ValidationResult } from '../schema.js';

export const validateFunction = async (
    obj: any,
    schema: FunctionSchema
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
    if (typeof obj !== 'function')
        return {
            valid: false,
            errors: [`expected type function, but saw ${typeof obj}`]
        };

    return {
        valid: true
    };
};
