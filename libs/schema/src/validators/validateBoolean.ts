import {
    ValidationResult,
    BooleanSchemaDefinition,
    ISchemaValidator
} from '../index';

export const validateBoolean = async (
    obj: any,
    schema: BooleanSchemaDefinition<any>,
    validator: ISchemaValidator<any>
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

    if (typeof schema === 'boolean') {
        return { valid: true };
    }

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
