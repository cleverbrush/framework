import { highlightTS } from '@/lib/highlight';

export default function ApiReferenceSection() {
    return (
        <>
            <div className="card">
                <h2>API Reference</h2>

                <h3>Builder Functions</h3>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Function</th>
                                <th>Description</th>
                                <th>Key Methods</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>any()</code>
                                </td>
                                <td>Accepts any value</td>
                                <td>
                                    <code>.optional()</code>,{' '}
                                    <code>.default(value)</code>,{' '}
                                    <code>.catch(value)</code>,{' '}
                                    <code>.addValidator(fn)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>string()</code>
                                </td>
                                <td>String schema builder</td>
                                <td>
                                    <code>.minLength(n)</code>,{' '}
                                    <code>.maxLength(n)</code>,{' '}
                                    <code>.matches(re)</code>,{' '}
                                    <code>.email()</code>, <code>.url()</code>,{' '}
                                    <code>.uuid()</code>, <code>.ip()</code>,{' '}
                                    <code>.trim()</code>,{' '}
                                    <code>.toLowerCase()</code>,{' '}
                                    <code>.nonempty()</code>,{' '}
                                    <code>.default(value)</code>,{' '}
                                    <code>.catch(value)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>number()</code>
                                </td>
                                <td>Number schema builder</td>
                                <td>
                                    <code>.min(n)</code>, <code>.max(n)</code>,{' '}
                                    <code>.integer()</code>,{' '}
                                    <code>.positive()</code>,{' '}
                                    <code>.negative()</code>,{' '}
                                    <code>.finite()</code>,{' '}
                                    <code>.multipleOf(n)</code>,{' '}
                                    <code>.default(value)</code>,{' '}
                                    <code>.catch(value)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>boolean()</code>
                                </td>
                                <td>Boolean schema builder</td>
                                <td>
                                    <code>.optional()</code>,{' '}
                                    <code>.default(value)</code>,{' '}
                                    <code>.catch(value)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>date()</code>
                                </td>
                                <td>Date schema builder</td>
                                <td>
                                    <code>.optional()</code>,{' '}
                                    <code>.default(value)</code>,{' '}
                                    <code>.catch(value)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>func()</code>
                                </td>
                                <td>Function schema builder</td>
                                <td>
                                    <code>.optional()</code>,{' '}
                                    <code>.default(value)</code>,{' '}
                                    <code>.catch(value)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>object({'{...}'})</code>
                                </td>
                                <td>Object schema with named properties</td>
                                <td>
                                    <code>.validate(data)</code>,{' '}
                                    <code>.validateAsync(data)</code>,{' '}
                                    <code>.addProps({'{...}'})</code>,{' '}
                                    <code>.default(value)</code>,{' '}
                                    <code>.catch(value)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>array(schema)</code>
                                </td>
                                <td>Array of items schema</td>
                                <td>
                                    <code>.minLength(n)</code>,{' '}
                                    <code>.maxLength(n)</code>,{' '}
                                    <code>.of(schema)</code>,{' '}
                                    <code>.nonempty()</code>,{' '}
                                    <code>.unique()</code>,{' '}
                                    <code>.default(value)</code>,{' '}
                                    <code>.catch(value)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>union(...schemas)</code>
                                </td>
                                <td>Union of schemas</td>
                                <td>
                                    <code>.validate(data)</code>,{' '}
                                    <code>.validateAsync(data)</code>,{' '}
                                    <code>.default(value)</code>,{' '}
                                    <code>.catch(value)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>lazy(getter)</code>
                                </td>
                                <td>
                                    Recursive / self-referential schema builder
                                </td>
                                <td>
                                    <code>.resolve()</code>,{' '}
                                    <code>.optional()</code>,{' '}
                                    <code>.addValidator(fn)</code>,{' '}
                                    <code>.default(value)</code>,{' '}
                                    <code>.catch(value)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>extern(standardSchema)</code>
                                </td>
                                <td>
                                    Wraps an external Standard Schema v1 schema
                                    (Zod, Valibot, ArkType, …) into a native
                                    builder
                                </td>
                                <td>
                                    <code>.validate(data)</code>,{' '}
                                    <code>.optional()</code>,{' '}
                                    <code>.nullable()</code>,{' '}
                                    <code>.default(value)</code>,{' '}
                                    <code>.catch(value)</code>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3>Extension Functions</h3>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Function</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>defineExtension(config)</code>
                                </td>
                                <td>
                                    Defines an extension targeting one or more
                                    builder types. Returns a branded{' '}
                                    <code>ExtensionDescriptor</code>.
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>withExtensions(...exts)</code>
                                </td>
                                <td>
                                    Creates augmented builder factories with
                                    extension methods applied. Accepts one or
                                    more <code>ExtensionDescriptor</code>s.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3>Utility Types</h3>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>InferType&lt;T&gt;</code>
                                </td>
                                <td>
                                    Extracts the TypeScript type from a schema
                                    definition.{' '}
                                    <code>
                                        type User = InferType&lt;typeof
                                        UserSchema&gt;
                                    </code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>ValidationResult</code>
                                </td>
                                <td>
                                    Result of <code>.validate()</code>. Contains{' '}
                                    <code>valid</code>, <code>errors</code>, and{' '}
                                    <code>object</code>. For object schemas,
                                    also includes <code>getErrorsFor()</code> (
                                    <code>errors</code> is{' '}
                                    <strong>deprecated</strong> on object schema
                                    results).
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>ValidationError</code>
                                </td>
                                <td>
                                    Individual error:{' '}
                                    <code>{'{ message: string }'}</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>PropertyDescriptor</code>
                                </td>
                                <td>
                                    Runtime metadata for a schema property
                                    (type, constraints, getters/setters).
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>PropertyDescriptorTree</code>
                                </td>
                                <td>
                                    Tree of PropertyDescriptors for an object
                                    schema. Used as selectors in mapper and form
                                    libraries.
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>MakeOptional</code>
                                </td>
                                <td>
                                    Utility type that makes a type optional
                                    (used internally by <code>InferType</code>).
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Exports ──────────────────────────────────────── */}
            <div className="card">
                <h2>Exports</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`// Builder functions
export { any, lazy, array, boolean, date, func, number, object, string, union }

// Builder classes
export {
  SchemaBuilder, AnySchemaBuilder, ArraySchemaBuilder,
  BooleanSchemaBuilder, DateSchemaBuilder, FunctionSchemaBuilder,
  LazySchemaBuilder, NumberSchemaBuilder, ObjectSchemaBuilder,
  StringSchemaBuilder, UnionSchemaBuilder
}

// Extension system
export { defineExtension, withExtensions }
export { stringExtensions, numberExtensions, arrayExtensions } // built-in extension descriptors
export type { ExtensionConfig, ExtensionDescriptor }

// Sub-path export: bare builders without built-in extensions
// import { string } from '@cleverbrush/schema/core'

// Types
export type {
  InferType, MakeOptional, ValidationError, ValidationResult,
  PropertyDescriptor, PropertyDescriptorInner, PropertyDescriptorTree,
  PropertySetterOptions, SchemaPropertySelector
}

// Standard Schema
// Re-exported from @standard-schema/spec — use for typing custom integrations
export type { StandardSchemaV1 } from '@standard-schema/spec'`)
                        }}
                    />
                </pre>
            </div>
        </>
    );
}
