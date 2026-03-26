import Link from 'next/link';
import { highlightTS } from '@/lib/highlight';

export default function HomePage() {
    return (
        <>
            <section className="hero">
                <h1>Cleverbrush Libs</h1>
                <p className="tagline">
                    Type-safe TypeScript libraries for schema validation, object
                    mapping, and headless React forms. Define once — validate,
                    map, and render anywhere.
                </p>
                <p className="production-note">
                    🚀 These libraries are fairly new and not yet widely known,
                    but they are battle-tested in production at{' '}
                    <a
                        href="https://cleverbrush.com/editor"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        cleverbrush.com/editor
                    </a>
                    . The entire editor — with dozens of interactive panels,
                    complex forms, and real-time collaboration — runs on these
                    three packages. They are stable, performant, and ready for
                    production use.
                </p>
                <div className="hero-badges">
                    <span className="badge">TypeScript-first</span>
                    <span className="badge">Zero dependencies*</span>
                    <span className="badge">Immutable schemas</span>
                    <span className="badge">BSD-3 Licensed</span>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <h2 className="section-title">The Libraries</h2>
                    <div className="lib-cards">
                        <Link href="/schema" className="lib-card">
                            <h3>@cleverbrush/schema</h3>
                            <p>
                                Immutable, composable schema definitions with
                                built-in validation and TypeScript type
                                inference. Define once — get types, validation,
                                and runtime introspection from a single source.
                            </p>
                            <span className="lib-card-link">
                                Learn more →
                            </span>
                        </Link>
                        <Link href="/mapper" className="lib-card">
                            <h3>@cleverbrush/mapper</h3>
                            <p>
                                Type-safe object mapping between schemas with
                                compile-time completeness checking. Never miss a
                                property when converting between object shapes.
                            </p>
                            <span className="lib-card-link">
                                Learn more →
                            </span>
                        </Link>
                        <Link href="/react-form" className="lib-card">
                            <h3>@cleverbrush/react-form</h3>
                            <p>
                                Headless, schema-driven React forms. Define your
                                schema once and get validated forms with any UI
                                library — Material UI, Ant Design, or plain
                                HTML.
                            </p>
                            <span className="lib-card-link">
                                Learn more →
                            </span>
                        </Link>
                    </div>

                    <div className="card" style={{ marginTop: '2rem' }}>
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
        </>
    );
}
