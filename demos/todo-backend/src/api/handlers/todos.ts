import { ActionResult, type Handler } from '@cleverbrush/server';
import {
    TodoCompleted,
    TodoCreated,
    TodoDeleted,
    TodoEventReceived,
    TodosExported,
    TodosImported,
    TodoUpdated
} from '../../logTemplates.js';
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
    ListAllActivityEndpoint,
    ListTodoActivityEndpoint,
    ListTodosEndpoint,
    SendTodoEventEndpoint,
    UpdateTodoEndpoint
} from '../endpoints.js';
import { mapTodo, mapTodoActivity, mapUser } from '../mappers.js';
import { publishActivity } from './activityBus.js';

// ── List todos ────────────────────────────────────────────────────────────────

export const listTodosHandler: Handler<typeof ListTodosEndpoint> = async (
    { query, principal },
    { db }
) => {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.limit ?? 20));

    let builder = db.todos.projected('response').scoped('recentFirst');

    if (principal.role === 'admin') {
        // Admins may optionally filter by a specific user
        if (query.userId != null) {
            builder = builder.where(t => t.userId, query.userId);
        }
    } else {
        // Regular users only see their own todos
        builder = builder.where(t => t.userId, principal.userId);
    }

    const rows = await builder.paginate({ page, pageSize });
    return Promise.all(rows.data.map(mapTodo));
};

// ── Get todo by ID ────────────────────────────────────────────────────────────

export const getTodoHandler: Handler<typeof GetTodoEndpoint> = async (
    { params, principal },
    { db }
) => {
    const todo = await db.todos
        .projected('response')
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
    { db, logger }
) => {
    const todo = await db.todos.insert({
        title: body.title,
        description: body.description,
        completed: false,
        userId: principal.userId
    });

    logger.info(TodoCreated, {
        TodoId: todo.id,
        Title: body.title,
        UserId: principal.userId
    });

    return ActionResult.created(await mapTodo(todo), `/api/todos/${todo.id}`);
};

// ── Update todo ───────────────────────────────────────────────────────────────

export const updateTodoHandler: Handler<typeof UpdateTodoEndpoint> = async (
    { params, body, principal },
    { db, logger }
) => {
    const todo = await db.todos
        .projected('ownership')
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
    }> = {};

    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    if (body.completed !== undefined) patch.completed = body.completed;

    const [updated] = await db.todos
        .where(t => t.id, params.id)
        .update(patch);

    logger.info(TodoUpdated, {
        TodoId: params.id,
        UserId: principal.userId
    });

    return mapTodo(updated);
};

// ── Delete todo ───────────────────────────────────────────────────────────────

export const deleteTodoHandler: Handler<typeof DeleteTodoEndpoint> = async (
    { params, principal },
    { db, logger }
) => {
    const todo = await db.todos
        .projected('ownership')
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

    await db.todos.where(t => t.id, params.id).delete();

    logger.info(TodoDeleted, {
        TodoId: params.id,
        UserId: principal.userId
    });

    return ActionResult.noContent();
};

// ── Get todo with author ──────────────────────────────────────────────────────

export const getTodoWithAuthorHandler: Handler<
    typeof GetTodoWithAuthorEndpoint
> = async ({ params, principal }, { db }) => {
    const todoWithAuthor = await db.todos
        .include(t => t.author)
        .where(t => t.id, params.id)
        .first();

    if (!todoWithAuthor) {
        return ActionResult.notFound({
            message: `Todo ${params.id} not found.`
        });
    }

    if (
        principal.role !== 'admin' &&
        todoWithAuthor.userId !== principal.userId
    ) {
        return ActionResult.forbidden({
            message: 'You do not have access to this todo.'
        });
    }

    if (!todoWithAuthor.author) {
        return ActionResult.notFound({
            message: `Author for todo ${params.id} not found.`
        });
    }

    return {
        todo: await mapTodo(todoWithAuthor),
        author: await mapUser(todoWithAuthor.author)
    };
};

// ── Send todo event (discriminated union demo) ────────────────────────────────

export const sendTodoEventHandler: Handler<
    typeof SendTodoEventEndpoint
> = async ({ params, body, principal }, { db, logger }) => {
    const todo = await db.todos
        .projected('ownership')
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

    const activityId = await db.transaction(async dbTrx => {
        const base = await dbTrx.todoActivityBase.insert({
            todoId: params.id,
            type: body.type,
            actorUserId: principal.userId,
            ...(body.type === 'completed' && body.completedAt
                ? { completedAt: body.completedAt }
                : {})
        });

        if (body.type === 'assigned') {
            await dbTrx.todoActivityAssigned.insert({
                activityId: base.id,
                type: 'assigned',
                assignedToUserId: body.assignedTo
            });
        } else if (body.type === 'commented') {
            await dbTrx.todoActivityCommented.insert({
                activityId: base.id,
                type: 'commented',
                comment: body.comment
            });
        }

        return base.id;
    });

    const row = await db.todoActivity.where(a => a.id, activityId).first();

    const mapped = mapTodoActivity(row!);

    publishActivity(mapped);

    logger.info(TodoEventReceived, {
        TodoId: params.id,
        EventType: body.type,
        UserId: principal.userId
    });

    return mapped;
};

// ── List todo activity ───────────────────────────────────────────────────────────

export const listTodoActivityHandler: Handler<
    typeof ListTodoActivityEndpoint
> = async ({ params, principal }, { db }) => {
    const todo = await db.todos
        .projected('ownership')
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

    const rows = await db.todoActivity
        .where(a => a.todoId, params.id)
        .orderBy(a => a.createdAt, 'desc');

    return rows.map(mapTodoActivity);
};

// ── List all activity (global feed seed) ────────────────────────────────────

export const listAllActivityHandler: Handler<
    typeof ListAllActivityEndpoint
> = async ({ query }, { db }) => {
    const limit = Math.min(100, Math.max(1, query?.limit ?? 10));

    const rows = await db.todoActivity
        .includeVariant('assigned', 'assignee', q => q.projected('summary' as never))
        .orderBy(a => a.createdAt, 'desc')
        .limit(limit);

    return rows.map(mapTodoActivity);
};

// ── Export todos as CSV ───────────────────────────────────────────────────────

export const exportTodosHandler: Handler<typeof ExportTodosEndpoint> = async (
    { principal, context },
    { db, logger }
) => {
    let builder = db.todos.projected('response').orderBy(t => t.createdAt, 'desc');

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

    logger.info(TodosExported, {
        Count: todos.length,
        UserId: principal.userId
    });

    return ActionResult.content(csv, 'text/csv');
};

// ── Download todo attachment ──────────────────────────────────────────────────

export const downloadAttachmentHandler: Handler<
    typeof DownloadAttachmentEndpoint
> = async ({ params, principal }, { db }) => {
    const todo = await db.todos
        .projected('response')
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
    { db, logger }
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
            await db.todos.insert({
                title: item.title,
                description: item.description,
                completed: false,
                userId: principal.userId
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
    logger.info(TodosImported, {
        Imported: imported,
        Total: items.length,
        UserId: principal.userId
    });

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
    { db, logger }
) => {
    const todo = await db.todos
        .projected('response')
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

    const [updated] = await db.todos
        .where(t => t.id, params.id)
        .update({ completed: true });

    logger.info(TodoCompleted, {
        TodoId: params.id,
        UserId: principal.userId
    });

    return mapTodo(updated);
};
