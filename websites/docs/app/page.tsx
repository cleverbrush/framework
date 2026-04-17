/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import Link from 'next/link';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';

export default function DocsHomePage() {
    return (
        <>
            {/* ── Hero ─────────────────────────────────────────────── */}
            <section className="hero">
                <p className="hero-eyebrow">
                    Schema-first web framework for TypeScript
                </p>
                <h1>
                    Define once.
                    <br />
                    Server, client, OpenAPI.
                </h1>
                <p className="tagline">
                    Build type-safe HTTP servers, auto-typed clients, and
                    OpenAPI specs — all derived from a single{' '}
                    <a
                        href="https://schema.cleverbrush.com"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/schema
                    </a>{' '}
                    definition. Zero duplication, zero type drift, zero
                    boilerplate.
                </p>
                <div className="hero-actions">
                    <Link href="/server" className="hero-btn hero-btn-primary">
                        Get Started with Server
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
                    <Link
                        href="/client"
                        className="hero-btn hero-btn-playground"
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M17 1l4 4-4 4" />
                            <path d="M3 11V9a4 4 0 014-4h14" />
                            <path d="M7 23l-4-4 4-4" />
                            <path d="M21 13v2a4 4 0 01-4 4H3" />
                        </svg>
                        Explore the Client
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
                    <span className="badge">Type-safe endpoints</span>
                    <span className="badge">Auto-typed client</span>
                    <span className="badge">OpenAPI generation</span>
                    <span className="badge">Built-in auth</span>
                    <span className="badge">Dependency injection</span>
                    <span className="badge">BSD-3 Licensed</span>
                </div>
            </section>

            {/* ── Quick Install ────────────────────────────────────── */}
            <section className="install-section">
                <div className="container">
                    <div className="install-section-header">
                        <h2>Get started in seconds</h2>
                        <p>
                            Install the server and client — schemas are the
                            glue.
                        </p>
                    </div>
                    <InstallBanner
                        commands={[
                            {
                                command:
                                    'npm install @cleverbrush/server @cleverbrush/schema',
                                label: 'Server — schema-first HTTP endpoints'
                            },
                            {
                                command: 'npm install @cleverbrush/client',
                                label: 'Client — auto-typed API consumer'
                            },
                            {
                                command: 'npm install @cleverbrush/auth',
                                label: 'Auth — JWT, sessions, RBAC (optional)'
                            },
                            {
                                command: 'npm install @cleverbrush/di',
                                label: 'DI — dependency injection (optional)'
                            }
                        ]}
                        note={
                            <>
                                <code>@cleverbrush/server</code> depends on{' '}
                                <code>@cleverbrush/schema</code> for request and
                                response validation.{' '}
                                <code>@cleverbrush/client</code> infers types
                                from server definitions — no code generation
                                needed.
                            </>
                        }
                    />
                </div>
            </section>

            {/* ── How It Works ─────────────────────────────────────── */}
            <section className="section" id="how-it-works">
                <div className="container">
                    <h2 className="section-title">How it works</h2>
                    <p className="subtitle" style={{ marginBottom: '2rem' }}>
                        Define your data shapes once with{' '}
                        <code>@cleverbrush/schema</code>. Every layer of the
                        stack derives its types from that single source of
                        truth.
                    </p>

                    <div className="schema-features-grid">
                        <div className="schema-feature">
                            <span className="schema-feature-icon">🔷</span>
                            <strong>1. Define a schema</strong>
                            <p>
                                Create your request and response schemas with{' '}
                                <a href="https://schema.cleverbrush.com">
                                    @cleverbrush/schema
                                </a>
                                . TypeScript types are inferred automatically.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">⚡</span>
                            <strong>2. Build a server</strong>
                            <p>
                                <code>@cleverbrush/server</code> validates
                                incoming data against the schema and types your
                                handlers end-to-end.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">🔗</span>
                            <strong>3. Import & use the client</strong>
                            <p>
                                <code>@cleverbrush/client</code> reads the
                                server type and gives you a fully typed API
                                client — no code generation step.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">📄</span>
                            <strong>4. Get OpenAPI for free</strong>
                            <p>
                                <code>@cleverbrush/server-openapi</code>{' '}
                                introspects schemas at runtime and emits a
                                complete OpenAPI 3.0 spec.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">🔒</span>
                            <strong>5. Add auth</strong>
                            <p>
                                <code>@cleverbrush/auth</code> plugs into the
                                server with typed user context, JWT handling,
                                and role-based access control.
                            </p>
                        </div>
                        <div className="schema-feature">
                            <span className="schema-feature-icon">📦</span>
                            <strong>6. Wire with DI</strong>
                            <p>
                                <code>@cleverbrush/di</code> provides a
                                lightweight, typed container for services,
                                repositories, and cross-cutting concerns.
                            </p>
                        </div>
                    </div>

                    <div className="code-block-group">
                        <div className="code-block-label">
                            <span className="code-block-badge code-block-badge--shared">
                                shared / contract
                            </span>
                            <span className="code-block-file">api.ts</span>
                        </div>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`import { defineApi, endpoint } from '@cleverbrush/server/contract';
import { object, string, number, type InferType } from '@cleverbrush/schema';

// Schemas — written once, inferred everywhere
const CreateUserBody = object({
  name:  string().minLength(2),
  email: string().minLength(5),
  age:   number().min(0).max(150)
});

const UserResponse = object({
  id:    string(),
  name:  string(),
  email: string(),
  age:   number()
});

// TypeScript types flow directly from the schema — no duplication
type CreateUserInput = InferType<typeof CreateUserBody>;
//   ^ { name: string; email: string; age: number }
type User = InferType<typeof UserResponse>;
//   ^ { id: string; name: string; email: string; age: number }

// The contract is the single source of truth for both sides of the wire
export const api = defineApi({
  users: {
    create: endpoint.post('/api/users').body(CreateUserBody).returns(UserResponse)
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
                                server
                            </span>
                            <span className="code-block-file">server.ts</span>
                        </div>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`import { createServer } from '@cleverbrush/server';
import { api } from './api';

const server = createServer();

server.handle(api.users.create, ({ body }) => {
  //                               ^^^^ typed as CreateUserInput — guaranteed at runtime too
  //                                    invalid requests are rejected before the handler runs
  const user = { id: crypto.randomUUID(), ...body };
  return user;
  // return type is checked against UserResponse — wrong shape is a compile error
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
                                client
                            </span>
                            <span className="code-block-file">app.ts</span>
                        </div>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`import { createClient } from '@cleverbrush/client';
import { api } from './api';

const client = createClient(api, { baseUrl: 'http://localhost:3000' });
// No codegen. Types come straight from the contract — always in sync.

const user = await client.users.create({
  name: 'Alice', email: 'alice@example.com', age: 30
  //                                         ^^^^^^ wrong type → compile error
});
// user is typed as User: { id: string; name: string; email: string; age: number }`)
                                }}
                            />
                        </pre>
                    </div>
                </div>
            </section>

            {/* ── Framework Libraries ──────────────────────────────── */}
            <section className="section" id="libraries">
                <div className="container">
                    <h2 className="section-title">The framework stack</h2>
                    <p className="subtitle" style={{ marginBottom: '2rem' }}>
                        Each library is independent and can be used standalone,
                        but they are designed to compose together seamlessly.
                    </p>

                    <div className="ecosystem-diagram">
                        <div className="ecosystem-center">
                            <a
                                href="https://schema.cleverbrush.com"
                                className="ecosystem-core"
                            >
                                <svg
                                    width="20"
                                    height="20"
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
                                @cleverbrush/schema
                            </a>
                        </div>
                        <div className="ecosystem-spokes">
                            <div className="ecosystem-spoke">
                                <div className="ecosystem-spoke-icon">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <rect
                                            x="2"
                                            y="3"
                                            width="20"
                                            height="14"
                                            rx="2"
                                        />
                                        <path d="M8 21h8" />
                                        <path d="M12 17v4" />
                                    </svg>
                                </div>
                                <div>
                                    <strong>@cleverbrush/server</strong>
                                    <span>
                                        Schema-first HTTP server — typed
                                        endpoints, content negotiation, DI
                                        integration.
                                    </span>
                                </div>
                                <div className="spoke-links">
                                    <Link
                                        href="/server"
                                        className="ecosystem-link"
                                    >
                                        Docs →
                                    </Link>
                                    <a
                                        href="https://www.npmjs.com/package/@cleverbrush/server"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="spoke-npm-link"
                                    >
                                        npm ↗
                                    </a>
                                </div>
                            </div>
                            <div className="ecosystem-spoke">
                                <div className="ecosystem-spoke-icon">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M17 1l4 4-4 4" />
                                        <path d="M3 11V9a4 4 0 014-4h14" />
                                        <path d="M7 23l-4-4 4-4" />
                                        <path d="M21 13v2a4 4 0 01-4 4H3" />
                                    </svg>
                                </div>
                                <div>
                                    <strong>@cleverbrush/client</strong>
                                    <span>
                                        Auto-typed API client — infers types
                                        from the server definition, no codegen
                                        needed.
                                    </span>
                                </div>
                                <div className="spoke-links">
                                    <Link
                                        href="/client"
                                        className="ecosystem-link"
                                    >
                                        Docs →
                                    </Link>
                                    <a
                                        href="https://www.npmjs.com/package/@cleverbrush/client"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="spoke-npm-link"
                                    >
                                        npm ↗
                                    </a>
                                </div>
                            </div>
                            <div className="ecosystem-spoke">
                                <div className="ecosystem-spoke-icon">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <rect
                                            x="3"
                                            y="11"
                                            width="18"
                                            height="11"
                                            rx="2"
                                        />
                                        <path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                </div>
                                <div>
                                    <strong>@cleverbrush/auth</strong>
                                    <span>
                                        JWT, sessions, and RBAC — plugs into the
                                        server with typed user context.
                                    </span>
                                </div>
                                <div className="spoke-links">
                                    <Link
                                        href="/auth"
                                        className="ecosystem-link"
                                    >
                                        Docs →
                                    </Link>
                                    <a
                                        href="https://www.npmjs.com/package/@cleverbrush/auth"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="spoke-npm-link"
                                    >
                                        npm ↗
                                    </a>
                                </div>
                            </div>
                            <div className="ecosystem-spoke">
                                <div className="ecosystem-spoke-icon">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                </div>
                                <div>
                                    <strong>@cleverbrush/server-openapi</strong>
                                    <span>
                                        Introspects schemas and emits a complete
                                        OpenAPI 3.0 spec from your server
                                        definition.
                                    </span>
                                </div>
                                <div className="spoke-links">
                                    <Link
                                        href="/server-openapi"
                                        className="ecosystem-link"
                                    >
                                        Docs →
                                    </Link>
                                    <a
                                        href="https://www.npmjs.com/package/@cleverbrush/server-openapi"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="spoke-npm-link"
                                    >
                                        npm ↗
                                    </a>
                                </div>
                            </div>
                            <div className="ecosystem-spoke">
                                <div className="ecosystem-spoke-icon">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M12 1v6m0 6v6m-7-7h6m6 0h6" />
                                    </svg>
                                </div>
                                <div>
                                    <strong>@cleverbrush/di</strong>
                                    <span>
                                        Lightweight typed container for
                                        services, repositories, and
                                        cross-cutting concerns.
                                    </span>
                                </div>
                                <div className="spoke-links">
                                    <Link href="/di" className="ecosystem-link">
                                        Docs →
                                    </Link>
                                    <a
                                        href="https://www.npmjs.com/package/@cleverbrush/di"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="spoke-npm-link"
                                    >
                                        npm ↗
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features ──────────────────────────────────────── */}
            <section className="section" id="features">
                <div className="container">
                    <h2 className="section-title">Built-in, not bolted on</h2>
                    <p className="subtitle" style={{ marginBottom: '2rem' }}>
                        Everything you need for production APIs — fully typed,
                        zero glue code.
                    </p>

                    <div className="features-grid">
                        <Link href="/server" className="feature-card">
                            <span className="feature-icon">✅</span>
                            <strong>Runtime validation</strong>
                            <span>
                                Body, query, and path params are validated at
                                runtime using the same schemas that power your
                                types.
                            </span>
                        </Link>

                        <Link href="/server" className="feature-card">
                            <span className="feature-icon">🛡️</span>
                            <strong>RFC 9457 Problem Details</strong>
                            <span>
                                Validation errors and HTTP exceptions become
                                structured, machine-readable JSON responses
                                automatically.
                            </span>
                        </Link>

                        <Link href="/server" className="feature-card">
                            <span className="feature-icon">🔗</span>
                            <strong>Typed route &amp; query params</strong>
                            <span>
                                Path parameters and query strings are inferred
                                from the route pattern and schema — no manual
                                casting.
                            </span>
                        </Link>

                        <Link href="/server" className="feature-card">
                            <span className="feature-icon">🔌</span>
                            <strong>WebSocket subscriptions</strong>
                            <span>
                                Real-time channels with typed events, tracked
                                delivery, and bidirectional messaging built into
                                the contract.
                            </span>
                        </Link>

                        <Link href="/server-openapi" className="feature-card">
                            <span className="feature-icon">📄</span>
                            <strong>OpenAPI &amp; AsyncAPI</strong>
                            <span>
                                Spec is generated from your schemas and
                                endpoints — always up-to-date, always matching
                                real types.
                            </span>
                        </Link>

                        <Link href="/client" className="feature-card">
                            <span className="feature-icon">🔄</span>
                            <strong>Client resilience</strong>
                            <span>
                                Retries, timeouts, deduplication, and caching
                                out of the box — fully configurable per call or
                                globally.
                            </span>
                        </Link>

                        <Link href="/client" className="feature-card">
                            <span className="feature-icon">📦</span>
                            <strong>Request batching</strong>
                            <span>
                                Automatically batch multiple calls into a single
                                HTTP request to reduce round-trips and
                                connection overhead.
                            </span>
                        </Link>

                        <Link
                            href="/client/react-integration"
                            className="feature-card"
                        >
                            <span className="feature-icon">⚛️</span>
                            <strong>React Query integration</strong>
                            <span>
                                First-class hooks for TanStack Query — typed
                                query keys, mutations, and optimistic updates
                                from your contract.
                            </span>
                        </Link>

                        <Link href="/auth" className="feature-card">
                            <span className="feature-icon">🔐</span>
                            <strong>Auth &amp; RBAC</strong>
                            <span>
                                JWT, sessions, and role-based access control
                                plug into the server with strongly typed user
                                context.
                            </span>
                        </Link>

                        <Link href="/di" className="feature-card">
                            <span className="feature-icon">🧩</span>
                            <strong>Dependency injection</strong>
                            <span>
                                Typed DI container for services, repositories,
                                and cross-cutting concerns — no decorators
                                required.
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
