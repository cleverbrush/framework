import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import Link from 'next/link';

export default function PropertyDescriptorsSection() {
    return (
        <>
            <div className="card">
                <h2>PropertyDescriptors</h2>
                <p>
                    Every object schema in <code>@cleverbrush/schema</code>{' '}
                    carries a <strong>PropertyDescriptor tree</strong> — a
                    typed, runtime representation of every field in the schema,
                    including nested objects. This makes it possible to
                    reference a specific property using an ordinary arrow
                    function like <code>t =&gt; t.address.city</code> instead of
                    a fragile string like <code>&quot;address.city&quot;</code>.
                </p>
                <p>
                    Because the selector is a real TypeScript expression, the
                    compiler checks it. Rename <code>city</code> to{' '}
                    <code>town</code> and every selector that references it
                    becomes a compile error. No silent runtime breakage. No
                    stale string paths hiding in the codebase.
                </p>
                <p>
                    This mechanism is what enables the rest of the ecosystem. No
                    other popular TypeScript schema validation library exposes
                    this — Zod, Yup, and Joi all rely on string-based paths for
                    anything beyond basic validation.
                </p>
            </div>

            {/* ── Example 1: react-form ───────────────────────────── */}
            <div className="card">
                <h2>
                    Example: type-safe form fields with{' '}
                    <a
                        href="https://www.npmjs.com/package/@cleverbrush/react-form"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/react-form
                    </a>
                </h2>
                <p>
                    Every popular React form library today — React Hook Form,
                    Formik, React Final Form — binds fields by{' '}
                    <strong>string name</strong>. Rename a property and the
                    compiler says nothing. The form just breaks silently at
                    runtime.
                </p>
                <p>
                    Because <code>@cleverbrush/react-form</code> uses
                    PropertyDescriptor selectors under the hood,{' '}
                    <code>&lt;Field&gt;</code> accepts a typed arrow function
                    instead:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`// React Hook Form — string paths, no compile-time safety
const { register } = useForm<User>();
<input {...register("emial")} />            // ← typo silently fails at runtime
<input {...register("address.citey")} />    // ← wrong path: no error until runtime

// @cleverbrush/react-form — PropertyDescriptor selectors
<Field forProperty={t => t.email} form={form} />           // ✓ checked at compile time
<Field forProperty={t => t.address.city} form={form} />    // ✓ rename "city" → compiler error immediately
<Field forProperty={t => t.emial} form={form} />           // ✗ compile error: "emial" does not exist`)
                        }}
                    />
                </pre>
                <p>
                    The schema is the single source of truth — validation rules,
                    TypeScript types, and form field configuration all come from
                    it. See the{' '}
                    <a
                        href="https://www.npmjs.com/package/@cleverbrush/react-form"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        react-form package
                    </a>{' '}
                    for a full live demo.
                </p>
            </div>

            {/* ── Example 2: mapper ───────────────────────────────── */}
            <div className="card">
                <h2>
                    Example: compile-time-complete mapping with{' '}
                    <Link href="/mapper">@cleverbrush/mapper</Link>
                </h2>
                <p>
                    Object mapping between schemas uses the same selector
                    pattern. The <code>.for()</code> method accepts a typed
                    arrow function pointing at a target property. If any target
                    property is left unmapped, the TypeScript compiler reports
                    an error before you run a single line of code:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { object, string, number } from '@cleverbrush/schema';
import { mapper } from '@cleverbrush/mapper';

const ApiUser = object({
  first_name: string(),
  last_name:  string(),
  birth_year: number()
});

const DomainUser = object({
  fullName: string(),
  age:      number()
});

const registry = mapper()
  .configure(ApiUser, DomainUser, m =>
    m
      .for(t => t.fullName)
        .compute(src => src.first_name + ' ' + src.last_name)
      .for(t => t.age)
        .compute(src => new Date().getFullYear() - src.birth_year)
  );

const mapFn = registry.getMapper(ApiUser, DomainUser);
const user  = await mapFn({ first_name: 'Jane', last_name: 'Doe', birth_year: 1995 });
// { fullName: 'Jane Doe', age: 30 }

// Forget to map a property? Compile error — not a runtime surprise.
// The type system tracks which properties are still unmapped.`)
                        }}
                    />
                </pre>
                <p>
                    See the <Link href="/mapper">mapper page</Link> for the full
                    API, auto-mapping, and nested schema support.
                </p>
            </div>

            {/* ── Example 3: extern() + Zod ───────────────────────── */}
            <div className="card">
                <h2>Works with Zod schemas via extern()</h2>
                <p>
                    Already using Zod? Wrap any Standard Schema v1 compatible
                    schema with <code>extern()</code> and the property
                    descriptor tree extends through it automatically. You get
                    the same typed selectors across the Zod boundary — no string
                    paths needed:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { z } from 'zod';
import { object, number, extern, type InferType } from '@cleverbrush/schema';

// Existing Zod schema — left completely untouched
const ZodAddress = z.object({
  street: z.string(),
  city:   z.string(),
  zip:    z.string()
});

// Compose into a @cleverbrush/schema object with extern()
const OrderSchema = object({
  id:      number(),
  address: extern(ZodAddress),
});

type Order = InferType<typeof OrderSchema>;
// { id: number; address: { street: string; city: string; zip: string } }

// Validate and use typed selectors across the extern() boundary
const result = OrderSchema.validate({ id: 1, address: { street: '5th Ave', city: 'NYC', zip: '10001' } });
if (!result.valid) {
  // getErrorsFor works through the extern boundary — no string path needed
  const zipErrors = result.getErrorsFor(t => t.address.zip);
  console.log(zipErrors.errors); // ['...']
}`)
                        }}
                    />
                </pre>
                <p>
                    This means you can adopt <code>@cleverbrush/schema</code>{' '}
                    incrementally — keep existing Zod schemas intact, wrap them
                    with <code>extern()</code>, and immediately gain typed
                    selectors for mapping and form binding.
                </p>
            </div>
        </>
    );
}
