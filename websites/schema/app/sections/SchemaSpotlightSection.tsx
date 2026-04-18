import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import Link from 'next/link';

export function SchemaSpotlightSection({
    smallGzip,
    fullGzip
}: {
    smallGzip: string;
    fullGzip: string;
}) {
    return (
        <section className="section" id="schema">
            <div className="container">
                <div className="schema-spotlight">
                    <div className="schema-spotlight-header">
                        <div
                            className="schema-spotlight-icon"
                            aria-hidden="true"
                        >
                            <svg
                                width="28"
                                height="28"
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
                        </div>
                        <div>
                            <h2 className="schema-spotlight-title">
                                @cleverbrush/schema
                            </h2>
                            <p className="schema-spotlight-sub">
                                The foundation everything else builds on
                            </p>
                        </div>
                        <div className="schema-spotlight-cta">
                            <a
                                href="https://www.npmjs.com/package/@cleverbrush/schema"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hero-btn hero-btn-secondary"
                            >
                                npm ↗
                            </a>
                            <Link
                                href="/docs"
                                className="hero-btn hero-btn-primary"
                            >
                                Read the docs →
                            </Link>
                        </div>
                    </div>

                    <div className="schema-features-grid">
                        <div className="schema-feature">
                            <span className="schema-feature-icon">⚡</span>
                            <strong>Runtime validation</strong>
                            <p>
                                Validate untrusted input at API boundaries, form
                                submissions, or config files — with detailed
                                error messages.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">🔷</span>
                            <strong>TypeScript inference</strong>
                            <p>
                                The TypeScript type is derived automatically
                                from the schema. No duplicate{' '}
                                <code>interface</code> declarations.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">🧱</span>
                            <strong>Immutable &amp; composable</strong>
                            <p>
                                Every builder call returns a new instance.
                                Schemas are safe to share across modules without
                                side effects.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">📦</span>
                            <strong>Zero dependencies</strong>
                            <p>
                                ~{smallGzip} gzipped (minimalist build) or ~
                                {fullGzip} for the full build. Runs in Node,
                                Deno, Bun, and modern browsers.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">🔗</span>
                            <strong>Standard Schema &amp; Zod interop</strong>
                            <p>
                                Implements the{' '}
                                <a
                                    href="https://standardschema.dev"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Standard Schema
                                </a>{' '}
                                spec, so it works alongside any compatible
                                library out of the box — including Zod.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">🔍</span>
                            <strong>Typed field-error selectors</strong>
                            <p>
                                After validation, look up errors for a specific
                                field using an arrow function —{' '}
                                <code>
                                    result.getErrorsFor(u&nbsp;=&gt;&nbsp;u.email)
                                </code>
                                — instead of a plain string like{' '}
                                <code>{"errors['email']"}</code>. TypeScript
                                verifies the property exists at compile time, so
                                a typo like{' '}
                                <code>u&nbsp;=&gt;&nbsp;u.emal</code> is a build
                                error, not a runtime surprise.
                            </p>
                        </div>
                    </div>

                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number, type InferType } from '@cleverbrush/schema';

// ── 1. Define once, get the type for free ───────────────────────────
const UserSchema = object({
  name:  string().minLength(2, 'Name must be at least 2 characters'),
  email: string().minLength(5, 'Please enter a valid email'),
  age:   number().min(0).max(150)
});

type User = InferType<typeof UserSchema>;
// → { name: string; email: string; age: number }

// ── 2. Validate and read field-level errors with typed selectors ──────
const result = UserSchema.validate(rawInput);
if (!result.valid) {
  // getErrorsFor is a method on the result — no magic strings
  const nameErrors = result.getErrorsFor(u => u.name);
  console.log(nameErrors.errors); // ['Name must be at least 2 characters']
}`)
                            }}
                        />
                    </pre>
                </div>
            </div>
        </section>
    );
}
