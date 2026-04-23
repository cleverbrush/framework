import {
    array,
    boolean,
    date,
    defineEntity,
    number,
    object,
    string
} from '@cleverbrush/orm';

// ── Users ────────────────────────────────────────────────────────────────────
//
// User has no outgoing nav properties (the demo only needs `author` from the
// other side). Keeping it as a plain object avoids dropping the
// `EXTRA_TYPE_BRAND` phantom that powers `.projection()`/`.scope()` typing.

export const UserDbSchema = object({
    id: number().primaryKey(),
    email: string(),
    passwordHash: string().optional().hasColumnName('password_hash'),
    role: string(),
    authProvider: string().hasColumnName('auth_provider'),
    createdAt: date().hasColumnName('created_at')
})
    .hasTableName('users')
    .projection('public', 'id', 'email', 'role', 'authProvider', 'createdAt')
    .projection('auth', 'id', 'email', 'role', 'passwordHash', 'authProvider')
    .projection('summary', 'id', 'email');

export const UserEntity = defineEntity(UserDbSchema);

// ── Todo Activity (polymorphic CTI + STI) ────────────────────────────────────

export const TodoActivityAssignedDbSchema = object({
    activityId: number().hasColumnName('activity_id'),
    type: string('assigned'),
    assignedToUserId: number().hasColumnName('assigned_to_user_id')
}).hasTableName('todo_activity_assigned');

export const TodoActivityAssignedEntity = defineEntity(
    TodoActivityAssignedDbSchema
);

export const TodoActivityCommentedDbSchema = object({
    activityId: number().hasColumnName('activity_id'),
    type: string('commented'),
    comment: string()
}).hasTableName('todo_activity_commented');

export const TodoActivityCommentedEntity = defineEntity(
    TodoActivityCommentedDbSchema
);

const CompletedExtras = object({
    type: string('completed'),
    completedAt: date().hasColumnName('completed_at').optional()
}); // STI — columns live on the base table

export const TodoActivityBaseDbSchema = object({
    id: number().primaryKey(),
    todoId: number()
        .hasColumnName('todo_id')
        .references('todos', 'id')
        .onDelete('CASCADE')
        .index('idx_todo_activity_todo_id'),
    type: string(),
    actorUserId: number()
        .hasColumnName('actor_user_id')
        .references('users', 'id')
        .onDelete('SET NULL')
        .optional(),
    completedAt: date().hasColumnName('completed_at').optional(),
    createdAt: date().hasColumnName('created_at')
}).hasTableName('todo_activity');

export const TodoActivityBaseEntity = defineEntity(TodoActivityBaseDbSchema);

// Variant relations are declared inline via the per-variant `opts.relations`
// option because variant tables intentionally do NOT carry navigation
// properties — those would be SELECTed verbatim during variant column
// expansion and break SQL.
export const TodoActivityEntity = defineEntity(TodoActivityBaseDbSchema)
    .discriminator('type')
    .ctiVariant(
        'assigned',
        TodoActivityAssignedEntity,
        t => t.activityId,
        {
            relations: {
                assignee: {
                    type: 'belongsTo',
                    schema: () => UserDbSchema,
                    foreignKey: (t: any) => t.assignedToUserId
                }
            }
        }
    )
    .ctiVariant(
        'commented',
        TodoActivityCommentedEntity,
        t => t.activityId
    )
    .stiVariant('completed', CompletedExtras);

export const TodoActivityDbSchema = TodoActivityEntity.schema;

// ── Todo (uses the new defineEntity API) ─────────────────────────────────────

const TodoSchema = object({
    id: number().primaryKey(),
    title: string(),
    description: string().optional(),
    completed: boolean().defaultTo(false),
    userId: number()
        .hasColumnName('user_id')
        .references('users', 'id')
        .onDelete('CASCADE')
        .index('idx_todos_user_id'),
    createdAt: date().hasColumnName('created_at'),
    updatedAt: date().hasColumnName('updated_at'),
    // navigation properties consumed by `defineEntity()`
    author: UserDbSchema.optional(),
    activity: array(TodoActivityDbSchema).optional()
})
    .hasTableName('todos')
    .hasTimestamps({ createdAt: 'created_at', updatedAt: 'updated_at' })
    .softDelete({ column: 'deleted_at' })
    .projection(
        'response',
        'id',
        'title',
        'description',
        'completed',
        'userId',
        'createdAt',
        'updatedAt'
    )
    .projection('ownership', 'id', 'userId')
    .scope(
        'recentFirst',
        (q: {
            orderBy: (column: string, direction: 'asc' | 'desc') => unknown;
        }) => q.orderBy('created_at', 'desc')
    );

export const TodoEntity = defineEntity(TodoSchema)
    .belongsTo(
        t => t.author,
        l => l.userId,
        r => r.id
    )
    .hasMany(
        t => t.activity,
        l => l.id,
        r => r.todoId
    );

export const TodoDbSchema = TodoEntity.schema;

// ── Entity map for createDb ─────────────────────────────────────────────────

export type AppEntityMap = {
    todos: typeof TodoEntity;
    users: typeof UserEntity;
    todoActivity: typeof TodoActivityEntity;
    todoActivityBase: typeof TodoActivityBaseEntity;
    todoActivityAssigned: typeof TodoActivityAssignedEntity;
    todoActivityCommented: typeof TodoActivityCommentedEntity;
};

export const entityMap: AppEntityMap = {
    todos: TodoEntity,
    users: UserEntity,
    todoActivity: TodoActivityEntity,
    todoActivityBase: TodoActivityBaseEntity,
    todoActivityAssigned: TodoActivityAssignedEntity,
    todoActivityCommented: TodoActivityCommentedEntity
};

// ── Plain row types (used by mappers) ───────────────────────────────────────

export type ActivityDb = {
    id: number;
    todoId: number;
    type: string;
    actorUserId?: number;
    completedAt?: Date | null;
    createdAt: Date;
};

export type UserDb = {
    id: number;
    email: string;
    passwordHash?: string;
    role: string;
    authProvider: string;
    createdAt: Date;
};

export type TodoDb = {
    id: number;
    title: string;
    description?: string;
    completed: boolean;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
};
