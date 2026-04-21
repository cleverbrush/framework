import { mapper } from '@cleverbrush/mapper';
import { boolean, date, number, object, string } from '@cleverbrush/schema';
import type { TodoDb, UserDb } from '../db/schemas.js';
import { TodoResponseSchema, UserResponseSchema } from './schemas.js';

const UserRowSchema = object({
    id: number(),
    email: string(),
    passwordHash: string().optional(),
    role: string(),
    authProvider: string(),
    createdAt: date()
});

const TodoRowSchema = object({
    id: number(),
    title: string(),
    description: string().optional(),
    completed: boolean(),
    userId: number(),
    createdAt: date(),
    updatedAt: date()
});

export const mappingRegistry = mapper()
    .configure(UserRowSchema, UserResponseSchema, m =>
        m.for(t => t.authProvider).compute(f => f.authProvider)
    )
    .configure(TodoRowSchema, TodoResponseSchema, m =>
        m.for(t => t.description).compute(f => f.description ?? undefined)
    );

const _mapUserFn = mappingRegistry.getMapper(UserRowSchema, UserResponseSchema);
const _mapTodoFn = mappingRegistry.getMapper(TodoRowSchema, TodoResponseSchema);

export const mapUser = (row: UserDb) => _mapUserFn(row);
export const mapTodo = (row: TodoDb) => _mapTodoFn(row);
