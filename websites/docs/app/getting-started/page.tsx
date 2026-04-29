/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: needed for code examples */

import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import Link from 'next/link';

export const metadata = {
    title: 'Getting Started — Cleverbrush Framework',
    description:
        'Build a fully typed REST API with server, client, auth, and OpenAPI in 10 minutes.'
};

export default function GettingStartedPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Getting Started</h1>
                    <p className="subtitle">
                        Build a fully typed API with server, client, and OpenAPI
                        docs — from a single schema definition.
                    </p>
                </div>

                {/* ── Step 0: Install ─────────────────────────────── */}
                <InstallBanner
                    commands={[
                        {
                            command:
                                'npm install @cleverbrush/server @cleverbrush/schema',
                            label: 'Server + Schema'
                        },
                        {
                            command: 'npm install @cleverbrush/client',
                            label: 'Client'
                        }
                    ]}
                    note={
                        <>
                            These two packages are the minimum for a typed
                            server + client setup. Add{' '}
                            <code>@cleverbrush/auth</code>,{' '}
                            <code>@cleverbrush/di</code>, and{' '}
                            <code>@cleverbrush/server-openapi</code> when
                            you&apos;re ready.
                        </>
                    }
                />

                {/* ── Step 1: Define schemas ──────────────────────── */}
                <div className="card">
                    <h2>Step 1 — Define your schemas</h2>
                    <p>
                        Schemas are the single source of truth. Define your data
                        shapes once — TypeScript types are inferred
                        automatically, and the same schemas power validation,
                        endpoint typing, and OpenAPI generation.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number, array, boolean } from '@cleverbrush/schema';

const Todo = object({
  id:        number(),
  title:     string().minLength(1).maxLength(200),
  completed: boolean()
});

const CreateTodoBody = object({
  title: string().minLength(1).maxLength(200)
});

// TypeScript types flow from the schema — never duplicated
// type Todo = { id: number; title: string; completed: boolean }
// type CreateTodoBody = { title: string }`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Step 2: API contract ────────────────────────── */}
                <div className="card">
                    <h2>Step 2 — Create the API contract</h2>
                    <p>
                        The contract defines your endpoints in a shared module.
                        Both server and client import it — ensuring they always
                        agree on the API shape.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { defineApi, endpoint, route } from '@cleverbrush/server/contract';

// Reusable typed path parameter: /api/todos/:id (id coerced to number)
const idRoute = route({ id: number().coerce() })\`/\${t => t.id}\`;

// Scoped factory — all methods share the /api/todos base path
const todos = endpoint.resource('/api/todos');

export const api = defineApi({
  todos: {
    // GET /api/todos
    list:   todos.get().returns(array(Todo)),
    // POST /api/todos
    create: todos.post().body(CreateTodoBody).returns(Todo),
    // GET /api/todos/:id
    get:    todos.get(idRoute).returns(Todo),
    // PATCH /api/todos/:id
    toggle: todos.patch(idRoute).returns(Todo),
    // DELETE /api/todos/:id
    delete: todos.delete(idRoute)
  }
});`)
                            }}
                        />
                    </pre>
                    <p>
                        <code>endpoint.resource()</code> scopes all methods to
                        the same base path, eliminating repetition. The{' '}
                        <code>route()</code> tagged template provides type-safe
                        path parameters — <code>params.id</code> is typed as{' '}
                        <code>number</code> and coerced automatically.
                    </p>
                </div>

                {/* ── Step 3: Server ──────────────────────────────── */}
                <div className="card">
                    <h2>Step 3 — Implement the server</h2>
                    <p>
                        <code>mapHandlers()</code> maps every endpoint to a
                        handler. If you forget one, TypeScript produces a
                        compile error — you can&apos;t ship an incomplete API.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { createServer, mapHandlers, ActionResult } from '@cleverbrush/server';
// Shared contract — same file imported by both server and client
import { api } from './contract';

const server = createServer();

// In-memory store for this example
let todos = [{ id: 1, title: 'Try Cleverbrush', completed: false }];
let nextId = 2;

mapHandlers(server, api, {
  todos: {
    list:   async () => todos,
    create: async ({ body }) => {
      const todo = { id: nextId++, title: body.title, completed: false };
      todos.push(todo);
      return todo;
    },
    get: async ({ params }) => {
      const todo = todos.find(t => t.id === params.id);
      if (!todo) return ActionResult.notFound();
      return todo;
    },
    toggle: async ({ params }) => {
      const todo = todos.find(t => t.id === params.id);
      if (!todo) return ActionResult.notFound();
      todo.completed = !todo.completed;
      return todo;
    },
    delete: async ({ params }) => {
      todos = todos.filter(t => t.id !== params.id);
    }
  }
});

await server.listen(3000);
console.log('Server running on http://localhost:3000');`)
                            }}
                        />
                    </pre>
                    <p>
                        Request bodies are validated automatically against the
                        schema. Invalid requests are rejected with structured{' '}
                        <a
                            href="https://www.rfc-editor.org/rfc/rfc9457"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            RFC 9457 Problem Details
                        </a>{' '}
                        responses — no manual validation code needed.
                    </p>
                </div>

                {/* ── Step 4: Client ──────────────────────────────── */}
                <div className="card">
                    <h2>Step 4 — Create the typed client</h2>
                    <p>
                        The client reads the contract and gives you a fully
                        typed API — no codegen, no manual type annotations.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { createClient } from '@cleverbrush/client';
// Shared contract — same file imported by both server and client
import { api } from './contract';

const client = createClient(api, {
  baseUrl: 'http://localhost:3000'
});

// Every call is fully typed — wrong shapes are compile errors
const todos = await client.todos.list();
//    ^ { id: number; title: string; completed: boolean }[]

const newTodo = await client.todos.create({
  body: { title: 'Learn Cleverbrush' }
});

const todo = await client.todos.get({ params: { id: 1 } });

await client.todos.toggle({ params: { id: 1 } });

await client.todos.delete({ params: { id: 1 } });`)
                            }}
                        />
                    </pre>

                    <h3 style={{ marginTop: '1.5rem' }}>With React Query</h3>
                    <p>
                        Use <code>@cleverbrush/client/react</code> to get
                        TanStack Query hooks co-located on the same client
                        object — no separate query-key management.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { createClient } from '@cleverbrush/client/react';
// Shared contract — same file imported by both server and client
import { api } from './contract';

export const client = createClient(api, { baseUrl: 'http://localhost:3000' });

function TodoList() {
  // useQuery — reactive fetch, auto-refetch on focus / reconnect
  const { data: todos } = client.todos.list.useQuery();

  // useMutation — typed body, invalidate the whole group on success
  const create = client.todos.create.useMutation({
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: client.todos.queryKey()
    })
  });

  return (
    <>
      {todos?.map(t => <li key={t.id}>{t.title}</li>)}
      <button onClick={() => create.mutate({ body: { title: 'New todo' } })}>
        Add
      </button>
    </>
  );
}`)
                            }}
                        />
                    </pre>

                    <h3 style={{ marginTop: '1.5rem' }}>With WebSockets</h3>
                    <p>
                        Define a subscription in your contract, then consume it
                        with the <code>useSubscription</code> hook — connection
                        lifecycle is managed automatically.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// contract.ts — add a subscription alongside regular endpoints
import { endpoint } from '@cleverbrush/server/contract';

const TodoEvent = object({ type: string(), todo: Todo });

export const api = defineApi({
  todos: { /* ...existing endpoints... */ },
  live: {
    // WS /ws/todos — server pushes TodoEvent, client can send void
    events: endpoint
      .subscription('/ws/todos')
      .outgoing(TodoEvent)
  }
});

// ── React component ──────────────────────────────────────────────
import { useSubscription } from '@cleverbrush/client/react';
// Shared contract — same file imported by both server and client
import { client } from './client';

function LiveTodos() {
  const { events, state } = useSubscription(
    () => client.live.events(),
    { maxEvents: 50 }
  );

  return (
    <>
      <p>Status: {state}</p>
      {events.map((e, i) => (
        <li key={i}>{e.type}: {e.todo.title}</li>
      ))}
    </>
  );
}`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Step 5: Add resilience ──────────────────────── */}
                <div className="card">
                    <h2>Step 5 — Add client resilience</h2>
                    <p>
                        The client has built-in retry, timeout, deduplication,
                        and caching — configurable globally or per call.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { createClient, withRetry, withTimeout, withDeduplication } from '@cleverbrush/client';
// Shared contract — same file imported by both server and client
import { api } from './contract';

const client = createClient(api, {
  baseUrl: 'http://localhost:3000',
  middleware: [
    withRetry({ limit: 3, delay: 1000, backoffLimit: 10000, jitter: true }),
    withTimeout(5000),
    withDeduplication()
  ]
});

// Per-call override
const todo = await client.todos.get(
  { params: { id: 1 } },
  { retry: { limit: 5 }, timeout: 10000 }
);`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Step 6: OpenAPI ─────────────────────────────── */}
                <div className="card">
                    <h2>Step 6 — Generate OpenAPI docs</h2>
                    <p>
                        Add one middleware and get a full OpenAPI 3.1 spec with
                        Swagger UI — always accurate, always in sync with your
                        types.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { openapi } from '@cleverbrush/server-openapi';

server.use(openapi({
  info: { title: 'Todo API', version: '1.0.0' },
  swaggerUi: '/docs'       // Swagger UI at http://localhost:3000/docs
  // OpenAPI JSON at       // http://localhost:3000/openapi.json
}));`)
                            }}
                        />
                    </pre>
                    <p>
                        The spec includes typed request/response schemas, path
                        parameters, error responses, and security schemes. See
                        the <Link href="/server-openapi">OpenAPI docs</Link> for
                        advanced features like response links, callbacks, and
                        webhooks.
                    </p>
                </div>

                {/* ── Next Steps ──────────────────────────────────── */}
                <div className="card">
                    <h2>Next steps</h2>
                    <p>
                        You now have a fully typed API with server, client, and
                        OpenAPI docs. Here&apos;s where to go next:
                    </p>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Topic</th>
                                    <th>What you&apos;ll learn</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <Link href="/server">Server</Link>
                                    </td>
                                    <td>
                                        Endpoint builder API, action results,
                                        middleware, WebSockets, batching
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Link href="/client">Client</Link>
                                    </td>
                                    <td>
                                        Middleware chain, retry, timeout, dedup,
                                        cache, batching, error handling
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Link href="/auth">Auth</Link>
                                    </td>
                                    <td>
                                        JWT, cookies, OAuth2, OIDC, role-based
                                        policies, server integration
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Link href="/di">
                                            Dependency Injection
                                        </Link>
                                    </td>
                                    <td>
                                        Schemas as service keys, lifetimes,
                                        function injection, disposal
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Link href="/client/react-integration">
                                            React Integration
                                        </Link>
                                    </td>
                                    <td>
                                        TanStack Query hooks, typed queryKeys,
                                        mutations, Suspense, prefetching
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Link href="/react-form">
                                            React Form
                                        </Link>
                                    </td>
                                    <td>
                                        Schema-driven forms with headless
                                        rendering and type-safe field selectors
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Link href="/server-openapi">
                                            OpenAPI
                                        </Link>
                                    </td>
                                    <td>
                                        Links, callbacks, webhooks, security
                                        schemes, response headers
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a
                                            href="https://schema.cleverbrush.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Schema Library
                                        </a>
                                    </td>
                                    <td>
                                        The foundation — all builders,
                                        extensions, generics, playground
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Link href="/examples">
                                            Example App
                                        </Link>
                                    </td>
                                    <td>
                                        Full-stack Todo app with auth, DI,
                                        OpenAPI, React frontend
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
