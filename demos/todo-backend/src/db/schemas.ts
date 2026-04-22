import {
    boolean,
    date,
    number,
    object,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    POLYMORPHIC_TYPE_BRAND,
    string
} from '@cleverbrush/knex-schema';

const UserBaseSchema = object({
    id: number().primaryKey(),
    email: string(),
    passwordHash: string().optional().hasColumnName('password_hash'),
    role: string(),
    authProvider: string().hasColumnName('auth_provider'),
    createdAt: date().hasColumnName('created_at')
})
    .hasTableName('users')
    .projection('public', 'id', 'email', 'role', 'authProvider', 'createdAt')
    .projection('auth' , 'id', 'email', 'role', 'passwordHash', 'authProvider')
    .projection('summary', 'id', 'email');

const TodoBaseSchema = object({
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
    updatedAt: date().hasColumnName('updated_at')
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
        (q: { orderBy: (column: string, direction: 'asc' | 'desc') => unknown }) =>
            q.orderBy('created_at', 'desc')
    );

// ── Todo Activity (polymorphic) ──────────────────────────────────────────────

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

// ── Relations ─────────────────────────────────────────────────────────────────

export const UserDbSchema = UserBaseSchema.hasMany('todos', {
    schema: () => TodoDbSchema,
    foreignKey: (t: { userId: number }) => t.userId
});

export const TodoDbSchema = TodoBaseSchema
    .belongsTo('author', {
        schema: () => UserDbSchema,
        foreignKey: (t: { userId: number }) => t.userId
    })
    .hasMany('activity', {
        schema: () => TodoActivityDbSchema,
        foreignKey: (t: { todoId: number }) => t.todoId
    });

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
