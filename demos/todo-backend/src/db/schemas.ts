import {
    boolean,
    date,
    number,
    object,
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
    .projection('auth' , 'id', 'email', 'role', 'passwordHash', 'authProvider');

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

export const UserDbSchema = UserBaseSchema.hasMany('todos', {
    schema: () => TodoDbSchema,
    foreignKey: (t: { userId: number }) => t.userId
});

export const TodoDbSchema = TodoBaseSchema.belongsTo('author', {
    schema: () => UserDbSchema,
    foreignKey: (t: { userId: number }) => t.userId
});

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
