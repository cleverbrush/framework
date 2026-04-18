/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: needed for code examples */

import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import Link from 'next/link';

export const metadata = {
    title: 'Why Cleverbrush? — Schema-First Full-Stack TypeScript',
    description:
        'The problem with full-stack TypeScript today and how Cleverbrush solves it with a single schema definition.'
};

export default function WhyPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Why Cleverbrush?</h1>
                    <p className="subtitle">
                        The problem with full-stack TypeScript today — and how
                        one schema definition replaces six.
                    </p>
                </div>

                {/* ── The Problem ─────────────────────────────────── */}
                <div className="card">
                    <h2>The problem: types everywhere, in sync nowhere</h2>
                    <p>
                        In a typical TypeScript stack, the same data shape is
                        defined in <strong>six different places</strong> — each
                        maintained separately, each drifting independently:
                    </p>

                    <div
                        className="schema-features-grid"
                        style={{ marginTop: '1.5rem' }}
                    >
                        <div className="schema-feature">
                            <span className="schema-feature-icon">1️⃣</span>
                            <strong>TypeScript types</strong>
                            <p>
                                <code>interface User</code> — hand-written, no
                                runtime enforcement.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">2️⃣</span>
                            <strong>Validation</strong>
                            <p>
                                Zod / Joi / Yup schema — separate from the type,
                                easy to forget updates.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">3️⃣</span>
                            <strong>Server endpoint</strong>
                            <p>
                                Express/Fastify route handler — parses body
                                manually, casts to the type.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">4️⃣</span>
                            <strong>Client fetch call</strong>
                            <p>
                                <code>fetch('/api/users')</code> with manual
                                type assertion or codegen output.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">5️⃣</span>
                            <strong>OpenAPI spec</strong>
                            <p>
                                Hand-written YAML or separate codegen pipeline —
                                drifts from the real implementation.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">6️⃣</span>
                            <strong>Form validation</strong>
                            <p>
                                React Hook Form / Formik with string field names
                                and duplicated rules.
                            </p>
                        </div>
                    </div>

                    <p style={{ marginTop: '1.5rem' }}>
                        Every time a field changes, you update six files. Miss
                        one and you get a runtime bug, a stale API doc, or a
                        form that silently accepts bad data.
                    </p>
                </div>

                {/* ── The Solution ────────────────────────────────── */}
                <div className="card">
                    <h2>The solution: define once, use everywhere</h2>
                    <p>
                        With Cleverbrush, you define your data shape{' '}
                        <strong>once</strong> using{' '}
                        <code>@cleverbrush/schema</code>. That single definition
                        drives every layer of your stack:
                    </p>

                    <pre style={{ marginTop: '1rem' }}>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number } from '@cleverbrush/schema';

// One definition — the single source of truth
const User = object({
  id:    string().uuid(),
  name:  string().minLength(2),
  email: string().email(),
  age:   number().min(0).max(150)
});`)
                            }}
                        />
                    </pre>

                    <p style={{ marginTop: '1.5rem' }}>
                        From this single schema, you automatically get:
                    </p>

                    <div
                        className="schema-features-grid"
                        style={{ marginTop: '1rem' }}
                    >
                        <div className="schema-feature">
                            <span className="schema-feature-icon">🔷</span>
                            <strong>TypeScript types</strong>
                            <p>
                                <code>InferType&lt;typeof User&gt;</code> —
                                inferred, never hand-written.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">✅</span>
                            <strong>Runtime validation</strong>
                            <p>
                                <code>User.validate(data)</code> with typed
                                error selectors per field.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">⚡</span>
                            <strong>Typed server endpoint</strong>
                            <p>
                                <code>endpoint.post().body(User)</code> —
                                handler is fully typed, invalid requests
                                rejected automatically.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">🔗</span>
                            <strong>Typed client</strong>
                            <p>
                                <code>createClient(api)</code> — zero codegen,
                                types flow from the contract.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">📄</span>
                            <strong>OpenAPI 3.1 spec</strong>
                            <p>
                                Generated at runtime from schema introspection —
                                always matches the real types.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">📝</span>
                            <strong>React forms</strong>
                            <p>
                                <code>
                                    &lt;Field forProperty=&#123;f =&gt;
                                    f.email&#125; /&gt;
                                </code>
                                — type-safe selectors, not string names.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Key Differentiators ─────────────────────────── */}
                <div className="card">
                    <h2>What makes Cleverbrush different</h2>

                    <h3>Contract-first, not server-first</h3>
                    <p>
                        You define your API contract with{' '}
                        <code>defineApi()</code> in a shared module. Both the
                        server and client import the same contract.{' '}
                        <code>mapHandlers()</code> produces a{' '}
                        <strong>compile error</strong> if any endpoint is
                        missing a handler — you can&apos;t ship an incomplete
                        API.
                    </p>

                    <pre style={{ marginTop: '1rem' }}>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// Server: mapHandlers ensures every endpoint has a handler
mapHandlers(server, api, {
  users: {
    list:   async () => db.users.findAll(),
    create: async ({ body }) => db.users.insert(body),
    // TS Error: Property 'get' is missing in type...
  }
});`)
                            }}
                        />
                    </pre>

                    <h3 style={{ marginTop: '2rem' }}>
                        Zero-codegen typed client
                    </h3>
                    <p>
                        No build step. No generated files. The client is a
                        runtime <code>Proxy</code> that reads endpoint metadata
                        from the contract. Types flow through TypeScript&apos;s
                        type system directly.
                    </p>

                    <h3 style={{ marginTop: '2rem' }}>Built-in resilience</h3>
                    <p>
                        The client ships with retry (exponential backoff +
                        jitter), timeout, request deduplication, response
                        caching, and request batching — all configurable
                        globally or per call. No competing framework bundles all
                        of this.
                    </p>

                    <h3 style={{ marginTop: '2rem' }}>
                        Integrated auth &amp; DI
                    </h3>
                    <p>
                        Authentication (JWT, cookies, OAuth2, OIDC) and
                        dependency injection (.NET-style with schemas as service
                        keys) are first-class — not third-party plugins. They
                        plug into the endpoint builder with full type safety.
                    </p>

                    <h3 style={{ marginTop: '2rem' }}>
                        Enterprise-grade OpenAPI
                    </h3>
                    <p>
                        <code>@cleverbrush/server-openapi</code> generates
                        OpenAPI 3.1 specs with features most tools lack: typed
                        response links, callbacks, webhooks, response headers,
                        and security schemes. The spec is always accurate
                        because it&apos;s generated from the same schemas your
                        code uses.
                    </p>

                    <h3 style={{ marginTop: '2rem' }}>
                        Schema as the universal key
                    </h3>
                    <p>
                        The same schema instance works as a DI service key, a
                        server endpoint type, an API contract type, a form
                        validator, and an OpenAPI source. No other framework in
                        the TypeScript ecosystem provides this level of
                        cross-concern schema integration.
                    </p>
                </div>

                {/* ── Next Steps ──────────────────────────────────── */}
                <div className="card">
                    <h2>Ready to try it?</h2>
                    <div className="schema-features-grid">
                        <Link
                            href="/getting-started"
                            className="schema-feature"
                            style={{ textDecoration: 'none' }}
                        >
                            <span className="schema-feature-icon">🚀</span>
                            <strong>Getting Started</strong>
                            <p>Build a typed API in 10 minutes</p>
                        </Link>
                        <Link
                            href="/comparisons"
                            className="schema-feature"
                            style={{ textDecoration: 'none' }}
                        >
                            <span className="schema-feature-icon">📊</span>
                            <strong>Comparisons</strong>
                            <p>Side-by-side with tRPC, ts-rest, Hono</p>
                        </Link>
                        <a
                            href="https://schema.cleverbrush.com"
                            className="schema-feature"
                            style={{ textDecoration: 'none' }}
                        >
                            <span className="schema-feature-icon">🔷</span>
                            <strong>Schema Library</strong>
                            <p>The foundation — benchmarks, playground, docs</p>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
