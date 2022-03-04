import {
    ValidationResult,
    ObjectSchemaDefinition,
    ISchemaValidator,
    Schema
} from '../index';

export const validateObject = async (
    obj: any,
    schema: ObjectSchemaDefinition<any>,
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
    if (typeof obj !== 'object') {
        return {
            valid: false,
            errors: [
                `expected to have type='object', but saw '${typeof obj}' instead`
            ]
        };
    }

    if (typeof schema.properties === 'object' && schema.properties) {
        const errors = (
            await Promise.all(
                Object.entries(schema.properties).map(
                    async ([name, schema]: [string, Schema<any>]) => {
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
            )
        )
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
