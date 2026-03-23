import { highlightTS } from '@/lib/highlight';

export default function MapperPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/mapper</h1>
                    <p className="subtitle">
                        Type-safe object mapping between schemas with
                        compile-time completeness checking.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <div className="card">
                    <h2>Installation</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(
                                    `npm install @cleverbrush/mapper`
                                )
                            }}
                        />
                    </pre>
                    <p>
                        Requires <code>@cleverbrush/schema</code> as a peer
                        dependency.
                    </p>
                </div>

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/mapper?</h2>

                    <h3>The Problem</h3>
                    <p>
                        Converting between different object shapes — API
                        responses to domain models, domain models to DTOs,
                        database rows to view models — is tedious and
                        error-prone. You write manual mapping functions full of{' '}
                        <code>destination.x = source.y</code> assignments. Add
                        a new property to a schema and nothing tells you the
                        mapper is incomplete. The bug shows up at runtime, not
                        at compile time.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        <code>@cleverbrush/mapper</code> uses{' '}
                        <strong>PropertyDescriptor-based selectors</strong>{' '}
                        (similar to C# expression trees) for type-safe property
                        mapping. The TypeScript compiler enforces that{' '}
                        <strong>
                            every target property is mapped
                        </strong>{' '}
                        — unmapped properties cause a compile-time error. You
                        literally cannot forget a field.
                    </p>

                    <h3>Three Mapping Strategies</h3>
                    <ul>
                        <li>
                            <strong>
                                <code>.from()</code>
                            </strong>{' '}
                            — copy a value directly from a source property
                            (with nested path support)
                        </li>
                        <li>
                            <strong>
                                <code>.compute()</code>
                            </strong>{' '}
                            — transform or derive a value from the entire
                            source object
                        </li>
                        <li>
                            <strong>
                                <code>.ignore()</code>
                            </strong>{' '}
                            — explicitly exclude a property (tells the
                            compiler you intentionally skipped it)
                        </li>
                    </ul>

                    <h3>Auto-Mapping</h3>
                    <p>
                        Properties with the same name and compatible type are
                        automatically mapped — no configuration needed.
                        Registered nested schema mappings are applied
                        recursively. You only write mappings for properties
                        that differ between source and target.
                    </p>

                    <h3>Immutable Registry</h3>
                    <p>
                        The <code>configure()</code> method returns a{' '}
                        <strong>new registry</strong>, so you can build up
                        mappers incrementally without mutation. This makes it
                        safe to share a base registry across modules and extend
                        it per-context.
                    </p>

                    <h3>Production Tested</h3>
                    <p>
                        Every API response in{' '}
                        <a
                            href="https://cleverbrush.com/editor"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            cleverbrush.com/editor
                        </a>{' '}
                        is mapped through{' '}
                        <code>@cleverbrush/mapper</code> registries. It handles
                        dozens of schema-to-schema mappings in production every
                        day, including deeply nested objects and computed
                        properties.
                    </p>
                </div>

                {/* ── Quick Start ──────────────────────────────────── */}
                <div className="card">
                    <h2>Quick Start</h2>
                    <p>
                        Define source and target schemas, configure a mapping,
                        and transform objects:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number } from '@cleverbrush/schema';
import { MappingRegistry } from '@cleverbrush/mapper';

const ApiUser = object({
  first_name: string(),
  last_name:  string(),
  birth_year: number()
});

const DomainUser = object({
  fullName: string(),
  age:      number()
});

// Configure the mapping — returns a new (immutable) registry
const registry = new MappingRegistry()
  .configure(ApiUser, DomainUser, (m) =>
    m
      .for((t) => t.fullName)
        .compute((src) => src.first_name + ' ' + src.last_name)
      .for((t) => t.age)
        .compute((src) => new Date().getFullYear() - src.birth_year)
  );

// Get the mapper function
const mapper = registry.getMapper(ApiUser, DomainUser);

// Map an object
const user = await mapper({
  first_name: 'Jane',
  last_name:  'Doe',
  birth_year: 1995
});
// { fullName: 'Jane Doe', age: <current year - 1995> }`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Compile-Time Safety ──────────────────────────── */}
                <div className="card">
                    <h2>Compile-Time Safety</h2>
                    <p>
                        One of the most powerful features of{' '}
                        <code>@cleverbrush/mapper</code> is that the TypeScript
                        compiler catches mapping mistakes before your code
                        runs. Here are three examples:
                    </p>

                    <h3>1. Unmapped Properties Error</h3>
                    <p>
                        If you forget to map a property, calling{' '}
                        <code>.getMapper()</code> produces a compile-time
                        error:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const registry = new MappingRegistry()
  .configure(ApiUser, DomainUser, (m) =>
    m
      .for((t) => t.fullName)
        .compute((src) => src.first_name + ' ' + src.last_name)
      // Oops — forgot to map 'age'!
      .getMapper()
      // TS Error: Property 'getMapper' does not exist on type
      // Mapper<..., "age", ...>
      // The type tracks unmapped properties and only exposes
      // getMapper() when all properties are accounted for.
  );`)
                            }}
                        />
                    </pre>

                    <h3>2. Type-Incompatible Mapping Error</h3>
                    <p>
                        If you use <code>.from()</code> to copy a property but
                        the types don&apos;t match, TypeScript catches it:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// Trying to map a string source to a number target
m.for((t) => t.age)
  .from((src) => src.first_name)
  // TS Error: string is not assignable to number
  // Use .compute() instead to transform the value`)
                            }}
                        />
                    </pre>

                    <h3>3. Unregistered Nested Mapping Error</h3>
                    <p>
                        If your target has a nested object schema and no
                        mapping is registered for it, you get a compile-time
                        error when the inner schema cannot be auto-mapped:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const Source = object({ address: SourceAddress });
const Target = object({ address: TargetAddress });

// If SourceAddress -> TargetAddress mapping is not registered,
// the compiler will flag the unmapped nested properties.
// Register it first, then the parent mapping will auto-apply it.`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Auto-Mapping ─────────────────────────────────── */}
                <div className="card">
                    <h2>Auto-Mapping</h2>
                    <p>
                        When source and target schemas share properties with
                        the same name and compatible types, those properties
                        are mapped automatically. You only need to configure
                        properties that differ:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const Source = object({
  id:    string(),
  name:  string(),
  email: string(),
  age:   number()
});

const Target = object({
  id:       string(),    // same name + type → auto-mapped
  name:     string(),    // same name + type → auto-mapped
  email:    string(),    // same name + type → auto-mapped
  ageGroup: string()     // different name → must be configured
});

const registry = new MappingRegistry()
  .configure(Source, Target, (m) =>
    m
      .for((t) => t.ageGroup)
        .compute((src) => src.age < 18 ? 'minor' : 'adult')
      // id, name, email are auto-mapped — no configuration needed!
  );`)
                            }}
                        />
                    </pre>
                    <p>
                        For nested object schemas, if a mapping between the
                        nested source and target schemas is registered in the
                        same registry, it will be applied recursively:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const SourceAddr = object({ line1: string(), line2: string() });
const TargetAddr = object({ fullAddress: string() });

const Source = object({ name: string(), address: SourceAddr });
const Target = object({ name: string(), address: TargetAddr });

// Register the nested mapping first
let registry = new MappingRegistry()
  .configure(SourceAddr, TargetAddr, (m) =>
    m.for((t) => t.fullAddress)
      .compute((src) => src.line1 + ', ' + src.line2)
  );

// Now the parent mapping auto-applies the nested one
registry = registry.configure(Source, Target, (m) =>
  m // name is auto-mapped, address uses the registered nested mapping
);`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Mapping Strategies ───────────────────────────── */}
                <div className="card">
                    <h2>Mapping Strategies</h2>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Strategy</th>
                                    <th>Usage</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>.from(selector)</code>
                                    </td>
                                    <td>
                                        <code>
                                            .for(t =&gt; t.name).from(s =&gt;
                                            s.name)
                                        </code>
                                    </td>
                                    <td>
                                        Copy a value directly from a source
                                        property. Types must be compatible.
                                        Supports nested paths.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.compute(fn)</code>
                                    </td>
                                    <td>
                                        <code>
                                            .for(t =&gt; t.fullName).compute(s
                                            =&gt; s.first + &apos; &apos; +
                                            s.last)
                                        </code>
                                    </td>
                                    <td>
                                        Compute the target value from the
                                        entire source object. Can be sync or
                                        async. Use for transformations,
                                        concatenation, lookups, etc.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.ignore()</code>
                                    </td>
                                    <td>
                                        <code>
                                            .for(t =&gt; t.internal).ignore()
                                        </code>
                                    </td>
                                    <td>
                                        Explicitly exclude a target property.
                                        The property will be{' '}
                                        <code>undefined</code> in the output.
                                        Tells the compiler you intentionally
                                        skipped it.
                                    </td>
                                </tr>
                                <tr>
                                    <td>Auto-mapped</td>
                                    <td>(implicit)</td>
                                    <td>
                                        Same-name, same-type properties are
                                        automatically copied. Registered
                                        nested schema mappings are applied
                                        recursively.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Comparison ───────────────────────────────────── */}
                <div className="card">
                    <h2>Comparison with Alternatives</h2>
                    <div className="table-wrap">
                        <table className="comparison-table">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>@cleverbrush/mapper</th>
                                    <th>AutoMapper-ts</th>
                                    <th>class-transformer</th>
                                    <th>morphism</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Schema-driven mapping</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Compile-time completeness</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>No decorators required</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="check">✓</td>
                                </tr>
                                <tr>
                                    <td>Works without classes</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="check">✓</td>
                                </tr>
                                <tr>
                                    <td>Central registry</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Custom transforms</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="partial">~</td>
                                    <td className="check">✓</td>
                                </tr>
                                <tr>
                                    <td>Auto-mapping</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Type-safe selectors</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Immutable registry</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Nested schema support</td>
                                    <td className="check">✓</td>
                                    <td className="partial">~</td>
                                    <td className="partial">~</td>
                                    <td className="cross">✗</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── API Reference ────────────────────────────────── */}
                <div className="card">
                    <h2>API Reference</h2>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Class / Method</th>
                                    <th>Description</th>
                                    <th>Signature</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>MappingRegistry</code>
                                    </td>
                                    <td>
                                        Central registry holding all
                                        schema-to-schema mappings
                                    </td>
                                    <td>
                                        <code>new MappingRegistry()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.configure(from, to, fn)</code>
                                    </td>
                                    <td>
                                        Register a mapping between two schemas.
                                        Returns a new registry (immutable).
                                    </td>
                                    <td>
                                        <code>
                                            (from, to, fn) =&gt;
                                            MappingRegistry
                                        </code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.getMapper(from, to)</code>
                                    </td>
                                    <td>
                                        Retrieve the mapping function for a
                                        registered pair of schemas.
                                    </td>
                                    <td>
                                        <code>
                                            (from, to) =&gt; (obj) =&gt;
                                            Promise&lt;T&gt;
                                        </code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>Mapper.for(selector)</code>
                                    </td>
                                    <td>
                                        Select a target property to configure
                                        (returns PropertyMappingBuilder).
                                    </td>
                                    <td>
                                        <code>
                                            (t =&gt; t.prop) =&gt;
                                            PropertyMappingBuilder
                                        </code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.from(selector)</code>
                                    </td>
                                    <td>
                                        Copy value from a source property.
                                        Types must be compatible.
                                    </td>
                                    <td>
                                        <code>
                                            (s =&gt; s.prop) =&gt; Mapper
                                        </code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.compute(fn)</code>
                                    </td>
                                    <td>
                                        Compute target value from source
                                        object. Sync or async.
                                    </td>
                                    <td>
                                        <code>
                                            (src =&gt; value) =&gt; Mapper
                                        </code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.ignore()</code>
                                    </td>
                                    <td>
                                        Explicitly exclude this target
                                        property.
                                    </td>
                                    <td>
                                        <code>() =&gt; Mapper</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.getMapper()</code>
                                    </td>
                                    <td>
                                        Get mapping function from a fully
                                        configured Mapper. Only available when
                                        all properties are mapped.
                                    </td>
                                    <td>
                                        <code>
                                            () =&gt; (obj) =&gt;
                                            Promise&lt;T&gt;
                                        </code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>
                                            MapperConfigurationError
                                        </code>
                                    </td>
                                    <td>
                                        Thrown at runtime when a mapping
                                        configuration is incomplete or
                                        invalid.
                                    </td>
                                    <td>
                                        <code>extends Error</code>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
