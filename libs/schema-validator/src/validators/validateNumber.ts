import {
    ValidationResult,
    NumberSchemaDefinition,
    ISchemaValidator,
} from "../index";

export const validateNumber = async (
    obj: any,
    schema: NumberSchemaDefinition<any>,
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
    if (typeof obj !== "number")
        return {
            valid: false,
            errors: [`expected type number, but saw ${typeof obj}`],
        };

    if (typeof schema === "number") {
        return obj === schema
            ? { valid: true }
            : {
                  valid: false,
                  errors: [`should be equal to ${schema}`],
              };
    }

    const num = obj as number;

    if (schema.ensureNotNaN && Number.isNaN(num)) {
        return {
            valid: false,
            errors: ["is not expected to be NaN"],
        };
    }

    if (
        schema.ensureIsFinite &&
        !Number.isFinite(num) &&
        schema.ensureNotNaN &&
        !Number.isNaN(num)
    ) {
        return {
            valid: false,
            errors: ["is expected to be a finite number"],
        };
    }

    if (typeof schema.equals !== "undefined" && num !== schema.equals) {
        return {
            valid: false,
            errors: [`expected to be equal to ${schema.equals}`],
        };
    }

    if (typeof schema.min !== "undefined") {
        if (typeof schema.min !== "number")
            throw new Error("min constraint should be a number");
        if (num < schema.min)
            return {
                valid: false,
                errors: [`expected to be at least ${schema.min}`],
            };
    }

    if (typeof schema.max !== "undefined") {
        if (typeof schema.max !== "number")
            throw new Error("max constraint should be a number");
        if (num > schema.max)
            return {
                valid: false,
                errors: [`expected to be no more than ${schema.max}`],
            };
    }

    return {
        valid: true,
    };
};
