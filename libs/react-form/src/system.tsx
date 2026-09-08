import type {
    InferType,
    ObjectSchemaBuilder,
    PropertyDescriptorTree,
    SchemaBuilder
} from '@cleverbrush/schema';
import { SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR } from '@cleverbrush/schema';
import type { ReactNode } from 'react';
import { Field, type FieldProps, FormSystemProvider } from './components.js';
import { getSchemaType } from './helpers.js';
import type { SchemaFormInstance } from './hooks.js';
import type { FieldRenderer } from './types.js';

declare const rendererTypes: unique symbol;

/** A renderer whose accepted values and custom props survive registration. */
export type TypedFieldRenderer<TValue, TProps> = FieldRenderer<
    TValue,
    TProps
> & {
    readonly [rendererTypes]: { value: TValue; props: TProps };
};

/**
 * Attach type information without adding a UI dependency or runtime wrapper.
 * Include null in TValue when the renderer supports nullable fields.
 */
export function defineFieldRenderer<TValue, TProps = Record<string, never>>(
    renderer: FieldRenderer<TValue, TProps>
): TypedFieldRenderer<TValue, TProps> {
    return renderer as TypedFieldRenderer<TValue, TProps>;
}

export type TypedRendererRegistry = Readonly<
    Record<string, TypedFieldRenderer<any, any>>
>;

type ValueOf<T> = T extends TypedFieldRenderer<infer V, any> ? V : never;
type PropsOf<T> = T extends TypedFieldRenderer<any, infer P> ? P : never;
type KindOf<T> = 0 extends 1 & T
    ? string
    : [NonNullable<T>] extends [string]
      ? 'string'
      : [NonNullable<T>] extends [number]
        ? 'number'
        : [NonNullable<T>] extends [boolean]
          ? 'boolean'
          : [NonNullable<T>] extends [Date]
            ? 'date'
            : [NonNullable<T>] extends [readonly unknown[]]
              ? 'array'
              : [NonNullable<T>] extends [object]
                ? 'object'
                : never;
type CustomProps<P> = {} extends P ? { fieldProps?: P } : { fieldProps: P };
type RendererChoice<R extends TypedRendererRegistry, V> = {
    [K in keyof R & string]: [Exclude<V, undefined>] extends [ValueOf<R[K]>]
        ? K extends `${KindOf<V>}:${infer Variant}`
            ? { variant: Variant } & CustomProps<PropsOf<R[K]>>
            : K extends KindOf<V>
              ? { variant?: undefined } & CustomProps<PropsOf<R[K]>>
              : never
        : never;
}[keyof R & string];

type FieldDescriptor = {
    readonly [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: {
        getSchema: () => SchemaBuilder<any, any, any>;
    };
};
type DescriptorValue<D extends FieldDescriptor> = InferType<
    ReturnType<D[typeof SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]['getSchema']>
>;

/** Props are inferred from the selected schema property and registered variant. */
export type TypedFieldProps<
    R extends TypedRendererRegistry,
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    TDescriptor extends FieldDescriptor
> = {
    form: SchemaFormInstance<TSchema>;
    forProperty: (
        tree: PropertyDescriptorTree<TSchema, TSchema>
    ) => TDescriptor;
    label?: string;
    name?: string;
} & RendererChoice<R, NoInfer<DescriptorValue<TDescriptor>>>;

/**
 * Create a typed Field and a provider for an application's renderer registry.
 * The typed Field resolves from this factory's closed registry, so an untyped
 * ancestor provider cannot silently replace a renderer with incompatible props.
 * The Provider also configures legacy Field consumers and supports nesting.
 * Extend a system with createFormSystem({ renderers: { ...system.renderers,
 * 'string:custom': customRenderer } }). Existing global APIs remain available.
 */
export function createFormSystem<
    const R extends TypedRendererRegistry
>(config: { renderers: R }) {
    const renderers = Object.freeze({ ...config.renderers });
    function TypedField<
        TSchema extends ObjectSchemaBuilder<any, any, any>,
        TDescriptor extends FieldDescriptor
    >(props: TypedFieldProps<R, TSchema, TDescriptor>): ReactNode {
        const descriptor = props.forProperty(
            props.form._getFormContext()
                .descriptorTree as PropertyDescriptorTree<TSchema, TSchema>
        );
        const type = getSchemaType(
            descriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].getSchema()
        );
        const key = props.variant ? `${type}:${props.variant}` : type;
        const renderer = renderers[key];
        if (!renderer)
            throw new Error(
                `No renderer registered for "${key}" in this form system.`
            );
        // Field's legacy signature erases descriptor parent types. The factory
        // has already checked the selected value and renderer-specific props.
        return (
            <Field
                {...(props as unknown as FieldProps<TSchema>)}
                renderer={renderer}
            />
        );
    }
    function Provider({ children }: { children: ReactNode }): ReactNode {
        return (
            <FormSystemProvider renderers={renderers}>
                {children}
            </FormSystemProvider>
        );
    }
    return { Field: TypedField, Provider, renderers };
}
