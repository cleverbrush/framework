/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */

import {
    PerformativeHero,
    PerformativeProofRow
} from '@cleverbrush/website-shared/components/Performative';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import Link from 'next/link';
import { docsMetadata } from './site';

export const metadata = docsMetadata('/');

export default function DocsHomePage() {
    return (
        <>
            {/* ── Hero ─────────────────────────────────────────────── */}
            <PerformativeHero
                eyebrow="Schema-first full-stack TypeScript framework"
                headline="One contract for"
                rotatingWords={[
                    'servers',
                    'clients',
                    'OpenAPI',
                    'forms',
                    'auth'
                ]}
                body={
                    <>
                        Define data shapes once with{' '}
                        <a
                            href="https://schema.cleverbrush.com"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            @cleverbrush/schema
                        </a>
                        . Get type-safe servers, auto-typed clients, OpenAPI
                        docs, dependency injection, auth, and React forms from
                        that single definition.
                    </>
                }
                actions={[
                    {
                        href: '/getting-started',
                        label: 'Get started',
                        variant: 'glow'
                    },
                    {
                        href: '/why',
                        label: 'Why Cleverbrush?',
                        variant: 'wave'
                    },
                    {
                        href: 'https://github.com/cleverbrush/framework',
                        label: 'GitHub',
                        external: true,
                        variant: 'ghost'
                    }
                ]}
                metrics={[
                    { target: 18, label: 'workspace packages' },
                    { value: '0', label: 'client codegen steps' },
                    { value: '3.1', label: 'OpenAPI target' },
                    { value: '1', label: 'shared schema contract' }
                ]}
                badges={[
                    'Contract-first REST',
                    'Built-in auth and DI',
                    'Typed resilient client',
                    'Schema-driven React forms'
                ]}
                code={{
                    filename: 'contract.ts',
                    code: `import { defineApi, endpoint } from '@cleverbrush/server/contract';
import { object, string, array } from '@cleverbrush/schema';

const User = object({
    id: string().uuid(),
    email: string().email()
});

export const api = defineApi({
    users: {
        list: endpoint.get('/api/users').returns(array(User)),
        create: endpoint.post('/api/users').body(User).returns(User)
    }
});`
                }}
            />
            <section className="section cb-pui-home-proof">
                <div className="container">
                    <PerformativeProofRow
                        marquee={[
                            { label: '@cleverbrush/server', tone: 'mono' },
                            { label: '@cleverbrush/client', tone: 'mono' },
                            { label: '@cleverbrush/auth', tone: 'mono' },
                            { label: '@cleverbrush/di', tone: 'mono' },
                            { label: '@cleverbrush/react-form', tone: 'mono' },
                            { label: 'OpenAPI 3.1', tone: 'strong' },
                            { label: 'Zero codegen', tone: 'serif' }
                        ]}
                        items={[
                            {
                                href: 'https://github.com/cleverbrush/framework',
                                icon: 'GH',
                                title: 'Open source on GitHub',
                                subtitle: 'BSD-3-Clause framework monorepo'
                            },
                            {
                                href: '/api-docs',
                                icon: 'API',
                                title: 'Generated API reference',
                                subtitle: 'Typed package docs published here'
                            },
                            {
                                href: 'https://schema.cleverbrush.com',
                                icon: 'S',
                                title: 'Schema foundation',
                                subtitle:
                                    'Validation, inference, and descriptors'
                            }
                        ]}
                    />
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
                            <caption className="visually-hidden">
                                Comparison table
                            </caption>
                            <thead>
                                <tr>
                                    <th scope="col">Feature</th>
                                    <th scope="col">Cleverbrush</th>
                                    <th scope="col">tRPC</th>
                                    <th scope="col">ts-rest</th>
                                    <th scope="col">Hono</th>
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
            {/* ── Demo App CTA ─────────────────────────────────────── */}
            <section className="section">
                <div className="container">
                    <div className="contribute-banner">
                        <div className="contribute-content">
                            <h2>See the framework in action</h2>
                            <p>
                                The monorepo includes a production-style
                                full-stack Todo app built with every major
                                Cleverbrush package — backend REST API, typed
                                client, JWT auth, DI, schema-driven forms, ORM,
                                auto-generated OpenAPI, real-time WebSockets,
                                and OpenTelemetry tracing. Run it locally in one
                                command.
                            </p>
                            <div className="contribute-actions">
                                <Link
                                    href="/demo"
                                    className="hero-btn hero-btn-primary"
                                >
                                    Run the Demo →
                                </Link>
                                <a
                                    href="https://github.com/cleverbrush/framework/tree/master/demos"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hero-btn hero-btn-secondary"
                                >
                                    View Source →
                                </a>
                            </div>
                        </div>
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
