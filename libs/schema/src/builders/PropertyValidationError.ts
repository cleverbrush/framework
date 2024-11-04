import {
    InferType,
    NestedValidationError,
    PropertyDescriptorTree,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from './SchemaBuilder.js';

import { ObjectSchemaBuilder } from './ObjectSchemaBuilder.js';

export class PropertyValidationError<
    TSchema extends ObjectSchemaBuilder<any, any, any> = ObjectSchemaBuilder<
        any,
        any,
        any
    >,
    TRootSchema extends ObjectSchemaBuilder<
        any,
        any,
        any
    > = ObjectSchemaBuilder<any, any, any>
> implements NestedValidationError<InferType<TSchema>>
{
    #descriptor: PropertyDescriptorTree<TSchema, TRootSchema>;
    #rootObjectValue: InferType<TRootSchema> | undefined;
    #errors: string[] = [];

    public get seenValue(): InferType<TSchema> | undefined {
        const result = this.#descriptor[
            SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
        ].getValue(this.#rootObjectValue as any);

        return (result.success ? result.value : undefined) as any;
    }

    public get errors(): ReadonlyArray<string> {
        return this.#errors;
    }

    public get isValid(): boolean {
        return this.#errors.length === 0;
    }

    public getChildErrors(): NestedValidationError[] {
        return [];
    }

    public get descriptor(): PropertyDescriptorTree<TSchema, TRootSchema> {
        return this.#descriptor;
    }

    constructor(
        descriptor: PropertyDescriptorTree<TSchema, TRootSchema>,
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

    addError(error: string): void {
        this.#errors.push(error);
    }
}
