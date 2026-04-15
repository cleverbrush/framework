import { boolean, number, object, string, union } from '@cleverbrush/schema';

// ── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterBodySchema = object({
    email: string().describe("The user's email address."),
    password: string()
        .minLength(8)
        .describe("The user's password. Must be at least 8 characters.")
});

export const LoginBodySchema = object({
    email: string().describe("The user's email address."),
    password: string().describe("The user's password.")
});

export const TokenResponseSchema = object({
    token: string().describe(
        'Signed JWT to be sent as a Bearer token in subsequent requests.'
    )
}).schemaName('TokenResponse');

// ── Principal (decoded JWT claims) ───────────────────────────────────────────

export const PrincipalSchema = object({
    userId: number().describe("The authenticated user's ID."),
    role: string().describe(
        'The authenticated user\'s role (e.g. "user" or "admin").'
    )
});

export type Principal = {
    userId: number;
    role: string;
};

// ── User responses ────────────────────────────────────────────────────────────

export const UserResponseSchema = object({
    id: number().describe('Unique identifier of the user.'),
    email: string().describe("The user's email address."),
    role: string().describe('The user\'s role. One of "user" or "admin".'),
    createdAt: string().describe(
        'ISO 8601 timestamp of when the account was created.'
    )
}).schemaName('UserResponse');

export type UserResponse = {
    id: number;
    email: string;
    role: string;
    createdAt: string;
};

// ── Todo requests ─────────────────────────────────────────────────────────────

export const CreateTodoBodySchema = object({
    title: string()
        .minLength(1)
        .describe('The todo title. Must be at least 1 character.'),
    description: string()
        .optional()
        .describe('Optional longer description of the todo.')
});

export const UpdateTodoBodySchema = object({
    title: string().minLength(1).optional().describe('New title for the todo.'),
    description: string().optional().describe('New description for the todo.'),
    completed: boolean()
        .optional()
        .describe(
            'Set to true to mark the todo as completed, false to reopen it.'
        )
});

// ── Todo responses ────────────────────────────────────────────────────────────

export const TodoResponseSchema = object({
    id: number().describe('Unique identifier of the todo.'),
    title: string().describe('The todo title.'),
    description: string()
        .optional()
        .describe('Optional longer description of the todo.'),
    completed: boolean().describe('Whether the todo has been completed.'),
    userId: number().describe('ID of the user who owns this todo.'),
    createdAt: string().describe(
        'ISO 8601 timestamp of when the todo was created.'
    ),
    updatedAt: string().describe('ISO 8601 timestamp of the last update.')
}).schemaName('TodoResponse');

export type TodoResponse = {
    id: number;
    title: string;
    description?: string;
    completed: boolean;
    userId: number;
    createdAt: string;
    updatedAt: string;
};

// ── Pagination ────────────────────────────────────────────────────────────────

export const PaginationQuerySchema = object({
    page: number()
        .coerce()
        .optional()
        .describe('Page number (1-based). Defaults to 1.'),
    limit: number()
        .coerce()
        .optional()
        .describe('Number of items per page. Defaults to 20, max 100.')
});

export const TodoListQuerySchema = object({
    page: number()
        .coerce()
        .optional()
        .describe('Page number (1-based). Defaults to 1.'),
    limit: number()
        .coerce()
        .optional()
        .describe('Number of items per page. Defaults to 20, max 100.'),
    userId: number()
        .coerce()
        .optional()
        .describe('Filter todos by owner ID. Admins only.')
});

// ── Error response ────────────────────────────────────────────────────────────

export const ErrorResponseSchema = object({
    message: string().describe('Human-readable description of the error.')
}).schemaName('ErrorResponse');

// ── Todo with embedded author ─────────────────────────────────────────────────
// Demonstrates nested $ref deduplication: both TodoResponse and UserResponse
// are named schemas, so generateOpenApiSpec() emits each once in
// components/schemas and references them via $ref wherever they appear.

export const TodoWithAuthorResponseSchema = object({
    todo: TodoResponseSchema,
    author: UserResponseSchema
}).schemaName('TodoWithAuthorResponse');

// ── Todo events (discriminated union) ─────────────────────────────────────────
// Demonstrates OpenAPI discriminator output from @cleverbrush/schema-json.
// The `type` property is a string literal on every branch, so the union
// builder detects it as the discriminator key and emits the OpenAPI
// `discriminator: { propertyName: "type", mapping: { … } }` keyword.

export const TodoAssignedEventSchema = object({
    type: string().equals('assigned').describe('Event type discriminator.'),
    assignedTo: number().describe('ID of the user to assign the todo to.')
}).schemaName('TodoAssignedEvent');

export const TodoCommentedEventSchema = object({
    type: string().equals('commented').describe('Event type discriminator.'),
    comment: string().minLength(1).describe('The comment text.')
}).schemaName('TodoCommentedEvent');

export const TodoCompletedEventSchema = object({
    type: string().equals('completed').describe('Event type discriminator.'),
    completedAt: string().describe(
        'ISO 8601 timestamp when the todo was completed.'
    )
}).schemaName('TodoCompletedEvent');

export const TodoEventSchema = union(TodoAssignedEventSchema)
    .or(TodoCommentedEventSchema)
    .or(TodoCompletedEventSchema)
    .schemaName('TodoEvent');

export type TodoEvent =
    | { type: 'assigned'; assignedTo: number }
    | { type: 'commented'; comment: string }
    | { type: 'completed'; completedAt: string };
