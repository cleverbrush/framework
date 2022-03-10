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

    if (schema.preprocessor) {
        const preprocessor =
            typeof schema.preprocessor === 'function'
                ? schema.preprocessor
                : validator.preprocessors.get(schema.preprocessor);
        if (typeof preprocessor !== 'function') {
            throw new Error(`unknown preprocessor '${schema.preprocessor}'`);
        }
        for (let i = 0; i < obj.length; i++) {
            obj[i] = await Promise.resolve(preprocessor(obj[i]));
        }
    }

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
