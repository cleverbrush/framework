/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function ServerOpenApiPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/server-openapi</h1>
                    <p className="subtitle">
                        Your endpoint definitions <strong>are</strong> your
                        OpenAPI spec. No annotations, no decorators, no separate
                        YAML to maintain — the schema you already write for
                        routing and validation generates a full OpenAPI 3.1
                        document automatically.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <InstallBanner
                    command="npm install @cleverbrush/server-openapi @cleverbrush/server"
                    note={
                        <>
                            Requires <code>@cleverbrush/schema</code> and{' '}
                            <code>@cleverbrush/schema-json</code> as peer
                            dependencies.
                        </>
                    }
                />

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/server-openapi?</h2>

                    <h3>The Problem</h3>
                    <p>
                        API documentation drifts from implementation. Keeping
                        OpenAPI specs up to date manually is error-prone.
                        Annotation-based approaches couple documentation to
                        source code in brittle ways.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        Your endpoint definitions already describe routes,
                        request bodies, query params, and response types.{' '}
                        <code>@cleverbrush/server-openapi</code> reads those
                        definitions and emits a complete OpenAPI 3.1 document —
                        including <code>$ref</code> deduplication, security
                        schemes, and discriminated unions. There is no separate
                        spec to maintain — change the code, the spec updates
                        itself.
                    </p>

                    <h3>Key Features</h3>
                    <ul>
                        <li>
                            <strong>
                                <code>generateOpenApiSpec()</code>
                            </strong>{' '}
                            — produces a full OpenAPI 3.1 document.
                        </li>
                        <li>
                            <strong>Schema conversion</strong> — maps{' '}
                            <code>@cleverbrush/schema</code> builders to JSON
                            Schema Draft 2020-12.
                        </li>
                        <li>
                            <strong>Path resolution</strong> — colon-style and{' '}
                            <code>ParseStringSchemaBuilder</code> templates both
                            produce typed OpenAPI path parameters.
                        </li>
                        <li>
                            <strong>Security mapping</strong> — JWT, cookie,
                            OAuth 2.0, and OpenID Connect auth schemes become{' '}
                            <code>securitySchemes</code> automatically.
                        </li>
                        <li>
                            <strong>Top-level tags</strong> — pass{' '}
                            <code>
                                tags: [{'{'}name, description?{'}'}]
                            </code>{' '}
                            to annotate tag groups; tag names are also
                            auto-collected from endpoint registrations.
                        </li>
                        <li>
                            <strong>Discriminated unions</strong> — the OpenAPI{' '}
                            <code>discriminator</code> keyword is emitted
                            automatically for tagged union schemas, enabling
                            code generators (openapi-generator, orval) to
                            produce proper typed variants.
                        </li>
                        <li>
                            <strong>
                                <code>serveOpenApi()</code>
                            </strong>{' '}
                            middleware and{' '}
                            <strong>
                                <code>createOpenApiEndpoint()</code>
                            </strong>{' '}
                            for runtime serving.
                        </li>
                        <li>
                            <strong>
                                <code>writeOpenApiSpec()</code>
                            </strong>{' '}
                            for build-time file generation.
                        </li>
                    </ul>
                </div>

                {/* ── Quick Start ──────────────────────────────────── */}
                <div className="card">
                    <h2>Quick Start — serve at runtime</h2>
                    <p>
                        Add the <code>serveOpenApi</code> middleware before
                        starting the server. The spec is lazily generated and
                        cached on the first request to{' '}
                        <code>/openapi.json</code>:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { createServer, endpoint, route } from '@cleverbrush/server';
import { serveOpenApi } from '@cleverbrush/server-openapi';
import { object, string, number } from '@cleverbrush/schema';

const GetUser = endpoint
    .get('/api/users', route({ id: number().coerce() })\`/\${t => t.id}\`)
    .summary('Get a user by ID')
    .tags('users');

const server = createServer();

server
    .use(serveOpenApi({
        getRegistrations: () => server.getRegistrations(),
        info: { title: 'My API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }]
    }))
    .handle(GetUser, ({ params }) => ({ id: params.id }));

await server.listen(3000);
// GET /openapi.json → OpenAPI 3.1 document`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── As Endpoint ──────────────────────────────────── */}
                <div className="card">
                    <h2>Serve as a Typed Endpoint</h2>
                    <p>
                        Prefer registering the spec as a first-class endpoint so
                        it appears in the spec itself and benefits from the same
                        middleware pipeline:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { createOpenApiEndpoint } from '@cleverbrush/server-openapi';

const { endpoint: openApiEp, handler } = createOpenApiEndpoint({
    getRegistrations: () => server.getRegistrations(),
    info: { title: 'My API', version: '1.0.0' }
});

server.handle(openApiEp, handler);`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Build-time generation ────────────────────────── */}
                <div className="card">
                    <h2>Build-Time File Generation</h2>
                    <p>
                        Generate the spec to a file during your build pipeline
                        or CI:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { writeOpenApiSpec } from '@cleverbrush/server-openapi';

// Import your server registrations (without listening)
import { registrations } from './app';

await writeOpenApiSpec({
    registrations,
    info: { title: 'My API', version: '1.0.0' },
    outputPath: './openapi.json'
});`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── $ref Deduplication ───────────────────────────── */}
                <div className="card">
                    <h2>
                        <code>$ref</code> Deduplication — Named Schemas
                    </h2>
                    <p>
                        Call <code>.schemaName(&apos;Name&apos;)</code> on any{' '}
                        <code>@cleverbrush/schema</code> builder to mark it as a
                        named component. <code>generateOpenApiSpec()</code>{' '}
                        automatically extracts all named schemas into{' '}
                        <code>components/schemas</code> and replaces every
                        inline occurrence with a <code>$ref</code> pointer —
                        eliminating repetition and producing cleaner specs.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(
                                    `import { object, string, number, array } from '@cleverbrush/schema';
import { endpoint, route } from '@cleverbrush/server';
import { generateOpenApiSpec } from '@cleverbrush/server-openapi';

// Export as a constant — reuse the same reference everywhere
export const UserSchema = object({
    id:   number(),
    name: string().nonempty(),
}).schemaName('User');

const GetUser   = endpoint
    .get('/api/users', route({ id: number().coerce() })\`/\${t => t.id}\`)
    .returns(UserSchema);
const ListUsers = endpoint.get('/api/users').returns(array(UserSchema));

const spec = generateOpenApiSpec({
    registrations: [GetUser.registration, ListUsers.registration],
    info: { title: 'My API', version: '1.0.0' },
});

// ✅ UserSchema is emitted ONCE under components.schemas.User
// ✅ Both endpoints receive { "$ref": "#/components/schemas/User" }
//    instead of repeating the full inline definition`
                                )
                            }}
                        />
                    </pre>
                    <p>
                        Nested named schemas inside request bodies and response
                        objects are resolved automatically too:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(
                                    `const AddressSchema = object({
    street: string(),
    city:   string(),
}).schemaName('Address');

// Wrapper is anonymous → inlined; nested Address → $ref
const CreateUserBody = object({ address: AddressSchema, name: string() });`
                                )
                            }}
                        />
                    </pre>
                    <p>
                        <strong>Conflict rule:</strong> registering two{' '}
                        <em>different</em> schema instances under the same name
                        throws during spec generation. Always export named
                        schemas as constants and share the same object
                        reference.
                    </p>
                </div>

                {/* ── Auth ─────────────────────────────────────────── */}
                <div className="card">
                    <h2>Security Schemes from Auth Config</h2>
                    <p>
                        Pass the server&apos;s <code>AuthenticationConfig</code>{' '}
                        to generate <code>securitySchemes</code> and
                        per-operation <code>security</code> arrays
                        automatically:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { jwtScheme, authorizationCodeScheme } from '@cleverbrush/auth';

const authConfig = {
    defaultScheme: 'jwt',
    schemes: [
        jwtScheme({ secret: '...', mapClaims: c => c }),
        authorizationCodeScheme({
            authorizationUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            scopes: { 'read:items': 'Read items' },
            authenticate: async (ctx) => ({ succeeded: false })
        })
    ]
};

server.use(serveOpenApi({
    getRegistrations: () => server.getRegistrations(),
    info: { title: 'My API', version: '1.0.0' },
    authConfig
}));

// JWT → securitySchemes.jwt: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
// OAuth2 → securitySchemes.oauth2: { type: 'oauth2', flows: { authorizationCode: ... } }`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Recursive Schemas ─────────────────────────────── */}
                <div className="card">
                    <h2>Recursive / Self-Referential Schemas</h2>
                    <p>
                        Self-referential schemas — tree nodes, nested menus,
                        threaded comments — are supported via{' '}
                        <code>lazy()</code> from{' '}
                        <code>@cleverbrush/schema</code>. Call{' '}
                        <code>.schemaName()</code> on the root and{' '}
                        <code>generateOpenApiSpec</code> handles the rest: the
                        schema is expanded once under{' '}
                        <code>components/schemas</code>, and every recursive
                        reference becomes a <code>$ref</code> pointer.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, number, array, lazy } from '@cleverbrush/schema';

type TreeNode = { value: number; children: TreeNode[] };

const treeNode: ReturnType<typeof object> = object({
    value: number(),
    children: array(lazy(() => treeNode))
}).schemaName('TreeNode');

// Use treeNode as a body or response schema — no extra config needed:
// components.schemas.TreeNode → { type: 'object', properties: { children: { items: { $ref: '...' } } } }
// requestBody                 → { "$ref": "#/components/schemas/TreeNode" }`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Request Body Examples ────────────────────────── */}
                <div className="card">
                    <h2>Request Body Examples</h2>
                    <p>
                        Pre-fill the <strong>Try it out</strong> panel in
                        Swagger UI by attaching examples to endpoints:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const CreateUser = endpoint
    .post('/api/users')
    .body(UserSchema)
    .example({ name: 'Alice', email: 'alice@example.com' });

// Or provide named examples:
const CreateItem = endpoint
    .post('/api/items')
    .body(ItemSchema)
    .examples({
        minimal: { summary: 'Minimal', value: { name: 'Widget' } },
        full: { summary: 'Complete', value: { name: 'Widget', price: 9.99 } }
    });`)
                            }}
                        />
                    </pre>
                    <p>
                        Schema-level examples set via{' '}
                        <code>.example(value)</code> propagate to parameter and
                        response schemas automatically.
                    </p>
                </div>

                {/* ── File Download Responses ─────────────────────── */}
                <div className="card">
                    <h2>File Download Responses</h2>
                    <p>
                        Declare binary file responses with{' '}
                        <code>.producesFile()</code> — the generated spec emits
                        the correct binary content type instead of a JSON
                        schema:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const ExportCsv = endpoint
    .get('/api/export')
    .producesFile('text/csv', 'CSV export');

const Download = endpoint
    .get('/api/download')
    .producesFile(); // defaults to application/octet-stream`)
                            }}
                        />
                    </pre>
                    <p>
                        When both <code>.returns()</code> and{' '}
                        <code>.producesFile()</code> are set, the binary
                        response takes precedence.
                    </p>
                </div>

                {/* ── Multiple Content Types ───────────────────────── */}
                <div className="card">
                    <h2>Multiple Content Types</h2>
                    <p>
                        Use <code>.produces()</code> to declare additional
                        response content types for content-negotiated endpoints.
                        The generated spec emits a multi-entry{' '}
                        <code>content</code> map where each MIME type can
                        optionally override the response schema:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const GetItems = endpoint
    .get('/api/items')
    .returns(object({ id: number(), name: string() }))
    .produces({
        'text/csv': {},           // reuses the JSON response schema
        'application/xml': { schema: string() } // custom schema
    });`)
                            }}
                        />
                    </pre>
                    <p>
                        <code>application/json</code> is always included when a
                        response schema is declared. When{' '}
                        <code>.producesFile()</code> is also set, the binary
                        response takes precedence.
                    </p>
                </div>

                {/* ── Response Headers ─────────────────────────────── */}
                <div className="card">
                    <h2>Response Headers</h2>
                    <p>
                        Document response headers — pagination cursors,
                        rate-limit counters, cache-control directives — with{' '}
                        <code>.responseHeaders()</code>. Each property in the
                        object schema becomes a named header entry in the
                        OpenAPI spec, applied to every response code:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const GetItems = endpoint
    .get('/api/items')
    .returns(object({ id: number(), name: string() }))
    .responseHeaders(object({
        'X-Total-Count': number().describe('Total number of matching items'),
        'X-Page':        number().describe('Current page index'),
        'X-Rate-Limit':  number()
    }));`)
                            }}
                        />
                    </pre>
                    <p>
                        Property descriptions propagate to the OpenAPI{' '}
                        <code>description</code> field on each header entry,
                        making pagination and throttling contracts visible in
                        Swagger UI and generated client SDKs.
                    </p>
                </div>

                {/* ── Tags ─────────────────────────────────────────── */}
                <div className="card">
                    <h2>Top-Level Tags with Descriptions</h2>
                    <p>
                        OpenAPI supports a top-level <code>tags</code> array
                        where each entry can carry a <code>description</code>{' '}
                        and optional <code>externalDocs</code>. Pass a{' '}
                        <code>tags</code> option to describe your tag groups:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`generateOpenApiSpec({
    registrations,
    info: { title: 'My API', version: '1.0.0' },
    tags: [
        {
            name: 'users',
            description: 'User management endpoints',
            externalDocs: { url: 'https://docs.example.com/users' }
        },
        { name: 'orders', description: 'Order management endpoints' }
    ]
});`)
                            }}
                        />
                    </pre>
                    <p>
                        When <code>tags</code> is omitted, unique tag names are
                        automatically collected from all registered endpoints
                        and emitted as name-only entries — Swagger UI and Redoc
                        still group operations correctly. Any endpoint tag not
                        covered by the explicit list is appended alphabetically.
                    </p>
                </div>

                {/* ── Path Params ──────────────────────────────────── */}
                <div className="card">
                    <h2>Path Parameters</h2>
                    <p>
                        Use <code>route()</code> to define typed path
                        parameters. The generated spec converts them to OpenAPI{' '}
                        <code>{'{param}'}</code> format with per-parameter JSON
                        Schema:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { endpoint, route } from '@cleverbrush/server';
import { number } from '@cleverbrush/schema';

// route() template → { name: 'id', in: 'path', schema: { type: 'number' } }
endpoint.get(
    '/api/users',
    route({ id: number().coerce() })\`/\${t => t.id}\`
);`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── externalDocs ─────────────────────────────────── */}
                <div className="card">
                    <h2>External Documentation</h2>
                    <p>
                        Link external reference material to an operation with{' '}
                        <code>.externalDocs(url, description?)</code>. The
                        generator emits an <code>externalDocs</code> object on
                        the OpenAPI Operation Object:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const GetItems = endpoint
    .get('/api/items')
    .returns(ItemSchema)
    .externalDocs('https://docs.example.com/items', 'Items API reference');`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Links ────────────────────────────────────────── */}
                <div className="card">
                    <h2>Response Links</h2>
                    <p>
                        Declare follow-up actions available from a response
                        using <code>.links(defs)</code>. Links are emitted under
                        the primary 2xx response&apos;s <code>links</code> map.
                        Parameters can be raw runtime expression strings or a
                        type-safe callback where property accesses resolve to{' '}
                        <code>$response.body#/&lt;pointer&gt;</code> expressions
                        automatically:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const CreateUser = endpoint
    .post('/api/users')
    .body(object({ name: string(), email: string() }))
    .returns(object({ id: number(), name: string(), email: string() }))
    .links({
        GetUser: {
            operationId: 'getUser',
            // Type-safe: accesses 'id' → resolves to '$response.body#/id'
            parameters: (r) => ({ userId: r.id }),
        },
    });`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Callbacks ────────────────────────────────────── */}
                <div className="card">
                    <h2>Callbacks</h2>
                    <p>
                        Document async out-of-band requests with{' '}
                        <code>.callbacks(defs)</code>. The callback URL can be a
                        raw runtime expression string or a type-safe{' '}
                        <code>urlFrom</code> selector that resolves a request
                        body field to a{' '}
                        <code>{'{$request.body#/<pointer>}'}</code> expression:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const Subscribe = endpoint
    .post('/api/subscriptions')
    .body(object({ callbackUrl: string(), events: array(string()) }))
    .callbacks({
        onEvent: {
            urlFrom: (b) => b.callbackUrl,  // → {$request.body#/callbackUrl}
            method: 'POST',
            summary: 'Event notification delivered to subscriber',
            body: EventSchema,
        },
    });`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Webhooks ─────────────────────────────────────── */}
                <div className="card">
                    <h2>Webhooks</h2>
                    <p>
                        Document async webhook notifications your API sends to
                        consumers. Use <code>defineWebhook()</code> and register
                        via <code>ServerBuilder.webhook()</code>, then pass them
                        to <code>generateOpenApiSpec</code> via the{' '}
                        <code>webhooks</code> option. A top-level{' '}
                        <code>webhooks</code> map is emitted in the OpenAPI 3.1
                        document:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { defineWebhook } from '@cleverbrush/server';

const userCreated = defineWebhook('userCreated', {
    method: 'POST',
    summary: 'Fired when a new user registers',
    body: object({ id: number(), email: string() }),
});

// Register with the server (for documentation only):
createServer().webhook(userCreated).handle(/* ... */);

// Or pass directly to the generator:
generateOpenApiSpec({ registrations, info, webhooks: [userCreated] });`)
                            }}
                        />
                    </pre>
                </div>
            </div>
        </div>
    );
}
