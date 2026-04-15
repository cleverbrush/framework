import { mapper } from '@cleverbrush/mapper';
import { boolean, date, number, object, string } from '@cleverbrush/schema';
import type { TodoDb, UserDb } from '../db/schemas.js';
import { TodoResponseSchema, UserResponseSchema } from './schemas.js';

/**
 * Plain (non-extended) schemas that mirror DB row shapes.
 * The mapper package expects ObjectSchemaBuilder from @cleverbrush/schema;
 * the DB schemas from @cleverbrush/knex-schema carry extra extensions that
 * make them type-incompatible with the mapper's configure() overload.
 */
const UserRowSchema = object({
    id: number(),
    email: string(),
    passwordHash: string(),
    role: string(),
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

/**
 * Central mapper registry for converting DB rows to API responses.
 *
 * UserRowSchema → UserResponseSchema  (strips passwordHash, converts dates to ISO strings)
 * TodoRowSchema → TodoResponseSchema  (converts dates to ISO strings)
 */
export const mappingRegistry = mapper()
    .configure(UserRowSchema, UserResponseSchema, m =>
        m.for(t => t.createdAt).compute(f => f.createdAt.toISOString())
    )
    .configure(TodoRowSchema, TodoResponseSchema, m =>
        m
            .for(t => t.description)
            .compute(f => f.description ?? undefined)
            .for(t => t.createdAt)
            .compute(f => f.createdAt.toISOString())
            .for(t => t.updatedAt)
            .compute(f => f.updatedAt.toISOString())
    );

const _mapUserFn = mappingRegistry.getMapper(UserRowSchema, UserResponseSchema);
const _mapTodoFn = mappingRegistry.getMapper(TodoRowSchema, TodoResponseSchema);

/** Map a DB user row to a public API response (strips passwordHash). */
export const mapUser = (row: UserDb) => _mapUserFn(row as any);

/** Map a DB todo row to a public API response. */
export const mapTodo = (row: TodoDb) => _mapTodoFn(row as any);
