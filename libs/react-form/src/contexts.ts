import { createContext } from 'react';
import type { FormSystemConfig } from './types.js';
import type { FormStore } from './FormStore.js';
import type {
    ObjectSchemaBuilder,
    PropertyDescriptorTree,
    PropertyDescriptorInner
} from '@cleverbrush/schema';
import type { UseSchemaFormOptions } from './types.js';

/**
 * Context for global form system configuration (renderers, etc).
 */
export const FormSystemContext = createContext<FormSystemConfig | null>(null);

/**
 * Internal form context value — used to bridge useSchemaForm store
 * to the context-based useField and Field component.
 */
export type FormContextValue = {
    store: FormStore;
    descriptorTree: PropertyDescriptorTree<any, any>;
    schema: ObjectSchemaBuilder<any, any, any>;
    options: UseSchemaFormOptions;
    pathMap: Map<PropertyDescriptorInner<any, any, any>, string>;
};

/**
 * Context for per-form data — allows useField to work via context.
 */
export const FormContext = createContext<FormContextValue | null>(null);
