import pg from 'pg';
import { config } from './env.js';

let pool: pg.Pool | null = null;

/**
 * Lazy-initialised connection pool to the dockerized Postgres instance.
 * The pool is shared across the test process and closed on exit.
 */
export function getPool(): pg.Pool {
    if (!pool) {
        pool = new pg.Pool({ ...config.postgres, max: 4 });
    }
    return pool;
}

export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

/** Convenience: run a parameterised query and return its rows. */
export async function query<T = any>(
    sql: string,
    params: unknown[] = []
): Promise<T[]> {
    const res = await getPool().query(sql, params);
    return res.rows as T[];
}

export interface UserRow {
    id: number;
    email: string;
    role: string;
    auth_provider: string;
    created_at: Date;
}

export interface TodoRow {
    id: number;
    title: string;
    description: string | null;
    completed: boolean;
    user_id: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
    const rows = await query<UserRow>(
        'SELECT id, email, role, auth_provider, created_at FROM users WHERE email = $1',
        [email]
    );
    return rows[0] ?? null;
}

export async function getTodoById(id: number): Promise<TodoRow | null> {
    const rows = await query<TodoRow>(
        'SELECT id, title, description, completed, user_id, created_at, updated_at, deleted_at FROM todos WHERE id = $1',
        [id]
    );
    return rows[0] ?? null;
}

/**
 * Promote an existing user to admin role. Used by tests that need an
 * admin without going through a separate registration flow.
 */
export async function promoteToAdmin(userId: number): Promise<void> {
    await query("UPDATE users SET role = 'admin' WHERE id = $1", [userId]);
}
