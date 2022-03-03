import {
    ValidationResult,
    StringSchemaDefinition,
    ISchemaValidator,
} from "../index";

export const validateString = async (
    obj: any,
    schema: StringSchemaDefinition<any>,
    validator: ISchemaValidator<any>
): Promise<ValidationResult> => {
    if (
        typeof obj === "undefined" &&
        typeof schema === "object" &&
        schema.isRequired === false
    ) {
        return {
            valid: true,
        };
    }
    if (typeof obj !== "string")
        return {
            valid: false,
            errors: [`expected type string, but saw ${typeof obj}`],
        };

    if (typeof schema === "string") {
        return obj === schema
            ? { valid: true }
            : {
                  valid: false,
                  errors: [`should be equal to ${schema}`],
              };
    }

    const str = obj as String;

    if (typeof schema.equals === "string" && str !== schema.equals) {
        return {
            valid: false,
            errors: [
                `expected to be equal to '${schema.equals}' but saw '${str}'`,
            ],
        };
    }

    if (typeof schema.minLength === "number" && str.length < schema.minLength) {
        return {
            valid: false,
            errors: [`expected to be at least ${schema.minLength} chars long`],
        };
    }

    if (typeof schema.maxLength === "number" && str.length > schema.maxLength) {
        return {
            valid: false,
            errors: [`expected to be at most ${schema.maxLength} chars long`],
        };
    }

    return {
        valid: true,
    };
};
