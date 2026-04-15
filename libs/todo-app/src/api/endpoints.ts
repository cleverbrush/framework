import { array, number, object, string } from '@cleverbrush/schema';
import {
    createEndpoints,
    defineWebhook,
    endpoint,
    route
} from '@cleverbrush/server';
import { BoundQueryToken } from '../di/tokens.js';
import {
    CompletionRequestHeadersSchema,
    CreateTodoBodySchema,
    ErrorResponseSchema,
    ExportResponseHeadersSchema,
    ImportRequestHeadersSchema,
    ImportResultSchema,
    ImportTodosBodySchema,
    LoginBodySchema,
    PaginationQuerySchema,
    PrincipalSchema,
    RegisterBodySchema,
    TodoEventSchema,
    TodoListQuerySchema,
    TodoNotificationPayloadSchema,
    TodoResponseSchema,
    TodoWithAuthorResponseSchema,
    TokenResponseSchema,
    UpdateTodoBodySchema,
    UserResponseSchema,
    WebhookAckSchema,
    WebhookSubscriptionBodySchema,
    WebhookSubscriptionResponseSchema
} from './schemas.js';

// ── Path templates ────────────────────────────────────────────────────────────

const ById = route({ id: number().coerce() })`/${t => t.id}`;
const ByIdWithAuthor = route({
    id: number().coerce()
})`/${t => t.id}/with-author`;

// ── Auth endpoints ────────────────────────────────────────────────────────────
// Using full paths (not resource()) because register and login are
// different static sub-paths, not parameterized routes.

export const RegisterEndpoint = endpoint
    .post('/api/auth/register')
    .body(RegisterBodySchema)
    .inject({ db: BoundQueryToken })
    .responses({ 201: UserResponseSchema, 400: ErrorResponseSchema })
    .summary('Register a new user')
    .description('Creates a new user account with the "user" role.')
    .tags('auth')
    .operationId('register');

export const LoginEndpoint = endpoint
    .post('/api/auth/login')
    .body(LoginBodySchema)
    .inject({ db: BoundQueryToken })
    .responses({ 200: TokenResponseSchema, 401: ErrorResponseSchema })
    .summary('Login')
    .description('Authenticates a user and returns a signed JWT.')
    .tags('auth')
    .operationId('login');

// ── Todo endpoints ────────────────────────────────────────────────────────────

const todosApi = endpoint.resource('/api/todos');

export const ListTodosEndpoint = todosApi
    .get()
    .query(TodoListQuerySchema)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .responses({ 200: array(TodoResponseSchema) })
    .summary('List todos')
    .description(
        'Returns a paginated list of todos. Users see only their own todos; admins can see all todos or filter by userId.'
    )
    .tags('todos')
    .operationId('listTodos');

export const GetTodoEndpoint = todosApi
    .get(ById)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .responses({
        200: TodoResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema
    })
    .summary('Get a todo by ID')
    .description(
        'Returns a todo by its ID. Users can only fetch their own todos.'
    )
    .tags('todos')
    .operationId('getTodo');

export const GetTodoWithAuthorEndpoint = todosApi
    .get(ByIdWithAuthor)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .responses({
        200: TodoWithAuthorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema
    })
    .summary('Get a todo with its author')
    .description(
        'Returns a todo together with its author. Demonstrates nested $ref deduplication in the OpenAPI spec.'
    )
    .tags('todos')
    .operationId('getTodoWithAuthor');

export const CreateTodoEndpoint = todosApi
    .post()
    .body(CreateTodoBodySchema)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .responses({ 201: TodoResponseSchema })
    .summary('Create a todo')
    .description('Creates a new todo owned by the authenticated user.')
    .tags('todos')
    .operationId('createTodo');

export const UpdateTodoEndpoint = todosApi
    .patch(ById)
    .body(UpdateTodoBodySchema)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .responses({
        200: TodoResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema
    })
    .summary('Update a todo')
    .description(
        'Partially updates a todo. Users can only update their own todos; admins can update any todo.'
    )
    .tags('todos')
    .operationId('updateTodo');

export const DeleteTodoEndpoint = todosApi
    .delete(ById)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .responses({
        204: null,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema
    })
    .summary('Delete a todo')
    .description(
        'Deletes a todo. Users can only delete their own todos; admins can delete any todo.'
    )
    .tags('todos')
    .operationId('deleteTodo');

const ByIdEvents = route({ id: number().coerce() })`/${t => t.id}/events`;

export const SendTodoEventEndpoint = todosApi
    .post(ByIdEvents)
    .body(TodoEventSchema)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .responses({
        200: TodoEventSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema
    })
    .summary('Send a todo event')
    .description(
        'Accepts a discriminated-union event for a todo (assigned / commented / completed). ' +
            'Demonstrates the OpenAPI `discriminator` keyword emitted by @cleverbrush/schema-json.'
    )
    .tags('todos')
    .operationId('sendTodoEvent');

// ── User management endpoints (admin only) ────────────────────────────────────

const usersApi = endpoint.resource('/api/users');

export const ListUsersEndpoint = usersApi
    .get()
    .query(PaginationQuerySchema)
    .authorize(PrincipalSchema, 'admin')
    .inject({ db: BoundQueryToken })
    .responses({ 200: array(UserResponseSchema) })
    .summary('List all users')
    .description(
        'Returns a paginated list of all registered users. Admin only.'
    )
    .tags('users')
    .operationId('listUsers');

export const DeleteUserEndpoint = usersApi
    .delete(ById)
    .authorize(PrincipalSchema, 'admin')
    .inject({ db: BoundQueryToken })
    .responses({
        204: null,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema
    })
    .summary('Delete a user')
    .description(
        'Permanently deletes a user account and all their todos. Admin only.'
    )
    .tags('users')
    .operationId('deleteUser');

// ── Additional route templates ────────────────────────────────────────────────

const ByIdAttachment = route({
    id: number().coerce()
})`/${t => t.id}/attachment`;

const ByIdComplete = route({
    id: number().coerce()
})`/${t => t.id}/complete`;

// ── Export todos as CSV ───────────────────────────────────────────────────────
// Features: .produces(), .responseHeaders(), .externalDocs(), per-endpoint middleware

export const ExportTodosEndpoint = todosApi
    .get(route({})`/export`)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .returns(string())
    .produces({ 'text/csv': {} })
    .responseHeaders(ExportResponseHeadersSchema)
    .externalDocs(
        'https://tools.ietf.org/html/rfc4180',
        'CSV format specification (RFC 4180)'
    )
    .summary('Export todos as CSV')
    .description(
        'Exports all visible todos as a CSV file. Users export only their own; admins export all. ' +
            'Demonstrates `.produces()`, `.responseHeaders()`, `.externalDocs()`, and per-endpoint middleware.'
    )
    .tags('todos')
    .operationId('exportTodos');

// ── Download todo attachment ──────────────────────────────────────────────────
// Features: .producesFile(), ActionResult.file()

export const DownloadAttachmentEndpoint = todosApi
    .get(ByIdAttachment)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .producesFile('text/plain', 'A plain-text summary of the todo.')
    .summary('Download todo attachment')
    .description(
        'Downloads a plain-text summary of the todo as a file attachment. ' +
            'Demonstrates `.producesFile()` and `ActionResult.file()`.'
    )
    .tags('todos')
    .operationId('downloadTodoAttachment');

// ── Import todos ──────────────────────────────────────────────────────────────
// Features: .example(), .examples(), .headers(), ActionResult.json(), ActionResult.accepted()

export const ImportTodosEndpoint = todosApi
    .post(route({})`/import`)
    .body(ImportTodosBodySchema)
    .headers(ImportRequestHeadersSchema)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .responses({
        207: ImportResultSchema,
        202: object({
            message: string().describe('Status message for queued imports.'),
            total: number().describe('Total number of items queued.')
        }).schemaName('ImportAccepted')
    })
    .example({ items: [{ title: 'Buy groceries' }] } as any)
    .examples({
        minimal: {
            summary: 'Minimal import',
            description: 'Import a single todo with only a title.',
            value: { items: [{ title: 'Task 1' }] } as any
        },
        full: {
            summary: 'Full import with descriptions',
            description: 'Import multiple todos with optional descriptions.',
            value: {
                items: [
                    { title: 'Task 1', description: 'First task details' },
                    { title: 'Task 2', description: 'Second task details' }
                ]
            } as any
        }
    })
    .summary('Bulk import todos')
    .description(
        'Imports multiple todos at once. Returns 207 Multi-Status with per-item results. ' +
            'Returns 202 Accepted if the batch exceeds 100 items (queued). ' +
            'Demonstrates `.example()`, `.examples()`, `.headers()`, `ActionResult.json()`, and `ActionResult.accepted()`.'
    )
    .tags('todos')
    .operationId('importTodos');

// ── Deprecated full replace ───────────────────────────────────────────────────
// Features: .deprecated(), ActionResult.redirect()

export const LegacyReplaceTodoEndpoint = todosApi
    .put(ById)
    .body(UpdateTodoBodySchema)
    .authorize(PrincipalSchema)
    .deprecated()
    .responses({ 200: TodoResponseSchema })
    .summary('Replace a todo (deprecated)')
    .description(
        '**Deprecated** — use `PATCH /api/todos/{id}` instead for partial updates. ' +
            'This endpoint redirects to the PATCH endpoint. ' +
            'Demonstrates `.deprecated()` and `ActionResult.redirect()`.'
    )
    .tags('todos')
    .operationId('replaceTodo');

// ── Complete todo with conflict detection ─────────────────────────────────────
// Features: .headers() (If-Match), ActionResult.conflict(), ActionResult.status()

export const CompleteTodoEndpoint = todosApi
    .post(ByIdComplete)
    .headers(CompletionRequestHeadersSchema)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .responses({
        200: TodoResponseSchema,
        409: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema
    })
    .summary('Complete a todo with conflict detection')
    .description(
        'Marks a todo as completed. Supports optimistic concurrency via the `If-Match` header — ' +
            'if the ETag does not match the current `updatedAt` timestamp, returns 409 Conflict. ' +
            'Demonstrates `.headers()`, `ActionResult.conflict()`, and `ActionResult.status()`.'
    )
    .tags('todos')
    .operationId('completeTodo');

// ── Get current user ──────────────────────────────────────────────────────────
// Features: .returns(), .links()

export const GetMyProfileEndpoint = usersApi
    .get(route({})`/me`)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .returns(UserResponseSchema)
    .links({
        GetMyTodos: {
            operationId: 'listTodos',
            description: 'Fetch todos owned by this user.'
        }
    })
    .summary('Get current user profile')
    .description(
        'Returns the profile of the currently authenticated user. ' +
            'Demonstrates `.returns()` (simpler than `.responses()`) and `.links()`.'
    )
    .tags('users')
    .operationId('getMyProfile');

// ── Webhook subscription ─────────────────────────────────────────────────────
// Features: .callbacks()

export const SubscribeWebhookEndpoint = endpoint
    .post('/api/webhooks/subscribe')
    .body(WebhookSubscriptionBodySchema)
    .authorize(PrincipalSchema)
    .responses({
        201: WebhookSubscriptionResponseSchema,
        400: ErrorResponseSchema
    })
    .callbacks({
        onEvent: {
            urlFrom: b => b.callbackUrl,
            method: 'POST',
            summary: 'Todo event notification',
            description:
                'Sent to the subscriber URL whenever a subscribed event occurs.',
            body: TodoNotificationPayloadSchema,
            response: WebhookAckSchema
        }
    })
    .summary('Subscribe to webhook notifications')
    .description(
        'Registers a callback URL to receive notifications for todo events. ' +
            'This is a demonstration endpoint — no actual webhook delivery occurs. ' +
            'Demonstrates `.callbacks()` for OpenAPI callback documentation.'
    )
    .tags('webhooks')
    .operationId('subscribeWebhook');

// ── Admin activity log ────────────────────────────────────────────────────────
// Features: createEndpoints() with role constraints, ActionResult.stream(), per-endpoint middleware

const Roles = { admin: 'admin', user: 'user' } as const;
const adminApi = createEndpoints(Roles);

export const AdminActivityEndpoint = adminApi
    .get('/api/admin/activity')
    .authorize(PrincipalSchema, 'admin')
    .returns(string())
    .summary('Admin activity log stream')
    .description(
        'Streams recent activity entries as newline-delimited JSON (NDJSON). Admin only. ' +
            'Demonstrates `createEndpoints()` with compile-time role constraints, ' +
            '`ActionResult.stream()`, and per-endpoint middleware.'
    )
    .tags('admin')
    .operationId('adminActivityLog');

// ── Webhook definitions (OpenAPI-only, not served as routes) ──────────────────
// Features: defineWebhook(), server.webhook()

export const todoCreatedWebhook = defineWebhook('todoCreated', {
    method: 'POST',
    summary: 'Fired when a new todo is created',
    description:
        'Sent to all subscribers registered for the `todo.created` event. ' +
        'Carries the full todo payload.',
    tags: ['webhooks'],
    body: TodoNotificationPayloadSchema,
    response: WebhookAckSchema
});

export const todoCompletedWebhook = defineWebhook('todoCompleted', {
    method: 'POST',
    summary: 'Fired when a todo is marked as completed',
    description:
        'Sent to all subscribers registered for the `todo.completed` event. ' +
        'Carries the full todo payload.',
    tags: ['webhooks'],
    body: TodoNotificationPayloadSchema,
    response: WebhookAckSchema
});
