/**
 * Typed API contract for the Todo application.
 *
 * This is the **single source of truth** for both the backend and the
 * frontend.  It defines the shape of every API endpoint (HTTP method,
 * path, body / query / header schemas, and response schemas) without any
 * server-specific concerns like authorization, dependency injection, or
 * OpenAPI metadata.
 *
 * - The **backend** imports this contract and extends each endpoint with
 *   `.authorize()`, `.inject()`, and OpenAPI metadata.
 * - The **frontend** passes it to `createClient()` from `@cleverbrush/web`
 *   to obtain a fully typed HTTP client with zero code generation.
 *
 * @module
 */

import { array, number, object, string } from '@cleverbrush/schema';
import { defineApi, endpoint, route } from '@cleverbrush/server/contract';
import {
    TodoActivityResponseSchema,
    CompletionRequestHeadersSchema,
    CreateTodoBodySchema,
    ErrorResponseSchema,
    ExportResponseHeadersSchema,
    GoogleAuthBodySchema,
    ImportRequestHeadersSchema,
    ImportResultSchema,
    ImportTodosBodySchema,
    LoginBodySchema,
    PaginationQuerySchema,
    RegisterBodySchema,
    TodoEventSchema,
    TodoListQuerySchema,
    TodoResponseSchema,
    TodoWithAuthorResponseSchema,
    TokenResponseSchema,
    UpdateTodoBodySchema,
    UserResponseSchema,
    WebhookSubscriptionBodySchema,
    WebhookSubscriptionResponseSchema
} from './schemas.js';

// ── Shared route templates ────────────────────────────────────────────────────

const ById = route({ id: number().coerce() })`/${t => t.id}`;

// ── Resource factories ────────────────────────────────────────────────────────

const todosResource = endpoint.resource('/api/todos');
const usersResource = endpoint.resource('/api/users');
const activityResource = endpoint.resource('/api/activity');

// ── Contract ──────────────────────────────────────────────────────────────────

export const api = defineApi({
    auth: {
        register: endpoint
            .post('/api/auth/register')
            .body(RegisterBodySchema)
            .responses({ 201: UserResponseSchema, 400: ErrorResponseSchema }),

        login: endpoint
            .post('/api/auth/login')
            .body(LoginBodySchema)
            .responses({
                200: TokenResponseSchema,
                401: ErrorResponseSchema
            }),

        googleLogin: endpoint
            .post('/api/auth/google')
            .body(GoogleAuthBodySchema)
            .responses({
                200: TokenResponseSchema,
                400: ErrorResponseSchema,
                401: ErrorResponseSchema
            })
    },

    todos: {
        list: todosResource
            .get()
            .query(TodoListQuerySchema)
            .responses({ 200: array(TodoResponseSchema) }),

        get: todosResource.get(ById).responses({
            200: TodoResponseSchema,
            403: ErrorResponseSchema,
            404: ErrorResponseSchema
        }),

        getWithAuthor: todosResource
            .get(
                route({
                    id: number().coerce()
                })`/${t => t.id}/with-author`
            )
            .responses({
                200: TodoWithAuthorResponseSchema,
                403: ErrorResponseSchema,
                404: ErrorResponseSchema
            }),

        create: todosResource
            .post()
            .body(CreateTodoBodySchema)
            .responses({ 201: TodoResponseSchema }),

        update: todosResource.patch(ById).body(UpdateTodoBodySchema).responses({
            200: TodoResponseSchema,
            403: ErrorResponseSchema,
            404: ErrorResponseSchema
        }),

        delete: todosResource.delete(ById).responses({
            204: null,
            403: ErrorResponseSchema,
            404: ErrorResponseSchema
        }),

        sendEvent: todosResource
            .post(route({ id: number().coerce() })`/${t => t.id}/events`)
            .body(TodoEventSchema)
            .responses({
                200: TodoActivityResponseSchema,
                403: ErrorResponseSchema,
                404: ErrorResponseSchema
            }),

        exportCsv: todosResource
            .get(route({})`/export`)
            .returns(string())
            .responseHeaders(ExportResponseHeadersSchema),

        importBulk: todosResource
            .post(route({})`/import`)
            .body(ImportTodosBodySchema)
            .headers(ImportRequestHeadersSchema)
            .responses({
                207: ImportResultSchema,
                202: object({
                    message: string(),
                    total: number()
                })
            }),

        legacyReplace: todosResource
            .put(ById)
            .body(UpdateTodoBodySchema)
            .responses({ 200: TodoResponseSchema }),

        complete: todosResource
            .post(route({ id: number().coerce() })`/${t => t.id}/complete`)
            .headers(CompletionRequestHeadersSchema)
            .responses({
                200: TodoResponseSchema,
                409: ErrorResponseSchema,
                403: ErrorResponseSchema,
                404: ErrorResponseSchema
            }),

        downloadAttachment: todosResource.get(
            route({ id: number().coerce() })`/${t => t.id}/attachment`
        ),

        listActivity: todosResource
            .get(
                route({ id: number().coerce() })`/${t => t.id}/activity`
            )
            .responses({
                200: array(TodoActivityResponseSchema),
                403: ErrorResponseSchema,
                404: ErrorResponseSchema
            })
    },

    users: {
        list: usersResource
            .get()
            .query(PaginationQuerySchema)
            .responses({ 200: array(UserResponseSchema) }),

        delete: usersResource.delete(ById).responses({
            204: null,
            400: ErrorResponseSchema,
            404: ErrorResponseSchema
        }),

        me: usersResource.get(route({})`/me`).returns(UserResponseSchema)
    },

    webhooks: {
        subscribe: endpoint
            .post('/api/webhooks/subscribe')
            .body(WebhookSubscriptionBodySchema)
            .responses({
                201: WebhookSubscriptionResponseSchema,
                400: ErrorResponseSchema
            })
    },

    activity: {
        listAll: activityResource
            .get()
            .query(object({ limit: number().coerce().optional() }))
            .responses({ 200: array(TodoActivityResponseSchema) })
    },

    admin: {
        activityLog: endpoint.get('/api/admin/activity').returns(string())
    },

    // ── Resilience demo endpoints ─────────────────────────────────────────
    demo: {
        /** Responds after a configurable delay (ms via query). */
        slow: endpoint
            .get('/api/demo/slow')
            .query(object({ delay: number().coerce().optional() }))
            .returns(object({ ok: string() })),

        /** Fails with 500 a configurable number of times before succeeding. */
        flaky: endpoint
            .get('/api/demo/flaky')
            .query(
                object({
                    failCount: number().coerce().optional(),
                    key: string().optional()
                })
            )
            .returns(object({ attempt: number() })),

        /** Echoes back the request body. */
        echo: endpoint
            .post('/api/demo/echo')
            .body(object({ message: string() }))
            .returns(object({ message: string() }))
    },

    // ── WebSocket subscriptions ───────────────────────────────────────────
    live: {
        /** Real-time todo change notifications. */
        todoUpdates: endpoint
            .subscription('/ws/todos')
            .outgoing(
                object({
                    action: string(),
                    todoId: number(),
                    title: string()
                })
            )
            .summary('Live todo updates')
            .tags('live'),

        /** Simple bidirectional chat room. */
        chat: endpoint
            .subscription('/ws/chat')
            .incoming(object({ text: string() }))
            .outgoing(object({ user: string(), text: string(), ts: number() }))
            .summary('Chat room')
            .tags('live'),

        /** Real-time todo activity feed (all todos). */
        activityFeed: endpoint
            .subscription('/ws/activity')
            .outgoing(TodoActivityResponseSchema)
            .summary('Live activity feed')
            .tags('live')
    }
});
