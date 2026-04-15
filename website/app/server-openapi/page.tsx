/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@/app/InstallBanner';
import { highlightTS } from '@/lib/highlight';

export default function ServerOpenApiPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/server-openapi</h1>
                    <p className="subtitle">
                        OpenAPI 3.1 spec generation for{' '}
                        <code>@cleverbrush/server</code> — no annotations, no
                        decorators, derived directly from endpoint definitions.
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
                        <code>@cleverbrush/server-openapi</code> generates the
                        spec directly from the same endpoint definitions your
                        server uses for routing and validation. There is no
                        separate spec to maintain — the server <em>is</em> the
                        spec.
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
                            <strong>Security mapping</strong> — JWT and cookie
                            auth schemes become <code>securitySchemes</code>{' '}
                            automatically.
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
                                __html: highlightTS(`import { ServerBuilder, endpoint } from '@cleverbrush/server';
import { serveOpenApi } from '@cleverbrush/server-openapi';
import { object, string, number } from '@cleverbrush/schema';

const GetUser = endpoint
    .get('/api/users/:id')
    .summary('Get a user by ID')
    .tags('users');

const server = new ServerBuilder();

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
import { endpoint } from '@cleverbrush/server';
import { generateOpenApiSpec } from '@cleverbrush/server-openapi';

// Export as a constant — reuse the same reference everywhere
export const UserSchema = object({
    id:   number(),
    name: string().nonempty(),
}).schemaName('User');

const GetUser   = endpoint.get('/api/users/:id').returns(UserSchema);
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
                                __html: highlightTS(`import { jwtScheme } from '@cleverbrush/auth';

const authConfig = {
    defaultScheme: 'jwt',
    schemes: [jwtScheme({ secret: '...', mapClaims: c => c })]
};

server.use(serveOpenApi({
    getRegistrations: () => server.getRegistrations(),
    info: { title: 'My API', version: '1.0.0' },
    authConfig
}));

// JWT endpoints get: securitySchemes.jwt → { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
// Authorized endpoints get:  security: [{ jwt: [] }]`)
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
                        Both colon-style paths and{' '}
                        <code>ParseStringSchemaBuilder</code> templates are
                        converted to OpenAPI <code>{'{param}'}</code> format
                        with per-parameter JSON Schema:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// Colon style → { name: 'id', in: 'path', schema: { type: 'string' } }
endpoint.get('/api/users/:id');

// ParseStringSchemaBuilder → { name: 'id', in: 'path', schema: { type: 'number' } }
import { route } from '@cleverbrush/server';
import { object, number } from '@cleverbrush/schema';

endpoint.get(route(
    object({ id: number().coerce() }),
    $t => $t\`/api/users/\${t => t.id}\`
));`)
                            }}
                        />
                    </pre>
                </div>
            </div>
        </div>
    );
}
