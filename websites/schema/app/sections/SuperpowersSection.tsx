/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: need for code examples */
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import Link from 'next/link';

export function SuperpowersSection() {
    return (
        <section className="section vs-zod-section" id="superpowers">
            <div className="container">
                <div className="vs-zod-intro">
                    <h2 className="section-title">What makes it different</h2>
                    <p className="subtitle">
                        If you know Zod, you already know most of the API — the
                        primitives, the fluent builder style, and{' '}
                        <code>InferType</code> all work the same way.
                        @cleverbrush/schema goes further with three capabilities
                        no other schema library offers.
                    </p>
                </div>

                <div className="vs-zod-grid">
                    <div className="vs-zod-card">
                        <div className="vs-zod-icon">🎯</div>
                        <h3>Typed field-error selectors</h3>
                        <p>
                            Access per-field errors through a typed lambda — no
                            magic strings, no brittle path navigation.
                            TypeScript catches a misspelled field name at
                            compile time.
                        </p>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(
                                        `// String path — no compile-time check
result.error?.issues.filter(i => i.path[0] === 'naem') // ← typo silently passes

// @cleverbrush/schema — typed selector
result.getErrorsFor(u => u.naem) // ← TypeScript error ✓`
                                    )
                                }}
                            />
                        </pre>
                    </div>

                    <div className="vs-zod-card">
                        <div className="vs-zod-icon">🧩</div>
                        <h3>Type-safe extension system</h3>
                        <p>
                            Add your own methods to schema builders — fully
                            typed, autocomplete-ready. The built-in{' '}
                            <code>.email()</code>, <code>.url()</code>,{' '}
                            <code>.uuid()</code> methods use the same public
                            API.
                        </p>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(
                                        `const slugExt = defineExtension({
  string: {
    slug(this: StringSchemaBuilder) {
      return this.matches(/^[a-z0-9-]+$/);
    }
  }
});
const { string: s } = withExtensions(slugExt);
const PostSlug = s().slug().minLength(3);
//               ^ slug() is typed, autocomplete works`
                                    )
                                }}
                            />
                        </pre>
                    </div>

                    <div className="vs-zod-card">
                        <div className="vs-zod-icon">🔍</div>
                        <h3>Runtime introspection &amp; PropertyDescriptors</h3>
                        <p>
                            Every schema exposes a typed{' '}
                            <code>.introspect()</code> descriptor tree. This
                            powers the mapper, react-form, JSON Schema output —
                            and your own tools. Navigate fields with typed
                            lambdas, not strings.
                        </p>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(
                                        `const d = UserSchema.introspect();
d.properties.name.isRequired   // boolean ✓
d.properties.age.validators    // TypedValidator[] ✓

// PropertyDescriptors — typed field navigation
const desc = UserSchema.properties;
desc(u => u.address.city).getValue(data) // typed, refactor-safe`
                                    )
                                }}
                            />
                        </pre>
                    </div>
                </div>

                <div className="vs-zod-footer">
                    <Link
                        href="/docs/why"
                        className="hero-btn hero-btn-primary"
                    >
                        Learn why →
                    </Link>
                    <Link
                        href="/docs/comparison"
                        className="hero-btn hero-btn-secondary"
                    >
                        Full comparison →
                    </Link>
                </div>
            </div>
        </section>
    );
}
