import {
    defineWebhook
} from '@cleverbrush/server';
import { BoundQueryToken } from '../di/tokens.js';
import {
    PrincipalSchema,
    TodoNotificationPayloadSchema,
    WebhookAckSchema
} from './schemas.js';
import { api } from './contract.js';

// ── Auth endpoints ────────────────────────────────────────────────────────────

export const RegisterEndpoint = api.auth.register
    .inject({ db: BoundQueryToken })
    .summary('Register a new user')
    .description('Creates a new user account with the "user" role.')
    .tags('auth')
    .operationId('register');

export const LoginEndpoint = api.auth.login
    .inject({ db: BoundQueryToken })
    .summary('Login')
    .description('Authenticates a user and returns a signed JWT.')
    .tags('auth')
    .operationId('login');

export const GoogleLoginEndpoint = api.auth.googleLogin
    .inject({ db: BoundQueryToken })
    .summary('Login with Google')
    .description('Exchanges a Google ID token for an application JWT. Auto-provisions the user on first login.')
    .tags('auth')
    .operationId('googleLogin');

// ── Todo endpoints ────────────────────────────────────────────────────────────

export const ListTodosEndpoint = api.todos.list
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .summary('List todos')
    .description(
        'Returns a paginated list of todos. Users see only their own todos; admins can see all todos or filter by userId.'
    )
    .tags('todos')
    .operationId('listTodos');

export const GetTodoEndpoint = api.todos.get
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .summary('Get a todo by ID')
    .description(
        'Returns a todo by its ID. Users can only fetch their own todos.'
    )
    .tags('todos')
    .operationId('getTodo');

export const GetTodoWithAuthorEndpoint = api.todos.getWithAuthor
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .summary('Get a todo with its author')
    .description(
        'Returns a todo together with its author. Demonstrates nested $ref deduplication in the OpenAPI spec.'
    )
    .tags('todos')
    .operationId('getTodoWithAuthor');

export const CreateTodoEndpoint = api.todos.create
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .summary('Create a todo')
    .description('Creates a new todo owned by the authenticated user.')
    .tags('todos')
    .operationId('createTodo');

export const UpdateTodoEndpoint = api.todos.update
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .summary('Update a todo')
    .description(
        'Partially updates a todo. Users can only update their own todos; admins can update any todo.'
    )
    .tags('todos')
    .operationId('updateTodo');

export const DeleteTodoEndpoint = api.todos.delete
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .summary('Delete a todo')
    .description(
        'Deletes a todo. Users can only delete their own todos; admins can delete any todo.'
    )
    .tags('todos')
    .operationId('deleteTodo');

export const SendTodoEventEndpoint = api.todos.sendEvent
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .summary('Send a todo event')
    .description(
        'Accepts a discriminated-union event for a todo (assigned / commented / completed). ' +
            'Demonstrates the OpenAPI `discriminator` keyword emitted by @cleverbrush/schema-json.'
    )
    .tags('todos')
    .operationId('sendTodoEvent');

// ── User management endpoints (admin only) ────────────────────────────────────

export const ListUsersEndpoint = api.users.list
    .authorize(PrincipalSchema, 'admin')
    .inject({ db: BoundQueryToken })
    .summary('List all users')
    .description(
        'Returns a paginated list of all registered users. Admin only.'
    )
    .tags('users')
    .operationId('listUsers');

export const DeleteUserEndpoint = api.users.delete
    .authorize(PrincipalSchema, 'admin')
    .inject({ db: BoundQueryToken })
    .summary('Delete a user')
    .description(
        'Permanently deletes a user account and all their todos. Admin only.'
    )
    .tags('users')
    .operationId('deleteUser');

// ── Export todos as CSV ───────────────────────────────────────────────────────
// Features: .produces(), .responseHeaders(), .externalDocs(), per-endpoint middleware

export const ExportTodosEndpoint = api.todos.exportCsv
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .produces({ 'text/csv': {} })
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

export const DownloadAttachmentEndpoint = api.todos.downloadAttachment
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

export const ImportTodosEndpoint = api.todos.importBulk
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
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

export const LegacyReplaceTodoEndpoint = api.todos.legacyReplace
    .authorize(PrincipalSchema)
    .deprecated()
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

export const CompleteTodoEndpoint = api.todos.complete
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
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

export const GetMyProfileEndpoint = api.users.me
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
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

export const SubscribeWebhookEndpoint = api.webhooks.subscribe
    .authorize(PrincipalSchema)
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
// Features: ActionResult.stream(), per-endpoint middleware

export const AdminActivityEndpoint = api.admin.activityLog
    .authorize(PrincipalSchema, 'admin')
    .summary('Admin activity log stream')
    .description(
        'Streams recent activity entries as newline-delimited JSON (NDJSON). Admin only. ' +
            'Demonstrates `ActionResult.stream()` and per-endpoint middleware.'
    )
    .tags('admin')
    .operationId('adminActivityLog');

// ── Demo endpoints (resilience testing) ───────────────────────────────────────

export const DemoSlowEndpoint = api.demo.slow
    .summary('Slow response')
    .description('Responds after a configurable delay for timeout testing.')
    .tags('demo')
    .operationId('demoSlow');

export const DemoFlakyEndpoint = api.demo.flaky
    .summary('Flaky response')
    .description(
        'Fails with 500 a configurable number of times before succeeding, for retry testing.'
    )
    .tags('demo')
    .operationId('demoFlaky');

export const DemoEchoEndpoint = api.demo.echo
    .summary('Echo')
    .description('Echoes back the request body.')
    .tags('demo')
    .operationId('demoEcho');

// ── Live subscription endpoints ───────────────────────────────────────────────

export const TodoUpdatesSubscription = api.live.todoUpdates;
export const ChatSubscription = api.live.chat;

// ── Grouped endpoints — used with mapHandlers() for compile-time safety ───────

export const endpoints = {
    auth: {
        register: RegisterEndpoint,
        login: LoginEndpoint,
        googleLogin: GoogleLoginEndpoint
    },
    todos: {
        list: ListTodosEndpoint,
        get: GetTodoEndpoint,
        getWithAuthor: GetTodoWithAuthorEndpoint,
        create: CreateTodoEndpoint,
        update: UpdateTodoEndpoint,
        delete: DeleteTodoEndpoint,
        sendEvent: SendTodoEventEndpoint,
        exportCsv: ExportTodosEndpoint,
        downloadAttachment: DownloadAttachmentEndpoint,
        importBulk: ImportTodosEndpoint,
        legacyReplace: LegacyReplaceTodoEndpoint,
        complete: CompleteTodoEndpoint
    },
    users: {
        list: ListUsersEndpoint,
        delete: DeleteUserEndpoint,
        me: GetMyProfileEndpoint
    },
    webhooks: {
        subscribe: SubscribeWebhookEndpoint
    },
    admin: {
        activityLog: AdminActivityEndpoint
    },
    demo: {
        slow: DemoSlowEndpoint,
        flaky: DemoFlakyEndpoint,
        echo: DemoEchoEndpoint
    },
    live: {
        todoUpdates: TodoUpdatesSubscription,
        chat: ChatSubscription
    }
};

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