import Link from 'next/link';
import { highlightTS } from '@/lib/highlight';

export default function HomePage() {
    return (
        <>
            <section className="hero">
                <p className="hero-eyebrow">Strongly Typed Full-Stack Libraries</p>
                <h1>Your types are your safety net.<br />We make them work harder.</h1>
                <p className="tagline">
                    Open-source TypeScript libraries for front-end and back-end
                    web apps. Schema validation, object mapping, headless React
                    forms — all with end-to-end type safety so the compiler
                    catches mistakes before your users do.
                </p>
                <div className="hero-actions">
                    <a
                        href="#libraries"
                        className="hero-btn hero-btn-primary"
                    >
                        Get Started
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </a>
                    <a
                        href="https://github.com/cleverbrush/framework"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hero-btn hero-btn-secondary"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                    </a>
                </div>
                <div className="hero-badges">
                    <span className="badge">End-to-end type safety</span>
                    <span className="badge">Front-end &amp; back-end</span>
                    <span className="badge">Zero dependencies*</span>
                    <span className="badge">Compile-time guarantees</span>
                    <span className="badge">BSD-3 Licensed</span>
                </div>
            </section>

            <section className="section" id="libraries">
                <div className="container">
                    <h2 className="section-title">The Libraries</h2>
                    <div className="lib-cards">
                        <Link href="/schema" className="lib-card">
                            <div className="lib-card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                                </svg>
                            </div>
                            <h3>@cleverbrush/schema</h3>
                            <p>
                                Immutable, composable schema definitions with
                                built-in validation and TypeScript type
                                inference. Define once — get types, validation,
                                and runtime introspection from a single source.
                            </p>
                            <span className="lib-card-link">
                                Explore docs <span aria-hidden="true">→</span>
                            </span>
                        </Link>
                        <Link href="/mapper" className="lib-card">
                            <div className="lib-card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                                </svg>
                            </div>
                            <h3>@cleverbrush/mapper</h3>
                            <p>
                                Type-safe object mapping between schemas with
                                compile-time completeness checking. Never miss a
                                property when converting between object shapes.
                            </p>
                            <span className="lib-card-link">
                                Explore docs <span aria-hidden="true">→</span>
                            </span>
                        </Link>
                        <Link href="/react-form" className="lib-card">
                            <div className="lib-card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
                                </svg>
                            </div>
                            <h3>@cleverbrush/react-form</h3>
                            <p>
                                Headless, schema-driven React forms. Define your
                                schema once and get validated forms with any UI
                                library — Material UI, Ant Design, or plain
                                HTML.
                            </p>
                            <span className="lib-card-link">
                                Explore docs <span aria-hidden="true">→</span>
                            </span>
                        </Link>
                    </div>

                    <div className="card" style={{ marginTop: '2.5rem' }}>
                        <h3>How They Work Together</h3>
                        <p>
                            The three libraries share a single source of truth
                            — the schema. Define it once and use it everywhere:
                        </p>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`// 1. Define a schema once — this is your single source of truth
import { object, string, number, InferType } from '@cleverbrush/schema';

const UserSchema = object({
  name:  string().minLength(2, 'Name must be at least 2 characters'),
  email: string().minLength(5, 'Please enter a valid email'),
  age:   number().min(0, 'Age cannot be negative').max(150)
});

// TypeScript type is inferred automatically
type User = InferType<typeof UserSchema>;
// { name: string; email: string; age: number }

// 2. Validate data at runtime
const result = await UserSchema.validate(someData);
if (result.valid) {
  console.log(result.object); // typed as User
}

// 3. Map between different object shapes
import { mapper } from '@cleverbrush/mapper';

const ApiResponse = object({
  full_name: string(),
  email_address: string(),
  birth_year: number()
});

const registry = mapper().configure(ApiResponse, UserSchema, (m) =>
  m
    .for((t) => t.name).from((s) => s.full_name)
    .for((t) => t.email).from((s) => s.email_address)
    .for((t) => t.age).compute((s) => new Date().getFullYear() - s.birth_year)
);

// 4. Render type-safe React forms
import { useSchemaForm, Field, FormSystemProvider } from '@cleverbrush/react-form';

function UserForm() {
  const form = useSchemaForm(UserSchema);
  return (
    <div>
      <Field selector={(t) => t.name} form={form} />
      <Field selector={(t) => t.email} form={form} />
      <Field selector={(t) => t.age} form={form} />
      <button onClick={() => form.submit()}>Submit</button>
    </div>
  );
}`)
                                }}
                            />
                        </pre>
                    </div>

                    {/* ── Getting Started Guide ───────────────────────── */}
                    <div className="card" style={{ marginTop: '2rem' }}>
                        <h3>Getting Started in 5 Minutes</h3>
                        <p>
                            Install the packages you need. Each library can be
                            used independently, but they work best together:
                        </p>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`# Schema only (validation + type inference)
npm install @cleverbrush/schema

# Schema + Mapper (add object mapping)
npm install @cleverbrush/schema @cleverbrush/mapper

# Schema + React Form (add form rendering)
npm install @cleverbrush/schema @cleverbrush/react-form

# All three
npm install @cleverbrush/schema @cleverbrush/mapper @cleverbrush/react-form`)
                                }}
                            />
                        </pre>

                        <h4>Step 1: Define a Schema</h4>
                        <p>
                            A schema is an immutable definition of your data
                            shape. It replaces both your TypeScript type
                            definitions and your validation logic:
                        </p>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`import { object, string, number, InferType } from '@cleverbrush/schema';

const ProductSchema = object({
  /** Product display name */
  name:  string().minLength(1, 'Name is required').maxLength(200),
  /** Price in dollars */
  price: number().min(0, 'Price must be positive'),
  /** Stock Keeping Unit identifier */
  sku:   string().minLength(3).maxLength(20)
});

// Derive the TypeScript type — no manual interface needed
type Product = InferType<typeof ProductSchema>;
// { name: string; price: number; sku: string }
// JSDoc comments carry through to the inferred type!`)
                                }}
                            />
                        </pre>

                        <h4>Step 2: Validate Data</h4>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`const result = await ProductSchema.validate({
  name: 'Widget',
  price: 9.99,
  sku: 'WDG-001'
});

if (result.valid) {
  // result.object is typed as Product
  saveToDatabase(result.object);
} else {
  // result.errors is an array of { path, message }
  showErrors(result.errors);
}`)
                                }}
                            />
                        </pre>

                        <h4>Step 3: Map Between Shapes (optional)</h4>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`import { mapper } from '@cleverbrush/mapper';

const ProductRow = object({
  product_name: string(),
  unit_price:   number(),
  sku_code:     string()
});

const registry = mapper().configure(ProductRow, ProductSchema, (m) =>
  m
    .for((t) => t.name).from((s) => s.product_name)
    .for((t) => t.price).from((s) => s.unit_price)
    .for((t) => t.sku).from((s) => s.sku_code)
);

const mapFn = registry.getMapper(ProductRow, ProductSchema);
const product = await mapFn(databaseRow);`)
                                }}
                            />
                        </pre>

                        <h4>Step 4: Render a Form (optional)</h4>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`import { useSchemaForm, Field, FormSystemProvider } from '@cleverbrush/react-form';

function ProductForm() {
  const form = useSchemaForm(ProductSchema);
  return (
    <div>
      <label>Name</label>
      <Field selector={(t) => t.name} form={form} />
      <label>Price</label>
      <Field selector={(t) => t.price} form={form} />
      <label>SKU</label>
      <Field selector={(t) => t.sku} form={form} />
      <button onClick={() => form.submit()}>Save</button>
    </div>
  );
}`)
                                }}
                            />
                        </pre>
                        <p>
                            Check out the individual library pages for
                            comprehensive documentation, live demos, and API
                            references.
                        </p>
                    </div>

                    <p className="footnote">
                        * <code>@cleverbrush/schema</code> and{' '}
                        <code>@cleverbrush/mapper</code> have zero runtime
                        dependencies. <code>@cleverbrush/react-form</code>{' '}
                        depends only on React and the schema library.
                    </p>
                </div>
            </section>

            {/* ── Contribute CTA ──────────────────────────────────── */}
            <section className="section">
                <div className="container">
                    <div className="contribute-banner">
                        <div className="contribute-content">
                            <h2>Help us build the future of typed web development</h2>
                            <p>
                                Cleverbrush libraries are open source and
                                community-driven. Whether it&apos;s fixing a bug,
                                improving docs, suggesting a feature, or building
                                a new library — every contribution makes the
                                ecosystem stronger for everyone.
                            </p>
                            <div className="contribute-actions">
                                <a
                                    href="https://github.com/cleverbrush/framework"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hero-btn hero-btn-primary"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                    Contribute on GitHub
                                </a>
                                <a
                                    href="https://github.com/cleverbrush/framework/issues"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hero-btn hero-btn-secondary"
                                >
                                    Open an Issue
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
