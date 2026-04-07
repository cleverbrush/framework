import { highlightTS } from '@/lib/highlight';

export default function StandardSchemaSection() {
    return (
        <>
            <div className="card">
                <h2>Standard Schema Support</h2>
                <p>
                    <code>@cleverbrush/schema</code> implements the{' '}
                    <a
                        href="https://standardschema.dev/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Standard Schema v1
                    </a>{' '}
                    specification. This means every schema you build is
                    immediately usable in{' '}
                    <strong>50+ libraries and frameworks</strong> without any
                    adapter or wrapper — including tRPC, TanStack Form, React
                    Hook Form, T3 Env, Hono, Elysia, and next-safe-action.
                </p>

                <h3>
                    The <code>~standard</code> property
                </h3>
                <p>
                    All 13 builders expose a{' '}
                    <code>[&apos;~standard&apos;]</code> getter on the base{' '}
                    <code>SchemaBuilder</code> class. The property returns a
                    cached object with three fields:
                </p>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Field</th>
                                <th>Value</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>version</code>
                                </td>
                                <td>
                                    <code>1</code>
                                </td>
                                <td>Standard Schema spec version</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>vendor</code>
                                </td>
                                <td>
                                    <code>&apos;@cleverbrush/schema&apos;</code>
                                </td>
                                <td>Library identifier</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>validate(value)</code>
                                </td>
                                <td>sync function</td>
                                <td>
                                    Wraps <code>.validate()</code> and returns{' '}
                                    <code>{'{ value }'}</code> on success or{' '}
                                    <code>{'{ issues: [{ message }] }'}</code>{' '}
                                    on failure
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3>Usage</h3>
                <p>
                    You can access <code>[&apos;~standard&apos;]</code>{' '}
                    directly, but in practice you never need to — just pass a{' '}
                    <code>@cleverbrush/schema</code> builder directly wherever a
                    Standard Schema validator is expected:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { object, string, number } from '@cleverbrush/schema';

const UserSchema = object({
  name:  string().minLength(2),
  email: string().email(),
  age:   number().min(18).optional(),
});

// Direct access — useful for testing or custom integrations
const std = UserSchema['~standard'];
console.log(std.version); // 1
console.log(std.vendor);  // '@cleverbrush/schema'

const ok   = std.validate({ name: 'Alice', email: 'alice@example.com' });
// { value: { name: 'Alice', email: 'alice@example.com', age: undefined } }

const fail = std.validate({ name: 'A', email: 'not-an-email' });
// { issues: [{ message: 'minLength' }, { message: 'email' }] }`)
                        }}
                    />
                </pre>

                <h3>TanStack Form</h3>
                <p>
                    Pass any <code>@cleverbrush/schema</code> builder directly
                    as a TanStack Form field validator — no adapter needed:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { useForm } from '@tanstack/react-form';
import { standardSchemaValidator } from '@tanstack/react-form/standard-schema';
import { string } from '@cleverbrush/schema';

const emailSchema = string().email('Please enter a valid email');

const form = useForm({
  validatorAdapter: standardSchemaValidator(),
  defaultValues: { email: '' },
});

// In JSX:
// <form.Field
//   name="email"
//   validators={{ onChange: emailSchema, onBlur: emailSchema }}
// />`)
                        }}
                    />
                </pre>

                <h3>T3 Env</h3>
                <p>
                    Use <code>@cleverbrush/schema</code> builders as T3 Env
                    server and client environment validators:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { createEnv } from '@t3-oss/env-nextjs';
import { string, number } from '@cleverbrush/schema';

export const env = createEnv({
  server: {
    DATABASE_URL: string().url(),
    PORT: number().min(1).max(65535).optional(),
  },
  client: {
    NEXT_PUBLIC_API_URL: string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT ? Number(process.env.PORT) : undefined,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
});`)
                        }}
                    />
                </pre>

                <h3>
                    External Schema Interop — <code>extern()</code>
                </h3>
                <p>
                    Standard Schema is bidirectional.{' '}
                    <code>@cleverbrush/schema</code> exposes its schemas{' '}
                    <em>to</em> other tools via{' '}
                    <code>[&apos;~standard&apos;]</code>, and it can{' '}
                    <em>consume</em> schemas from other libraries via{' '}
                    <code>extern()</code>. Wrap any Standard Schema v1
                    compatible schema (Zod, Valibot, ArkType, …) into a native
                    builder — no rewriting needed:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { z } from 'zod';
import { object, number, extern, type InferType } from '@cleverbrush/schema';

// Keep your existing Zod schema as-is
const ZodAddress = z.object({
  street: z.string().min(1),
  city:   z.string(),
  zip:    z.string().length(5),
});

// Compose with @cleverbrush/schema
const OrderSchema = object({
  address:    extern(ZodAddress),
  totalCents: number().min(1),
});

// Type is inferred from both libraries automatically
type Order = InferType<typeof OrderSchema>;
// { address: { street: string; city: string; zip: string }; totalCents: number }

const result = OrderSchema.validate({
  address: { street: '5th Ave', city: 'NYC', zip: '10001' },
  totalCents: 4999,
});

if (!result.valid) {
  // Navigate into the extern property — no type annotation needed
  const zipErrors = result.getErrorsFor(t => t.address.zip);
  console.log(zipErrors.errors);
}`)
                        }}
                    />
                </pre>
                <p>
                    <code>extern()</code> takes a single parameter — the
                    external schema. Types and property descriptors are derived
                    automatically. Validation is delegated to the external
                    library&apos;s{' '}
                    <code>[&apos;~standard&apos;].validate()</code> method, so{' '}
                    <code>@cleverbrush/schema</code> never re-implements another
                    library&apos;s validation logic.
                </p>

                <h3>Compatible tools</h3>
                <p>
                    Any library that consumes Standard Schema v1 validators
                    works with <code>@cleverbrush/schema</code> automatically:
                </p>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Library</th>
                                <th>Category</th>
                                <th>Integration</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>TanStack Form</td>
                                <td>Forms</td>
                                <td>
                                    <a href="/showcases/tanstack-form">
                                        Live showcase →
                                    </a>
                                </td>
                            </tr>
                            <tr>
                                <td>T3 Env</td>
                                <td>Env validation</td>
                                <td>
                                    <a href="/showcases/t3-env">
                                        Live showcase →
                                    </a>
                                </td>
                            </tr>
                            <tr>
                                <td>tRPC</td>
                                <td>API / RPC</td>
                                <td>
                                    Pass schema as procedure{' '}
                                    <code>.input()</code>
                                </td>
                            </tr>
                            <tr>
                                <td>React Hook Form</td>
                                <td>Forms</td>
                                <td>
                                    <code>standardSchemaResolver(schema)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>Hono</td>
                                <td>HTTP framework</td>
                                <td>Validator middleware</td>
                            </tr>
                            <tr>
                                <td>Elysia</td>
                                <td>HTTP framework</td>
                                <td>Route body / query validation</td>
                            </tr>
                            <tr>
                                <td>next-safe-action</td>
                                <td>Server actions</td>
                                <td>Action input validation</td>
                            </tr>
                            <tr>
                                <td>TanStack Router</td>
                                <td>Routing</td>
                                <td>Search param validation</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p>
                    See the full list of Standard Schema adopters at{' '}
                    <a
                        href="https://standardschema.dev/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        standardschema.dev
                    </a>
                    .
                </p>
            </div>
        </>
    );
}
