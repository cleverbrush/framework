import {
    boolean,
    date,
    number,
    object,
    string
} from '@cleverbrush/knex-schema';

export const UserDbSchema = object({
    id: number(),
    email: string(),
    passwordHash: string().hasColumnName('password_hash'),
    role: string(),
    createdAt: date().hasColumnName('created_at')
}).hasTableName('users');

export const TodoDbSchema = object({
    id: number(),
    title: string(),
    description: string().optional(),
    completed: boolean(),
    userId: number().hasColumnName('user_id'),
    createdAt: date().hasColumnName('created_at'),
    updatedAt: date().hasColumnName('updated_at')
}).hasTableName('todos');

export type UserDb = {
    id: number;
    email: string;
    passwordHash: string;
    role: string;
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
