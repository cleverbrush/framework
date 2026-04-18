import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import Link from 'next/link';

export default function WhySection() {
    return (
        <>
            <div className="section-header">
                <h1>Why @cleverbrush/schema?</h1>
                <p className="subtitle">
                    One schema definition that drives your types, validation,
                    API contracts, forms, and documentation — with zero
                    duplication.
                </p>
            </div>

            {/* ── The Problem ──────────────────────────────────── */}
            <div className="why-box">
                <h2>The Problem</h2>
                <p>
                    In a typical TypeScript project, types and runtime
                    validation live in separate worlds. You define a{' '}
                    <code>User</code> interface in one file, then write
                    validation rules in another — using Joi, Yup, Zod, or manual{' '}
                    <code>if</code> checks. Over time these drift apart: the
                    type says a field is required, but the validator allows{' '}
                    <code>undefined</code>. Tests pass, but production breaks
                    because the validation didn&apos;t match the type.
                </p>
                <p>
                    Then you need the same shape in your API contract, your form
                    fields, your OpenAPI spec, and your object mapper. Each
                    concern re-describes the same data shape — and each is
                    another place for things to go wrong.
                </p>
            </div>

            {/* ── The Solution ─────────────────────────────────── */}
            <div className="card">
                <h2>The Solution: Define Once, Use Everywhere</h2>
                <p>
                    <code>@cleverbrush/schema</code> lets you define a schema{' '}
                    <strong>once</strong> and derive everything from it:
                </p>
                <ul>
                    <li>
                        <strong>TypeScript types</strong> — via{' '}
                        <code>InferType&lt;typeof MySchema&gt;</code>, no
                        duplicate interfaces
                    </li>
                    <li>
                        <strong>Runtime validation</strong> — with typed
                        per-field error access
                    </li>
                    <li>
                        <strong>API contracts</strong> — define endpoints that
                        reference schemas, generate typed clients automatically
                    </li>
                    <li>
                        <strong>React forms</strong> — headless form generation
                        from schema PropertyDescriptors
                    </li>
                    <li>
                        <strong>Object mapping</strong> — type-safe mapping
                        between two schemas with compile-time completeness
                        checks
                    </li>
                    <li>
                        <strong>JSON Schema / OpenAPI</strong> — bidirectional
                        conversion with <code>toJsonSchema()</code> and{' '}
                        <code>fromJsonSchema()</code>
                    </li>
                </ul>

                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { object, string, number, type InferType } from '@cleverbrush/schema';

// Define once
const UserSchema = object({
  name:  string().minLength(2).describe('Display name'),
  email: string().email().describe('Primary email'),
  age:   number().min(0).max(150)
});

// ── Types ─────────────────────────────────────────────
type User = InferType<typeof UserSchema>;
// { name: string; email: string; age: number }

// ── Validation ────────────────────────────────────────
const result = UserSchema.validate(untrustedInput);
if (!result.valid) {
  const emailErrors = result.getErrorsFor(u => u.email); // typed!
}

// ── The same schema powers mapper, react-form, JSON Schema, server endpoints…`)
                        }}
                    />
                </pre>
            </div>

            {/* ── Ecosystem Diagram ────────────────────────────── */}
            <div className="card">
                <h2>One Schema, Many Consumers</h2>
                <p>
                    The schema sits at the center of an ecosystem. Each
                    companion package reads the schema&apos;s introspection data
                    — no adapters, no code generation, no drift.
                </p>
                <div className="ecosystem-diagram">
                    <div className="ecosystem-center">
                        <div className="ecosystem-core">
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            @cleverbrush/schema
                        </div>
                    </div>
                    <div className="ecosystem-spokes">
                        <div className="ecosystem-spoke">
                            <div>
                                <strong>@cleverbrush/mapper</strong>
                                <span>Type-safe object mapping</span>
                            </div>
                        </div>
                        <div className="ecosystem-spoke">
                            <div>
                                <strong>@cleverbrush/react-form</strong>
                                <span>Schema-driven React forms</span>
                            </div>
                        </div>
                        <div className="ecosystem-spoke">
                            <div>
                                <strong>@cleverbrush/schema-json</strong>
                                <span>Bidirectional JSON Schema</span>
                            </div>
                        </div>
                        <div className="ecosystem-spoke">
                            <div>
                                <strong>@cleverbrush/server</strong>
                                <span>
                                    Type-safe endpoints &amp; auto-typed clients
                                </span>
                            </div>
                        </div>
                        <div className="ecosystem-spoke">
                            <div>
                                <strong>@cleverbrush/server-openapi</strong>
                                <span>OpenAPI spec generation</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Three Superpowers ─────────────────────────────── */}
            <div className="card">
                <h2>What No Other Schema Library Offers</h2>
                <p>
                    If you know Zod, you already know most of the API. These
                    three capabilities are what set @cleverbrush/schema apart:
                </p>

                <h3>1. Type-safe Extension System</h3>
                <p>
                    Add your own methods to schema builders — fully typed,
                    autocomplete-ready. The built-in <code>.email()</code>,{' '}
                    <code>.url()</code>, <code>.uuid()</code> methods use the
                    same public extension API. No other schema library supports
                    this.
                </p>
                <p>
                    <Link href="/docs/extensions">
                        Learn more about Extensions →
                    </Link>
                </p>

                <h3>2. Generic / Parameterized Schemas</h3>
                <p>
                    Create schema templates with type parameters using{' '}
                    <code>generic()</code>. Apply them with{' '}
                    <code>.apply()</code> to produce concrete schemas — with
                    full introspection preserved. Competitors require plain
                    functions that lose schema metadata.
                </p>
                <p>
                    <Link href="/docs/generic-schemas">
                        Learn more about Generic Schemas →
                    </Link>
                </p>

                <h3>3. PropertyDescriptors &amp; Typed Field Navigation</h3>
                <p>
                    Every schema exposes a typed property descriptor tree.
                    Navigate fields with arrow functions like{' '}
                    <code>u =&gt; u.address.city</code> — TypeScript verifies
                    the path at compile time. This powers the mapper, react-form
                    auto-generation, and typed error access. No magic strings,
                    no runtime surprises.
                </p>
                <p>
                    <Link href="/docs/property-descriptors">
                        Learn more about PropertyDescriptors →
                    </Link>
                </p>
            </div>

            {/* ── Production Tested ────────────────────────────── */}
            <div className="card">
                <h2>Production Tested</h2>
                <p>
                    Every form, every API response mapping, and every validation
                    rule in{' '}
                    <a
                        href="https://cleverbrush.com/editor"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        cleverbrush.com/editor
                    </a>{' '}
                    is powered by <code>@cleverbrush/schema</code>. It handles
                    hundreds of schemas with nested objects, async validators,
                    and custom error messages in production every day.
                </p>
            </div>

            <div className="card">
                <h2>Next Steps</h2>
                <ul>
                    <li>
                        <Link href="/docs/getting-started">
                            Getting Started →
                        </Link>{' '}
                        — install and build your first schema
                    </li>
                    <li>
                        <Link href="/docs/comparison">Comparison →</Link> —
                        detailed feature comparison with Zod, Valibot, and
                        ArkType
                    </li>
                    <li>
                        <Link href="/playground">Playground →</Link> — try
                        schemas live in the browser
                    </li>
                </ul>
            </div>
        </>
    );
}
