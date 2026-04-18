import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function ExternSection() {
    return (
        <>
            <div className="section-header">
                <h1>extern() — Cross-Library Interop</h1>
                <p className="subtitle">
                    Mix schemas from Zod, Valibot, ArkType, or any Standard
                    Schema v1 library within a single @cleverbrush/schema
                    object.
                </p>
            </div>

            <div className="why-box">
                <h2>Why extern()?</h2>
                <p>
                    The{' '}
                    <a
                        href="https://standardschema.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Standard Schema
                    </a>{' '}
                    spec lets <em>consumers</em> accept schemas from any
                    library. But what about <em>composing</em> schemas across
                    libraries?
                </p>
                <p>
                    <code>extern()</code> solves this: wrap any Standard Schema
                    v1 compatible schema and use it as a property inside a{' '}
                    <code>@cleverbrush/schema</code> object. Types are inferred
                    across the boundary and <code>getErrorsFor</code> selectors
                    work through it too.
                </p>
                <p>
                    This means you can adopt <code>@cleverbrush/schema</code>{' '}
                    incrementally — keep your existing Zod, Valibot, or ArkType
                    schemas and compose them into new objects without rewriting
                    anything.
                </p>
            </div>

            <div className="card">
                <h2>Wrapping a Zod Schema</h2>
                <a href="/playground/extern" className="playground-link">
                    ▶ Open in Playground
                </a>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { z } from 'zod';
import { object, date, number, extern, type InferType } from '@cleverbrush/schema';

// Your existing Zod schema — untouched
const zodAddress = z.object({
  street: z.string(),
  city:   z.string(),
  zip:    z.string().regex(/^\\d{5}$/)
});

// Compose it into a @cleverbrush/schema object
const OrderSchema = object({
  id:        number(),
  createdAt: date(),
  address:   extern(zodAddress),
});

type Order = InferType<typeof OrderSchema>;
// { id: number; createdAt: Date; address: { street: string; city: string; zip: string } }

// Validation runs through both libraries
const result = OrderSchema.validate(data);
if (!result.valid) {
  // Typed error access works through the extern() boundary
  const zipErrors = result.getErrorsFor(o => o.address.zip);
}`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Works With Any Standard Schema v1 Library</h2>
                <p>
                    <code>extern()</code> accepts any object implementing the{' '}
                    <a
                        href="https://standardschema.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Standard Schema v1
                    </a>{' '}
                    spec. This includes:
                </p>
                <ul>
                    <li>
                        <strong>Zod</strong> (v3.24+)
                    </li>
                    <li>
                        <strong>Valibot</strong> (v1+)
                    </li>
                    <li>
                        <strong>ArkType</strong> (v2+)
                    </li>
                    <li>
                        And{' '}
                        <a
                            href="https://standardschema.dev/#what-schema-libraries-implement-the-spec"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            50+ other libraries
                        </a>
                    </li>
                </ul>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import * as v from 'valibot';
import { object, string, extern, type InferType } from '@cleverbrush/schema';

// Valibot schema
const valibotEmail = v.pipe(v.string(), v.email());

// Mix it into a @cleverbrush/schema object
const ContactSchema = object({
  name:  string().minLength(2),
  email: extern(valibotEmail),
});

type Contact = InferType<typeof ContactSchema>;
// { name: string; email: string }`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Incremental Migration Strategy</h2>
                <p>
                    If you have an existing codebase using Zod, you don&apos;t
                    need to rewrite everything at once. Use{' '}
                    <code>extern()</code> to compose existing schemas into new{' '}
                    <code>@cleverbrush/schema</code> objects, then gradually
                    convert individual schemas as needed.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`// Phase 1: Wrap existing Zod schemas
const NewFeature = object({
  userId:  number(),
  profile: extern(existingZodProfileSchema),    // keep as-is
  address: extern(existingZodAddressSchema),     // keep as-is
  tags:    array(string()),                       // new field, native
});

// Phase 2: Gradually replace extern() calls with native schemas
// const NewFeature = object({
//   userId:  number(),
//   profile: ProfileSchema,                      // now native
//   address: extern(existingZodAddressSchema),   // still wrapped
//   tags:    array(string()),
// });`)
                        }}
                    />
                </pre>
            </div>
        </>
    );
}
