import {
    InferType,
    NestedValidationError,
    PropertyDescriptorInner,
    PropertyDescriptorTree,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from './SchemaBuilder.js';

import { ObjectSchemaBuilder } from './ObjectSchemaBuilder.js';

/**
 * Mutable container for nested validation errors associated with a specific
 * property descriptor. Implements {@link NestedValidationError} and tracks
 * the seen value, accumulated error messages, and child errors for
 * nested object properties.
 *
 * Used internally by `ObjectSchemaBuilder` during validation to build up
 * a tree of per-property validation results.
 */
export class PropertyValidationError<
    TSchema extends ObjectSchemaBuilder<any, any, any> = ObjectSchemaBuilder<
        any,
        any,
        any
    >,
    TRootSchema extends ObjectSchemaBuilder<any, any, any> =
        ObjectSchemaBuilder<any, any, any>,
    TParentPropertyDescriptor = any
> implements NestedValidationError<
    TSchema,
    TRootSchema,
    TParentPropertyDescriptor
> {
    #descriptor: PropertyDescriptorTree<
        TSchema,
        TRootSchema,
        any,
        TParentPropertyDescriptor
    >;
    #rootObjectValue: InferType<TRootSchema> | undefined;
    #errors: string[] = [];
    #childErrors: NestedValidationError<any, any, any>[] = [];

    /**
     * The value that was seen at the property location described by the descriptor.
     * Retrieves the value from the root object using the property descriptor's `getValue` method.
     * Returns `undefined` if the property is not found.
     */
    public get seenValue(): InferType<TSchema> | undefined {
        const result = this.#descriptor[
            SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
        ].getValue(this.#rootObjectValue as any);

        return (result.success ? result.value : undefined) as any;
    }

    /**
     * The list of validation error messages accumulated for this property.
     */
    public get errors(): ReadonlyArray<string> {
        return this.#errors;
    }

    /**
     * Whether validation passed for this property and all of its children.
     * Returns `true` only when there are no errors and no child errors.
     */
    public get isValid(): boolean {
        return this.#errors.length === 0 && this.getChildErrors().length === 0;
    }

    /**
     * Returns the list of child `NestedValidationError` instances
     * representing validation errors for nested properties.
     */
    public getChildErrors(): ReadonlyArray<
        NestedValidationError<any, any, any>
    > {
        return this.#childErrors;
    }

    /**
     * The inner property descriptor providing `getValue`, `setValue`, and `getSchema`
     * operations for the property this error relates to.
     */
    public get descriptor(): PropertyDescriptorInner<
        TRootSchema,
        TSchema,
        TParentPropertyDescriptor
    > {
        return this.#descriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR] as any;
    }

    /**
     * Creates a new `PropertyValidationError`.
     *
     * @param descriptor - the property descriptor tree node this error is associated with;
     *   must be a valid descriptor (checked via `ObjectSchemaBuilder.isValidPropertyDescriptor`)
     * @param rootObjectValue - the root object being validated, used to resolve property values
     * @param errors - optional initial list of error message strings
     * @throws if `descriptor` is not a valid property descriptor
     */
    constructor(
        descriptor: PropertyDescriptorTree<
            TSchema,
            TRootSchema,
            any,
            TParentPropertyDescriptor
        >,
        rootObjectValue: InferType<TRootSchema> | undefined,
        errors?: string[]
    ) {
        if (!ObjectSchemaBuilder.isValidPropertyDescriptor(descriptor)) {
            throw new Error('Invalid property descriptor');
        }
        this.#descriptor = descriptor;
        this.#errors = Array.isArray(errors) ? [...errors] : [];
        this.#rootObjectValue = rootObjectValue;
    }

    /**
     * Appends a validation error message to this property's error list.
     * @param error - the error message string to add
     */
    addError(error: string): void {
        this.#errors.push(error);
    }

    /**
     * Appends a child `NestedValidationError` for a nested property.
     * @param childError - the child validation error to add
     */
    addChildError(childError: NestedValidationError<any, any, any>): void {
        this.#childErrors.push(childError);
    }
}
