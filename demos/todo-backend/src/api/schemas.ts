import {
    array,
    boolean,
    date,
    type InferType,
    number,
    object,
    string,
    union
} from '@cleverbrush/schema';

// ── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterBodySchema = object({
    email: string().required("email is required").nonempty("email cannot be empty").email("must be a valid email address").describe("The user's email address."),
    password: string()
        .nonempty("password cannot be empty")
        .required("password is required")
        .minLength(8, "password must be at least 8 characters")
        .describe("The user's password. Must be at least 8 characters.")
});

export const LoginBodySchema = object({
    /** The user's email address. */
    email: string().required("email is required").nonempty("email cannot be empty").email("must be a valid email address").describe("The user's email address."),
    password: string().required("password is required").nonempty("password cannot be empty").describe("The user's password.")
});

export const GoogleAuthBodySchema = object({
    idToken: string().describe(
        'Google ID token obtained from the Google Sign-In flow.'
    )
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

export type Principal = InferType<typeof PrincipalSchema>;

// ── User responses ────────────────────────────────────────────────────────────

export const UserResponseSchema = object({
    id: number().describe('Unique identifier of the user.'),
    email: string().describe("The user's email address."),
    role: string().describe('The user\'s role. One of "user" or "admin".'),
    authProvider: string()
        .describe('Authentication provider: "local" or "google".')
        .optional(),
    createdAt: date()
        .coerce()
        .describe('ISO 8601 timestamp of when the account was created.')
}).schemaName('UserResponse');

export type UserResponse = InferType<typeof UserResponseSchema>;

// ── Todo requests ─────────────────────────────────────────────────────────────

export const CreateTodoBodySchema = object({
    title: string().nonempty("title cannot be empty")
    .required("title is required")
    .minLength(1, "title must be at least 1 character")
    .describe('The todo title. Must be at least 1 character.'),
    description: string()
        .optional()
        .describe('Optional longer description of the todo.')
});

export const UpdateTodoBodySchema = object({
    /** New title for the todo. */
    title: string().minLength(1, "title must be at least 1 character").optional().describe('New title for the todo.'),
    /** New description for the todo. */
    description: string().optional().describe('New description for the todo.'),
    /** Whether the todo is completed. */
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
    createdAt: date()
        .coerce()
        .describe('ISO 8601 timestamp of when the todo was created.'),
    updatedAt: date()
        .coerce()
        .describe('ISO 8601 timestamp of the last update.')
}).schemaName('TodoResponse');

export type TodoResponse = InferType<typeof TodoResponseSchema>;

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

export const TodoWithAuthorResponseSchema = object({
    todo: TodoResponseSchema,
    author: UserResponseSchema
}).schemaName('TodoWithAuthorResponse');

// ── Todo events (discriminated union) ─────────────────────────────────────────

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
    completedAt: date()
        .coerce()
        .describe('ISO 8601 timestamp when the todo was completed.')
}).schemaName('TodoCompletedEvent');

export const TodoEventSchema = union(TodoAssignedEventSchema)
    .or(TodoCommentedEventSchema)
    .or(TodoCompletedEventSchema)
    .schemaName('TodoEvent');

export type TodoEvent = InferType<typeof TodoEventSchema>;

// ── Import / Export ───────────────────────────────────────────────────────────

export const ImportTodoItemSchema = object({
    title: string()
        .minLength(1)
        .describe('Title of the todo to import. Must be at least 1 character.'),
    description: string()
        .optional()
        .describe('Optional description for the imported todo.')
}).schemaName('ImportTodoItem');

export const ImportTodosBodySchema = object({
    items: array(ImportTodoItemSchema).describe(
        'Array of todo items to import.'
    )
}).schemaName('ImportTodosBody');

export type ImportTodosBody = InferType<typeof ImportTodosBodySchema>;

export const ImportResultItemSchema = object({
    title: string().describe('Title of the todo item.'),
    success: boolean().describe('Whether the item was successfully imported.'),
    error: string()
        .optional()
        .describe('Error message if the item failed to import.')
}).schemaName('ImportResultItem');

export const ImportResultSchema = object({
    imported: number().describe('Number of successfully imported todos.'),
    total: number().describe('Total number of items in the request.'),
    items: array(ImportResultItemSchema).describe('Per-item import results.')
}).schemaName('ImportResult');

// ── Request header schemas ────────────────────────────────────────────────────

export const ImportRequestHeadersSchema = object({
    'x-idempotency-key': string()
        .optional()
        .describe(
            'Optional idempotency key to prevent duplicate imports on retries.'
        )
});

export const CompletionRequestHeadersSchema = object({
    'if-match': string()
        .optional()
        .describe(
            'ETag of the todo for optimistic concurrency control. Must match the current updatedAt timestamp.'
        )
});

// ── Response header schemas ───────────────────────────────────────────────────

export const ExportResponseHeadersSchema = object({
    'x-total-count': number().describe(
        'Total number of todos included in the export.'
    ),
    'x-export-format': string().describe(
        'The format of the exported data (e.g. "csv").'
    )
});

// ── Webhook schemas ───────────────────────────────────────────────────────────

export const TodoNotificationPayloadSchema = object({
    event: string().describe(
        'Event type, e.g. "todo.created" or "todo.completed".'
    ),
    todoId: number().describe('ID of the affected todo.'),
    todo: TodoResponseSchema
}).schemaName('TodoNotificationPayload');

export const WebhookAckSchema = object({
    received: boolean().describe('Whether the consumer acknowledged the event.')
}).schemaName('WebhookAck');

export const WebhookSubscriptionBodySchema = object({
    callbackUrl: string().describe(
        'The URL where webhook notifications will be sent.'
    ),
    events: array(string()).describe(
        'Event types to subscribe to, e.g. ["todo.created", "todo.completed"].'
    )
}).schemaName('WebhookSubscriptionBody');

export const WebhookSubscriptionResponseSchema = object({
    id: string().describe('Unique identifier for this subscription.'),
    callbackUrl: string().describe(
        'The registered callback URL for notifications.'
    ),
    events: array(string()).describe('The subscribed event types.'),
    createdAt: date()
        .coerce()
        .describe('ISO 8601 timestamp of when the subscription was created.')
}).schemaName('WebhookSubscriptionResponse');

// ── Todo Activity responses ───────────────────────────────────────────────────

const activityCommonFields = {
    id: number().describe('Unique identifier of the activity record.'),
    todoId: number().describe('ID of the todo this activity belongs to.'),
    actorUserId: number()
        .optional()
        .describe('ID of the user who performed the action.'),
    createdAt: date()
        .coerce()
        .describe('ISO 8601 timestamp of when the activity was recorded.')
};

export const TodoActivityAssignedResponseSchema = object({
    ...activityCommonFields,
    type: string().equals('assigned').describe('Activity type discriminator.'),
    assignedToUserId: number().describe('ID of the user who was assigned.'),
    assignee: object({
        id: number(),
        email: string()
    })
        .optional()
        .nullable()
        .describe('Eagerly-loaded assignee user summary (id + email).')
}).schemaName('TodoActivityAssignedResponse');

export const TodoActivityCommentedResponseSchema = object({
    ...activityCommonFields,
    type: string().equals('commented').describe('Activity type discriminator.'),
    comment: string().describe('The comment text.')
}).schemaName('TodoActivityCommentedResponse');

export const TodoActivityCompletedResponseSchema = object({
    ...activityCommonFields,
    type: string().equals('completed').describe('Activity type discriminator.'),
    completedAt: date()
        .coerce()
        .optional()
        .describe('ISO 8601 timestamp when the todo was completed.')
}).schemaName('TodoActivityCompletedResponse');

export const TodoActivityResponseSchema = union(TodoActivityAssignedResponseSchema)
    .or(TodoActivityCommentedResponseSchema)
    .or(TodoActivityCompletedResponseSchema)
    .schemaName('TodoActivityResponse');

export type TodoActivityResponse = InferType<typeof TodoActivityResponseSchema>;
