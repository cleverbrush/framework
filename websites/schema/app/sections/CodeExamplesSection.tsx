/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: need for code examples */
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import Link from 'next/link';

export function CodeExamplesSection() {
    return (
        <section className="section" id="examples">
            <div className="container">
                {/* Zod API compatibility */}
                <div className="card" style={{ marginTop: '2rem' }}>
                    <h3>Familiar API — migrate from Zod field by field</h3>
                    <p>
                        Most Zod primitives are drop-in replacements. The fluent
                        builder style, <code>optional()</code>,{' '}
                        <code>default()</code>, <code>brand()</code>, and{' '}
                        <code>readonly()</code> all work identically. You can
                        adopt @cleverbrush/schema incrementally — even wrapping
                        existing Zod schemas with <code>extern()</code> to
                        compose them into new objects.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// ── Zod ───────────────────────────────────────────────────────────
import { z } from 'zod';
const UserZ = z.object({
  name:  z.string().min(2),
  email: z.string().min(5),
  age:   z.number().min(0).max(150),
});
type UserZ = z.infer<typeof UserZ>; // requires z.infer<>

// ── @cleverbrush/schema ──────────────────────────────────────────────
import { object, string, number, type InferType } from '@cleverbrush/schema';
const UserSchema = object({
  name:  string().minLength(2),
  email: string().minLength(5),
  age:   number().min(0).max(150),
});
type User = InferType<typeof UserSchema>; // { name: string; email: string; age: number } — identical to z.infer<typeof UserZ>

// Validate — result.valid narrows the type automatically
const result = UserSchema.validate(rawInput);
if (result.valid) {
  processUser(result.object); // typed as User ✓
}`)
                            }}
                        />
                    </pre>
                    <Link href="/playground" className="playground-link">
                        &#9654; Try this example in the Playground
                    </Link>
                </div>

                {/* Composability */}
                <div className="card">
                    <h3>Immutable &amp; composable — share schemas safely</h3>
                    <p>
                        Every builder method returns a new instance. Schemas can
                        be exported, extended, or narrowed anywhere in your
                        codebase without risk of accidental mutation.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number, union, boolean, array, type InferType } from '@cleverbrush/schema';

// Reusable building blocks
const EmailField = string().minLength(5).maxLength(254);
const NameField  = string().minLength(2).maxLength(50);

// Extend a base schema for two contexts — neither mutates the other
const CreateUserSchema = object({ name: NameField, email: EmailField });
const UpdateUserSchema = CreateUserSchema
  .addProps({ role: string().optional() });

// Discriminated unions with full type narrowing
const MediaSchema = union(object({ type: string().equals('image'), url: string(), width: number(), height: number() }))
  .or(object({ type: string().equals('video'), url: string(), duration: number() }))
  .or(object({ type: string().equals('text'),  body: string() }));
type Media = InferType<typeof MediaSchema>;
// { type: 'image'; url: string; width: number; height: number }
// | { type: 'video'; url: string; duration: number }
// | { type: 'text';  body: string }`)
                            }}
                        />
                    </pre>
                    <Link href="/playground" className="playground-link">
                        &#9654; Try this example in the Playground
                    </Link>
                </div>

                {/* Advanced: extern / Zod interop */}
                <div className="card">
                    <h3>
                        Advanced: adopt incrementally with <code>extern()</code>
                    </h3>
                    <p>
                        Already invested in Zod (or any{' '}
                        <a
                            href="https://standardschema.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Standard Schema v1
                        </a>{' '}
                        compatible library)? Wrap existing schemas with{' '}
                        <code>extern()</code> and use them as properties inside{' '}
                        <code>@cleverbrush/schema</code> objects. Types are
                        inferred across the boundary and{' '}
                        <code>getErrorsFor</code> selectors work through it too.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { z } from 'zod';
import { object, date, number, extern, type InferType } from '@cleverbrush/schema';

// Your existing Zod schema — untouched
const zodAddress = z.object({ street: z.string(), city: z.string() });

// Compose it into a @cleverbrush/schema object
const OrderSchema = object({
  id:        number(),
  createdAt: date(),
  address:   extern(zodAddress),  // ← any Standard Schema v1 compatible library
});

type Order = InferType<typeof OrderSchema>;
// { id: number; createdAt: Date; address: { street: string; city: string } }`)
                            }}
                        />
                    </pre>
                    <Link href="/playground/extern" className="playground-link">
                        &#9654; Try extern() in the Playground
                    </Link>
                </div>
            </div>
        </section>
    );
}
