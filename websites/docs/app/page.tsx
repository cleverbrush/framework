/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */

import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import Link from 'next/link';

export default function DocsHomePage() {
    return (
        <>
            {/* ── Hero ─────────────────────────────────────────────── */}
            <section className="hero">
                <p className="hero-eyebrow">
                    Schema-first full-stack TypeScript framework
                </p>
                <h1>
                    One schema.
                    <br />
                    Full stack.
                </h1>
                <p className="tagline">
                    Define your data shapes once with{' '}
                    <a
                        href="https://schema.cleverbrush.com"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/schema
                    </a>
                    . Get type-safe servers, auto-typed clients, OpenAPI docs,
                    dependency injection, auth, and React forms — all from that
                    single definition. Zero duplication. Zero drift.
                </p>
                <div className="hero-actions">
                    <Link
                        href="/getting-started"
                        className="hero-btn hero-btn-primary"
                    >
                        Get Started
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M3 8h10M9 4l4 4-4 4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </Link>
                    <Link href="/why" className="hero-btn hero-btn-playground">
                        Why Cleverbrush?
                    </Link>
                    <a
                        href="https://github.com/cleverbrush/framework"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hero-btn hero-btn-secondary"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        GitHub
                    </a>
                </div>
                <div className="hero-badges">
                    <span className="badge">Contract-first</span>
                    <span className="badge">Zero codegen</span>
                    <span className="badge">OpenAPI 3.1</span>
                    <span className="badge">Built-in auth &amp; DI</span>
                    <span className="badge">Client resilience</span>
                    <span className="badge">React integration</span>
                </div>
            </section>

            {/* ── 3-Step Walkthrough ──────────────────────────────── */}
            <section className="section" id="how-it-works">
                <div className="container">
                    <h2 className="section-title">
                        Define once, use everywhere
                    </h2>
                    <p className="subtitle" style={{ marginBottom: '2rem' }}>
                        A single contract drives your server, client, and
                        OpenAPI docs. Types flow automatically — no duplication,
                        no drift.
                    </p>

                    <div className="code-block-group">
                        <div className="code-block-label">
                            <span className="code-block-badge code-block-badge--shared">
                                step 1
                            </span>
                            <span className="code-block-file">contract.ts</span>
                        </div>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`import { defineApi, endpoint, route } from '@cleverbrush/server/contract';
import { object, string, number, array } from '@cleverbrush/schema';

const User = object({
  id:    string().uuid(),
  name:  string().minLength(2),
  email: string().email(),
  age:   number().min(0).max(150)
});

export const api = defineApi({
  users: {
    list:   endpoint.get('/api/users').returns(array(User)),
    create: endpoint.post('/api/users')
              .body(object({ name: string(), email: string(), age: number() }))
              .returns(User),
    get:    endpoint
              .get('/api/users', route({ id: string() })\`/\${t => t.id}\`)
              .returns(User)
  }
});`)
                                }}
                            />
                        </pre>

                        <div
                            className="code-block-label"
                            style={{ marginTop: '1.5rem' }}
                        >
                            <span className="code-block-badge code-block-badge--server">
                                step 2
                            </span>
                            <span className="code-block-file">server.ts</span>
                        </div>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`import { createServer, mapHandlers } from '@cleverbrush/server';
import { api } from './contract';

const server = createServer();

// mapHandlers gives a compile error if any endpoint is missing
mapHandlers(server, api, {
  users: {
    list:   async () => db.users.findAll(),
    create: async ({ body }) => db.users.insert(body),
    get:    async ({ params }) => db.users.findById(params.id)
    // ^ forget one? TypeScript error: Property 'get' is missing
  }
});

await server.listen(3000);`)
                                }}
                            />
                        </pre>

                        <div
                            className="code-block-label"
                            style={{ marginTop: '1.5rem' }}
                        >
                            <span className="code-block-badge code-block-badge--client">
                                step 3
                            </span>
                            <span className="code-block-file">app.ts</span>
                        </div>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`import { createClient } from '@cleverbrush/client';
import { api } from './contract';

const client = createClient(api, { baseUrl: 'http://localhost:3000' });

// Fully typed — no codegen, no manual annotations
const users = await client.users.list();
//    ^ User[]

const alice = await client.users.create({
  body: { name: 'Alice', email: 'alice@example.com', age: 30 }
});
//    ^ User — wrong shape is a compile error`)
                                }}
                            />
                        </pre>
                    </div>
                </div>
            </section>

            {/* ── How It Compares ──────────────────────────────────── */}
            <section className="section" id="comparison">
                <div className="container">
                    <h2 className="section-title">How it compares</h2>
                    <p className="subtitle" style={{ marginBottom: '2rem' }}>
                        Key differences from popular TypeScript frameworks at a
                        glance.
                    </p>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="comparison-table">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>Cleverbrush</th>
                                    <th>tRPC</th>
                                    <th>ts-rest</th>
                                    <th>Hono</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Standard REST endpoints</td>
                                    <td className="cmp-yes">Yes</td>
                                    <td className="cmp-no">No (RPC only)</td>
                                    <td className="cmp-yes">Yes</td>
                                    <td className="cmp-yes">Yes</td>
                                </tr>
                                <tr>
                                    <td>Typed client from contract</td>
                                    <td className="cmp-yes">
                                        Yes (zero codegen)
                                    </td>
                                    <td className="cmp-yes">Yes</td>
                                    <td className="cmp-yes">Yes</td>
                                    <td className="cmp-partial">
                                        Via hc helper
                                    </td>
                                </tr>
                                <tr>
                                    <td>OpenAPI 3.1 generation</td>
                                    <td className="cmp-yes">
                                        Full (links, callbacks, webhooks)
                                    </td>
                                    <td className="cmp-partial">Via plugin</td>
                                    <td className="cmp-yes">Yes</td>
                                    <td className="cmp-partial">
                                        Via Zod OpenAPI
                                    </td>
                                </tr>
                                <tr>
                                    <td>Exhaustive handler mapping</td>
                                    <td className="cmp-yes">
                                        mapHandlers() compile error
                                    </td>
                                    <td className="cmp-no">No</td>
                                    <td className="cmp-yes">
                                        Yes (Express/Fastify)
                                    </td>
                                    <td className="cmp-no">No</td>
                                </tr>
                                <tr>
                                    <td>Built-in client resilience</td>
                                    <td className="cmp-yes">
                                        Retry, timeout, dedup, cache, batching
                                    </td>
                                    <td className="cmp-no">No (DIY)</td>
                                    <td className="cmp-no">No (DIY)</td>
                                    <td className="cmp-no">No client</td>
                                </tr>
                                <tr>
                                    <td>Integrated auth &amp; DI</td>
                                    <td className="cmp-yes">
                                        JWT, RBAC, DI container
                                    </td>
                                    <td className="cmp-no">No</td>
                                    <td className="cmp-no">No</td>
                                    <td className="cmp-partial">
                                        Auth middleware
                                    </td>
                                </tr>
                                <tr>
                                    <td>WebSocket subscriptions</td>
                                    <td className="cmp-yes">
                                        Typed, bidirectional
                                    </td>
                                    <td className="cmp-yes">Yes</td>
                                    <td className="cmp-no">No</td>
                                    <td className="cmp-partial">Basic</td>
                                </tr>
                                <tr>
                                    <td>Schema-driven forms</td>
                                    <td className="cmp-yes">
                                        @cleverbrush/react-form
                                    </td>
                                    <td className="cmp-no">No</td>
                                    <td className="cmp-no">No</td>
                                    <td className="cmp-no">No</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <Link href="/comparisons" className="ecosystem-link">
                            Detailed comparisons with code examples →
                        </Link>
                    </p>
                </div>
            </section>

            {/* ── What You Get ──────────────────────────────────── */}
            <section className="section" id="features">
                <div className="container">
                    <h2 className="section-title">
                        Everything you need, nothing you don&apos;t
                    </h2>
                    <p className="subtitle" style={{ marginBottom: '2rem' }}>
                        Each library works standalone, but they compose into a
                        seamless full-stack platform.
                    </p>

                    <div className="features-grid">
                        <Link href="/server" className="feature-card">
                            <span className="feature-icon">⚡</span>
                            <strong>Schema-first server</strong>
                            <span>
                                Typed endpoints, runtime validation, content
                                negotiation, and RFC 9457 errors — from your
                                schema definition.
                            </span>
                        </Link>

                        <Link href="/client" className="feature-card">
                            <span className="feature-icon">🔗</span>
                            <strong>Auto-typed client</strong>
                            <span>
                                Zero-codegen Proxy client with built-in retry,
                                timeout, deduplication, caching, and request
                                batching.
                            </span>
                        </Link>

                        <Link href="/server-openapi" className="feature-card">
                            <span className="feature-icon">📄</span>
                            <strong>OpenAPI &amp; AsyncAPI</strong>
                            <span>
                                Full OpenAPI 3.1 with typed links, callbacks,
                                webhooks, and security schemes — generated,
                                never hand-written.
                            </span>
                        </Link>

                        <Link href="/auth" className="feature-card">
                            <span className="feature-icon">🔐</span>
                            <strong>Auth &amp; RBAC</strong>
                            <span>
                                JWT, cookies, OAuth2, OIDC — transport-agnostic
                                auth with typed principals and policy-based
                                authorization.
                            </span>
                        </Link>

                        <Link href="/di" className="feature-card">
                            <span className="feature-icon">🧩</span>
                            <strong>Dependency injection</strong>
                            <span>
                                .NET-style DI with schemas as service keys.
                                Singleton, scoped, and transient lifetimes. No
                                decorators.
                            </span>
                        </Link>

                        <Link
                            href="/client/react-integration"
                            className="feature-card"
                        >
                            <span className="feature-icon">⚛️</span>
                            <strong>React Query integration</strong>
                            <span>
                                TanStack Query hooks generated from your
                                contract — typed queryKeys, mutations, Suspense,
                                and prefetching.
                            </span>
                        </Link>

                        <Link href="/react-form" className="feature-card">
                            <span className="feature-icon">📝</span>
                            <strong>Schema-driven forms</strong>
                            <span>
                                Headless React forms auto-generated from
                                schemas. Type-safe field selectors instead of
                                string names.
                            </span>
                        </Link>

                        <Link
                            href="/client/subscriptions"
                            className="feature-card"
                        >
                            <span className="feature-icon">🔌</span>
                            <strong>WebSocket subscriptions</strong>
                            <span>
                                Typed real-time channels with bidirectional
                                messaging, tracked delivery, and automatic
                                reconnection.
                            </span>
                        </Link>

                        <Link href="/env" className="feature-card">
                            <span className="feature-icon">🛡️</span>
                            <strong>Type-safe env</strong>
                            <span>
                                Validate and coerce environment variables at
                                startup. Compile-time enforcement that every
                                leaf is bound.
                            </span>
                        </Link>

                        <Link href="/knex-schema" className="feature-card">
                            <span className="feature-icon">🗄️</span>
                            <strong>Schema-driven queries</strong>
                            <span>
                                Type-safe Knex query builder with eager loading,
                                column mapping, and CTE-based joins.
                            </span>
                        </Link>
                    </div>
                </div>
            </section>
            {/* ── Schema CTA ──────────────────────────────────────── */}
            <section className="section">
                <div className="container">
                    <div className="contribute-banner">
                        <div className="contribute-content">
                            <h2>Powered by @cleverbrush/schema</h2>
                            <p>
                                The schema library is the foundation — zero
                                dependencies, full type inference, runtime
                                introspection, and Standard Schema
                                compatibility. Try the interactive playground or
                                read the docs.
                            </p>
                            <div className="contribute-actions">
                                <a
                                    href="https://schema.cleverbrush.com"
                                    className="hero-btn hero-btn-primary"
                                >
                                    Explore Schema Library →
                                </a>
                                <a
                                    href="https://schema.cleverbrush.com/playground"
                                    className="hero-btn hero-btn-secondary"
                                >
                                    Open Playground →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Contribute CTA ──────────────────────────────────── */}
            <section className="section">
                <div className="container">
                    <div className="contribute-banner">
                        <div className="contribute-content">
                            <h2>
                                Help us build the future of typed web
                                development
                            </h2>
                            <p>
                                Cleverbrush libraries are open source and
                                community-driven. Whether it&apos;s fixing a
                                bug, improving docs, suggesting a feature, or
                                building a new library — every contribution
                                matters.
                            </p>
                            <div className="contribute-actions">
                                <a
                                    href="https://github.com/cleverbrush/framework"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hero-btn hero-btn-primary"
                                >
                                    View on GitHub →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
