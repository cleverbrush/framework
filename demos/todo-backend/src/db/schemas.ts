import {
    array,
    boolean,
    date,
    defineEntity,
    number,
    object,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    POLYMORPHIC_TYPE_BRAND,
    string
} from '@cleverbrush/knex-schema';

// ── Users ────────────────────────────────────────────────────────────────────
//
// User has no outgoing typed relations needed by the demo, so we keep it as a
// plain schema (no nav properties) and expose it directly. The chained
// projection methods rely on the `EXTRA_TYPE_BRAND` phantom that would be
// dropped by `addProps()`, so this also avoids that pitfall.

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

// ── Todo Activity (polymorphic CTI + STI) ────────────────────────────────────
//
// Variant relations (e.g. `assigned.assignee → User`) are still declared
// inline via the schema-level `withVariants({ relations: ... })` API because
// variant tables intentionally do NOT carry navigation properties — those
// would be SELECTed verbatim during variant column expansion and break SQL.

export const TodoActivityAssignedDbSchema = object({
    activityId: number().hasColumnName('activity_id'),
    type: string('assigned'),
    assignedToUserId: number().hasColumnName('assigned_to_user_id')
}).hasTableName('todo_activity_assigned');

export const TodoActivityCommentedDbSchema = object({
    activityId: number().hasColumnName('activity_id'),
    type: string('commented'),
    comment: string()
}).hasTableName('todo_activity_commented');

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

export const TodoActivityDbSchema = TodoActivityBaseDbSchema.withVariants({
    discriminator: 'type',
    variants: {
        assigned: {
            schema: TodoActivityAssignedDbSchema,
            storage: 'cti',
            foreignKey: t => t.activityId,
            relations: {
                assignee: {
                    type: 'belongsTo' as const,
                    schema: () => UserDbSchema,
                    foreignKey: (t: any) => t.assignedToUserId
                }
            }
        },
        commented: {
            schema: TodoActivityCommentedDbSchema,
            storage: 'cti',
            foreignKey: t => t.activityId
        },
        completed: {
            schema: CompletedExtras,
            storage: 'sti'
        }
    }
});

// ── Todo (uses the new defineEntity API) ─────────────────────────────────────
//
// The schema is declared with `author` and `activity` navigation properties
// inline so `defineEntity().belongsTo() / .hasMany()` can resolve foreign
// schemas at runtime AND track them as `TRels` in the type. Nav props are
// `.optional()` so they don't interfere with inserts; they're virtual at
// runtime (Knex `select *` only fetches real DB columns).

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
        r => r.id,
        { optional: true }
    )
    .hasMany(
        t => t.activity,
        l => l.id,
        r => r.todoId
    );

// `entity.schema` is a plain `ObjectSchemaBuilder` with the `relations`
// extension populated, so it works seamlessly with `db(schema).include(...)`.
export const TodoDbSchema = TodoEntity.schema;

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
