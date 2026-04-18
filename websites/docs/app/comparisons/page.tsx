/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: needed for code examples */

import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export const metadata = {
    title: 'Comparisons — Cleverbrush vs tRPC, ts-rest, Hono',
    description:
        'Feature-by-feature comparison of Cleverbrush with tRPC, ts-rest, and Hono — with honest assessments and code examples.'
};

export default function ComparisonsPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Comparisons</h1>
                    <p className="subtitle">
                        How Cleverbrush compares to popular TypeScript
                        frameworks. We aim to be precise — where competitors are
                        ahead, we say so.
                    </p>
                </div>

                {/* ── Overview Table ──────────────────────────────── */}
                <div className="card">
                    <h2>Feature matrix</h2>
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
                                    <td>API style</td>
                                    <td>REST (contract-first)</td>
                                    <td>RPC only</td>
                                    <td>REST (contract-first)</td>
                                    <td>REST (server-first)</td>
                                </tr>
                                <tr>
                                    <td>Typed client</td>
                                    <td className="cmp-yes">
                                        Zero codegen, Proxy-based
                                    </td>
                                    <td className="cmp-yes">Yes</td>
                                    <td className="cmp-yes">Yes</td>
                                    <td className="cmp-yes">hc helper</td>
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
                                    <td>OpenAPI generation</td>
                                    <td className="cmp-yes">
                                        Full 3.1 (links, callbacks, webhooks)
                                    </td>
                                    <td className="cmp-partial">
                                        @trpc/openapi (alpha)
                                    </td>
                                    <td className="cmp-yes">
                                        @ts-rest/open-api
                                    </td>
                                    <td className="cmp-partial">
                                        @hono/zod-openapi
                                    </td>
                                </tr>
                                <tr>
                                    <td>Client retry &amp; timeout</td>
                                    <td className="cmp-yes">
                                        Built-in with backoff + jitter
                                    </td>
                                    <td className="cmp-no">
                                        Via TanStack Query
                                    </td>
                                    <td className="cmp-no">DIY</td>
                                    <td className="cmp-no">No client-side</td>
                                </tr>
                                <tr>
                                    <td>Client dedup &amp; batching</td>
                                    <td className="cmp-yes">Both built-in</td>
                                    <td className="cmp-partial">
                                        Batching via httpBatchLink
                                    </td>
                                    <td className="cmp-no">No</td>
                                    <td className="cmp-no">No</td>
                                </tr>
                                <tr>
                                    <td>Client caching</td>
                                    <td className="cmp-yes">
                                        Built-in TTL cache
                                    </td>
                                    <td className="cmp-no">
                                        Via TanStack Query
                                    </td>
                                    <td className="cmp-no">No</td>
                                    <td className="cmp-no">No</td>
                                </tr>
                                <tr>
                                    <td>Auth</td>
                                    <td className="cmp-yes">
                                        JWT, cookies, OAuth2, OIDC, RBAC
                                    </td>
                                    <td className="cmp-no">Context pattern</td>
                                    <td className="cmp-no">DIY</td>
                                    <td className="cmp-partial">
                                        Basic/Bearer/JWT middleware
                                    </td>
                                </tr>
                                <tr>
                                    <td>Dependency injection</td>
                                    <td className="cmp-yes">
                                        Schema-as-key, .NET-style
                                    </td>
                                    <td className="cmp-no">No</td>
                                    <td className="cmp-no">No</td>
                                    <td className="cmp-no">No</td>
                                </tr>
                                <tr>
                                    <td>WebSocket subscriptions</td>
                                    <td className="cmp-yes">
                                        Typed, bidirectional, reconnect
                                    </td>
                                    <td className="cmp-yes">
                                        Yes, with tracked events
                                    </td>
                                    <td className="cmp-no">No</td>
                                    <td className="cmp-yes">
                                        Via WebSocket Helper
                                    </td>
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
                                <tr>
                                    <td>Multi-runtime</td>
                                    <td className="cmp-no">Node.js</td>
                                    <td className="cmp-yes">
                                        Node.js, Bun, Deno, CF Workers
                                    </td>
                                    <td className="cmp-partial">
                                        Node.js (adapters)
                                    </td>
                                    <td className="cmp-yes">
                                        All major runtimes
                                    </td>
                                </tr>
                                <tr>
                                    <td>Schema library</td>
                                    <td>@cleverbrush/schema (own)</td>
                                    <td>Any (Zod, Valibot, etc.)</td>
                                    <td>Zod, Valibot, ArkType</td>
                                    <td>Zod (via @hono/zod-openapi)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── vs tRPC ────────────────────────────────────── */}
                <div className="card">
                    <h2>vs tRPC</h2>

                    <h3>Where Cleverbrush is stronger</h3>
                    <ul>
                        <li>
                            <strong>Standard REST endpoints</strong> — tRPC uses
                            RPC semantics exclusively. Cleverbrush produces
                            standard REST endpoints that work with any HTTP
                            client, not just the tRPC client.
                        </li>
                        <li>
                            <strong>Client resilience</strong> — built-in retry
                            with exponential backoff + jitter, timeout,
                            deduplication, TTL caching, and request batching.
                            tRPC relies on TanStack Query for retry/cache.
                        </li>
                        <li>
                            <strong>Integrated auth &amp; DI</strong> — JWT,
                            OAuth2, OIDC, policy-based authorization, and
                            schema-driven dependency injection. tRPC uses a
                            manual context pattern.
                        </li>
                        <li>
                            <strong>OpenAPI completeness</strong> — response
                            links, callbacks, webhooks, response headers, and
                            security schemes. tRPC&apos;s OpenAPI support is
                            alpha-stage.
                        </li>
                        <li>
                            <strong>Schema-driven forms</strong> — generate
                            headless React forms from the same schemas used by
                            the server.
                        </li>
                    </ul>

                    <h3>Where tRPC is stronger</h3>
                    <ul>
                        <li>
                            <strong>Community &amp; ecosystem</strong> — 36k+
                            GitHub stars, extensive tutorials, adapter
                            ecosystem, and widespread adoption.
                        </li>
                        <li>
                            <strong>Multi-runtime</strong> — tRPC works in
                            Cloudflare Workers, Deno, Bun, AWS Lambda, and more.
                            Cleverbrush currently targets Node.js.
                        </li>
                        <li>
                            <strong>Any validator</strong> — tRPC works with
                            Zod, Valibot, ArkType, Yup, and any Standard Schema
                            validator. Cleverbrush uses its own schema library
                            (which supports Standard Schema and can wrap other
                            validators via <code>extern()</code>).
                        </li>
                    </ul>

                    <h3>Code comparison: defining an endpoint</h3>
                    <div className="code-block-group">
                        <div className="code-block-label">
                            <span className="code-block-badge code-block-badge--server">
                                Cleverbrush
                            </span>
                        </div>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`// contract.ts — shared between server and client
const api = defineApi({
  users: {
    create: endpoint.post('/api/users')
              .body(CreateUserBody)
              .returns(User)
  }
});

// server.ts — exhaustive handler mapping
mapHandlers(server, api, {
  users: {
    create: async ({ body }) => db.users.insert(body)
  }
});

// client.ts — zero codegen
const client = createClient(api, { baseUrl });
const user = await client.users.create({ body: { name: 'Alice' } });`)
                                }}
                            />
                        </pre>

                        <div
                            className="code-block-label"
                            style={{ marginTop: '1.5rem' }}
                        >
                            <span className="code-block-badge code-block-badge--client">
                                tRPC
                            </span>
                        </div>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`// server.ts — define procedures inline
const appRouter = router({
  createUser: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => db.users.insert(input))
});
type AppRouter = typeof appRouter;

// client.ts — needs the server type
const trpc = createTRPCClient<AppRouter>({ links: [...] });
const user = await trpc.createUser.mutate({ name: 'Alice' });`)
                                }}
                            />
                        </pre>
                    </div>
                </div>

                {/* ── vs ts-rest ──────────────────────────────────── */}
                <div className="card">
                    <h2>vs ts-rest</h2>
                    <p>
                        ts-rest is the closest competitor architecturally — both
                        use contract-first REST with typed clients.
                    </p>

                    <h3>Where Cleverbrush is stronger</h3>
                    <ul>
                        <li>
                            <strong>Client resilience</strong> — retry, timeout,
                            deduplication, caching, and batching are all
                            built-in. ts-rest provides a lightweight fetch
                            client with no resilience features.
                        </li>
                        <li>
                            <strong>Auth &amp; DI</strong> — integrated JWT,
                            OAuth2, OIDC, policy-based authorization, and
                            schema-driven DI. ts-rest has no auth or DI system.
                        </li>
                        <li>
                            <strong>WebSocket subscriptions</strong> — typed
                            bidirectional channels with automatic reconnection.
                            ts-rest has no WebSocket support.
                        </li>
                        <li>
                            <strong>OpenAPI completeness</strong> — typed
                            response links, callbacks, webhooks, and response
                            headers. ts-rest generates basic OpenAPI specs.
                        </li>
                        <li>
                            <strong>Schema-driven forms &amp; mapping</strong> —
                            the schema powers form generation and object mapping
                            with compile-time completeness checking.
                        </li>
                    </ul>

                    <h3>Where ts-rest is stronger</h3>
                    <ul>
                        <li>
                            <strong>Server adapter ecosystem</strong> — ts-rest
                            works with Express, Fastify, Next.js, and NestJS.
                            Cleverbrush has its own server.
                        </li>
                        <li>
                            <strong>Validator agnostic</strong> — ts-rest works
                            with Zod, Valibot, and ArkType out of the box.
                        </li>
                        <li>
                            <strong>Community</strong> — more established with a
                            growing ecosystem and community resources.
                        </li>
                    </ul>
                </div>

                {/* ── vs Hono ────────────────────────────────────── */}
                <div className="card">
                    <h2>vs Hono</h2>
                    <p>
                        Hono is a lightweight, multi-runtime web framework.
                        Different philosophy — Hono is server-first and
                        runtime-flexible; Cleverbrush is schema-first and
                        full-stack.
                    </p>

                    <h3>Where Cleverbrush is stronger</h3>
                    <ul>
                        <li>
                            <strong>Contract-first architecture</strong> —
                            shared contract with exhaustive handler mapping.
                            Hono&apos;s <code>hc</code> client infers types from{' '}
                            <code>typeof app</code> which can cause IDE
                            performance issues in large apps.
                        </li>
                        <li>
                            <strong>Client resilience</strong> — built-in retry,
                            timeout, deduplication, caching, batching.
                            Hono&apos;s <code>hc</code> is a minimal fetch
                            wrapper.
                        </li>
                        <li>
                            <strong>Auth &amp; DI</strong> — comprehensive auth
                            system with OAuth2, OIDC, and policy-based
                            authorization. Hono has basic auth/JWT middleware
                            but no authorization framework or DI container.
                        </li>
                        <li>
                            <strong>Full-stack integration</strong> — schemas
                            drive server endpoints, client types, OpenAPI,
                            forms, DI, and object mapping. Hono focuses on the
                            server layer only.
                        </li>
                    </ul>

                    <h3>Where Hono is stronger</h3>
                    <ul>
                        <li>
                            <strong>Multi-runtime</strong> — runs on Cloudflare
                            Workers, Deno, Bun, AWS Lambda, Fastly, and more.
                            Cleverbrush currently targets Node.js.
                        </li>
                        <li>
                            <strong>Middleware ecosystem</strong> — 20+ built-in
                            middleware (CORS, ETag, compress, logger, etc.) plus
                            third-party packages.
                        </li>
                        <li>
                            <strong>Lightweight &amp; fast</strong> — optimized
                            for edge runtimes with minimal overhead.
                        </li>
                        <li>
                            <strong>Community</strong> — large, active community
                            with extensive tutorials and production usage.
                        </li>
                    </ul>
                </div>

                {/* ── Schema comparison ───────────────────────────── */}
                <div className="card">
                    <h2>Schema library comparison</h2>
                    <p>
                        <code>@cleverbrush/schema</code> is the foundation. For
                        detailed benchmarks, bundle size comparisons, and
                        feature matrix vs Zod, Valibot, ArkType, and TypeBox,
                        see the dedicated schema site:
                    </p>
                    <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                        <a
                            href="https://schema.cleverbrush.com/docs/comparison"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hero-btn hero-btn-primary"
                        >
                            Schema Comparison →
                        </a>
                        <a
                            href="https://schema.cleverbrush.com/playground"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hero-btn hero-btn-secondary"
                            style={{ marginLeft: '1rem' }}
                        >
                            Interactive Playground →
                        </a>
                    </div>
                </div>

                {/* ── Honest gaps ─────────────────────────────────── */}
                <div className="why-box">
                    <h2>Where we&apos;re honest about gaps</h2>
                    <ul>
                        <li>
                            <strong>Multi-runtime support</strong> — currently
                            Node.js only. Cloudflare Workers, Deno, and Bun
                            support is planned.
                        </li>
                        <li>
                            <strong>Community size</strong> — pre-1.0 vs
                            established ecosystems with thousands of stars and
                            extensive community resources.
                        </li>
                        <li>
                            <strong>Server adapter flexibility</strong> —
                            Cleverbrush has its own server rather than adapters
                            for Express/Fastify/Next.js.
                        </li>
                        <li>
                            <strong>Validator lock-in</strong> — built around
                            <code>@cleverbrush/schema</code>. The{' '}
                            <code>extern()</code> wrapper allows using
                            Zod/Valibot schemas inside Cleverbrush schemas for
                            incremental adoption.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
