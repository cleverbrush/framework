import { ActionResult, type Handler } from '@cleverbrush/server';
import { TodoDbSchema, UserDbSchema } from '../../db/schemas.js';
import type {
    CompleteTodoEndpoint,
    CreateTodoEndpoint,
    DeleteTodoEndpoint,
    DownloadAttachmentEndpoint,
    ExportTodosEndpoint,
    GetTodoEndpoint,
    GetTodoWithAuthorEndpoint,
    ImportTodosEndpoint,
    LegacyReplaceTodoEndpoint,
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

// ── Export todos as CSV ───────────────────────────────────────────────────────

export const exportTodosHandler: Handler<typeof ExportTodosEndpoint> = async (
    { principal, context },
    { db }
) => {
    let builder = db(TodoDbSchema).orderBy(t => t.createdAt, 'desc');

    if (principal.role !== 'admin') {
        builder = builder.where(t => t.userId, principal.userId);
    }

    const rows = await builder;
    const todos = await Promise.all(rows.map(mapTodo));

    // Build CSV
    const header = 'id,title,description,completed,userId,createdAt,updatedAt';
    const csvRows = todos.map(
        t =>
            `${t.id},"${(t.title ?? '').replace(/"/g, '""')}","${(t.description ?? '').replace(/"/g, '""')}",${t.completed},${t.userId},${t.createdAt.toISOString()},${t.updatedAt.toISOString()}`
    );
    const csv = [header, ...csvRows].join('\n');

    context.response.setHeader('x-total-count', String(todos.length));
    context.response.setHeader('x-export-format', 'csv');

    return ActionResult.content(csv, 'text/csv');
};

// ── Download todo attachment ──────────────────────────────────────────────────

export const downloadAttachmentHandler: Handler<
    typeof DownloadAttachmentEndpoint
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

    const mapped = await mapTodo(todo);
    const text = [
        `Todo #${mapped.id}`,
        `Title: ${mapped.title}`,
        mapped.description ? `Description: ${mapped.description}` : null,
        `Completed: ${mapped.completed ? 'Yes' : 'No'}`,
        `Created: ${mapped.createdAt.toISOString()}`,
        `Updated: ${mapped.updatedAt.toISOString()}`
    ]
        .filter(Boolean)
        .join('\n');

    return ActionResult.file(
        Buffer.from(text, 'utf-8'),
        `todo-${params.id}.txt`,
        'text/plain'
    );
};

// ── Bulk import todos ─────────────────────────────────────────────────────────

export const importTodosHandler: Handler<typeof ImportTodosEndpoint> = async (
    { body, principal },
    { db }
) => {
    const items = body.items;

    // If batch is large, return 202 Accepted (demo of ActionResult.accepted)
    if (items.length > 100) {
        return ActionResult.accepted({
            message:
                'Import queued — batch exceeds 100 items and will be processed asynchronously.',
            total: items.length
        });
    }

    const results: Array<{
        title: string;
        success: boolean;
        error?: string;
    }> = [];
    let imported = 0;

    for (const item of items) {
        try {
            const now = new Date();
            await db(TodoDbSchema).insert({
                title: item.title,
                description: item.description,
                completed: false,
                userId: principal.userId,
                createdAt: now,
                updatedAt: now
            });
            results.push({ title: item.title, success: true });
            imported++;
        } catch {
            results.push({
                title: item.title,
                success: false,
                error: 'Failed to insert todo.'
            });
        }
    }

    // 207 Multi-Status with per-item results (demo of ActionResult.json with custom status)
    return ActionResult.json(
        { imported, total: items.length, items: results },
        207
    );
};

// ── Deprecated full replace (redirect to PATCH) ──────────────────────────────

export const legacyReplaceTodoHandler: Handler<
    typeof LegacyReplaceTodoEndpoint
> = async ({ params }) => {
    return ActionResult.redirect(`/api/todos/${params.id}`, false);
};

// ── Complete todo with conflict detection ─────────────────────────────────────

export const completeTodoHandler: Handler<typeof CompleteTodoEndpoint> = async (
    { params, headers, principal },
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

    // Optimistic concurrency: check If-Match header against updatedAt ETag
    const currentEtag = todo.updatedAt.toISOString();
    const ifMatch = headers['if-match'];
    if (ifMatch && ifMatch !== currentEtag) {
        return ActionResult.conflict({
            message:
                'Todo was modified since you last fetched it. Refresh and retry.'
        });
    }

    // Already completed — no-op (demo of ActionResult.status)
    if (todo.completed) {
        return mapTodo(todo);
    }

    const [updated] = await db(TodoDbSchema)
        .where(t => t.id, params.id)
        .update({ completed: true, updatedAt: new Date() });

    return mapTodo(updated);
};
