import {
    InferType,
    NestedValidationError,
    PropertyDescriptorInner,
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
    > = ObjectSchemaBuilder<any, any, any>,
    TParentPropertyDescriptor = any
> implements
        NestedValidationError<TSchema, TRootSchema, TParentPropertyDescriptor>
{
    #descriptor: PropertyDescriptorTree<
        TSchema,
        TRootSchema,
        any,
        TParentPropertyDescriptor
    >;
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

    public getChildErrors(): NestedValidationError<any, any, any>[] {
        return [];
    }

    public get descriptor(): PropertyDescriptorInner<
        TRootSchema,
        TSchema,
        TParentPropertyDescriptor
    > {
        return this.#descriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR] as any;
    }

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

    addError(error: string): void {
        this.#errors.push(error);
    }
}
