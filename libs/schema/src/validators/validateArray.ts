import {
    ValidationResult,
    ArraySchemaDefinition,
    ISchemaValidator
} from '../index';

export const validateArray = async (
    obj: any,
    schema: ArraySchemaDefinition<any>,
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
    if (!Array.isArray(obj))
        return {
            valid: false,
            errors: ['expected type array']
        };

    if (typeof schema.minLength === 'number' && obj.length < schema.minLength) {
        return {
            valid: false,
            errors: [`expected to be at least ${schema.minLength} chars long`]
        };
    }

    if (typeof schema.maxLength === 'number' && obj.length > schema.maxLength) {
        return {
            valid: false,
            errors: [`expected to be at most ${schema.maxLength} chars long`]
        };
    }

    if (typeof schema.ofType !== 'undefined') {
        const results = await Promise.all(
            obj.map((i) => validator.validate(schema.ofType, i))
        );

        const errors = results
            .filter((r) => !r.valid)
            .map((r) => r.errors)
            .flat(Infinity) as Array<string>;

        if (errors.length) {
            return {
                valid: false,
                errors
            };
        }

        return {
            valid: true
        };
    }

    return {
        valid: true
    };
};
