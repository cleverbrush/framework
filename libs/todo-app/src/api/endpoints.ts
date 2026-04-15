import { array, number } from '@cleverbrush/schema';
import { endpoint, route } from '@cleverbrush/server';
import { BoundQueryToken } from '../di/tokens.js';
import {
    CreateTodoBodySchema,
    ErrorResponseSchema,
    LoginBodySchema,
    PaginationQuerySchema,
    PrincipalSchema,
    RegisterBodySchema,
    TodoEventSchema,
    TodoListQuerySchema,
    TodoResponseSchema,
    TodoWithAuthorResponseSchema,
    TokenResponseSchema,
    UpdateTodoBodySchema,
    UserResponseSchema
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
