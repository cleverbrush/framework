import { ActionResult, type Handler } from '@cleverbrush/server';
import { TodoDbSchema, UserDbSchema } from '../../db/schemas.js';
import type {
    CreateTodoEndpoint,
    DeleteTodoEndpoint,
    GetTodoEndpoint,
    GetTodoWithAuthorEndpoint,
    ListTodosEndpoint,
    SendTodoEventEndpoint,
    UpdateTodoEndpoint
} from '../endpoints.js';
import { mapTodo, mapUser } from '../mappers.js';

// ── List todos ────────────────────────────────────────────────────────────────

export const listTodosHandler: Handler<typeof ListTodosEndpoint> = async (
    { query, principal },
    { db }
) => {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    let builder = db(TodoDbSchema)
        .orderBy(t => t.createdAt, 'desc')
        .limit(limit)
        .offset(offset);

    if (principal.role === 'admin') {
        // Admins may optionally filter by a specific user
        if (query.userId != null) {
            builder = builder.where(t => t.userId, query.userId!);
        }
    } else {
        // Regular users only see their own todos
        builder = builder.where(t => t.userId, principal.userId);
    }

    const rows = await builder;
    return Promise.all(rows.map(mapTodo));
};

// ── Get todo by ID ────────────────────────────────────────────────────────────

export const getTodoHandler: Handler<typeof GetTodoEndpoint> = async (
    { params, principal },
    { db }
) => {
    const todo = await db(TodoDbSchema)
        .where(t => t.id, params.id)
        .first();

    if (!todo) {
        return ActionResult.notFound({
            message: `Todo ${params.id} not found.`
        });
    }

    if (principal.role !== 'admin' && todo.userId !== principal.userId) {
        return ActionResult.forbidden({
            message: 'You do not have access to this todo.'
        });
    }

    return mapTodo(todo);
};

// ── Create todo ───────────────────────────────────────────────────────────────

export const createTodoHandler: Handler<typeof CreateTodoEndpoint> = async (
    { body, principal },
    { db }
) => {
    const now = new Date();
    const todo = await db(TodoDbSchema).insert({
        title: body.title,
        description: body.description,
        completed: false,
        userId: principal.userId,
        createdAt: now,
        updatedAt: now
    });

    return ActionResult.created(await mapTodo(todo), `/api/todos/${todo.id}`);
};

// ── Update todo ───────────────────────────────────────────────────────────────

export const updateTodoHandler: Handler<typeof UpdateTodoEndpoint> = async (
    { params, body, principal },
    { db }
) => {
    const todo = await db(TodoDbSchema)
        .where(t => t.id, params.id)
        .first();

    if (!todo) {
        return ActionResult.notFound({
            message: `Todo ${params.id} not found.`
        });
    }

    if (principal.role !== 'admin' && todo.userId !== principal.userId) {
        return ActionResult.forbidden({
            message: 'You do not have access to this todo.'
        });
    }

    const patch: Partial<{
        title: string;
        description: string | undefined;
        completed: boolean;
        updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    if (body.completed !== undefined) patch.completed = body.completed;

    const [updated] = await db(TodoDbSchema)
        .where(t => t.id, params.id)
        .update(patch);

    return mapTodo(updated);
};

// ── Delete todo ───────────────────────────────────────────────────────────────

export const deleteTodoHandler: Handler<typeof DeleteTodoEndpoint> = async (
    { params, principal },
    { db }
) => {
    const todo = await db(TodoDbSchema)
        .where(t => t.id, params.id)
        .first();

    if (!todo) {
        return ActionResult.notFound({
            message: `Todo ${params.id} not found.`
        });
    }

    if (principal.role !== 'admin' && todo.userId !== principal.userId) {
        return ActionResult.forbidden({
            message: 'You do not have access to this todo.'
        });
    }

    await db(TodoDbSchema)
        .where(t => t.id, params.id)
        .delete();

    return ActionResult.noContent();
};

// ── Get todo with author ──────────────────────────────────────────────────────

export const getTodoWithAuthorHandler: Handler<
    typeof GetTodoWithAuthorEndpoint
> = async ({ params, principal }, { db }) => {
    const todo = await db(TodoDbSchema)
        .where(t => t.id, params.id)
        .first();

    if (!todo) {
        return ActionResult.notFound({
            message: `Todo ${params.id} not found.`
        });
    }

    if (principal.role !== 'admin' && todo.userId !== principal.userId) {
        return ActionResult.forbidden({
            message: 'You do not have access to this todo.'
        });
    }

    const author = await db(UserDbSchema)
        .where(u => u.id, todo.userId)
        .first();

    if (!author) {
        return ActionResult.notFound({
            message: `Author for todo ${params.id} not found.`
        });
    }

    return {
        todo: await mapTodo(todo),
        author: await mapUser(author)
    };
};

// ── Send todo event (discriminated union demo) ────────────────────────────────

export const sendTodoEventHandler: Handler<
    typeof SendTodoEventEndpoint
> = async ({ params, body, principal }, { db }) => {
    const todo = await db(TodoDbSchema)
        .where(t => t.id, params.id)
        .first();

    if (!todo) {
        return ActionResult.notFound({
            message: `Todo ${params.id} not found.`
        });
    }

    if (principal.role !== 'admin' && todo.userId !== principal.userId) {
        return ActionResult.forbidden({
            message: 'You do not have access to this todo.'
        });
    }

    // Echo the event back so the caller can confirm what was received.
    return body;
};
