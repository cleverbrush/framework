import { ActionResult, type Handler } from '@cleverbrush/server';
import { UserDbSchema } from '../../db/schemas.js';
import type {
    DeleteUserEndpoint,
    GetMyProfileEndpoint,
    ListUsersEndpoint
} from '../endpoints.js';
import { mapUser } from '../mappers.js';

// ── List users (admin only) ───────────────────────────────────────────────────

export const listUsersHandler: Handler<typeof ListUsersEndpoint> = async (
    { query },
    { db }
) => {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.limit ?? 20));

    const rows = await db(UserDbSchema)
        .projected('public')
        .orderBy(t => t.createdAt, 'desc')
        .paginate({ page, pageSize });

    return Promise.all(rows.data.map(mapUser));
};

// ── Delete user (admin only) ──────────────────────────────────────────────────

export const deleteUserHandler: Handler<typeof DeleteUserEndpoint> = async (
    { params, principal },
    { db }
) => {
    // Prevent self-deletion to keep at least one admin accessible
    if (params.id === principal.userId) {
        return ActionResult.badRequest({
            message: 'You cannot delete your own account.'
        });
    }

    const user = await db(UserDbSchema)
        .projected('public')
        .where(t => t.id, params.id)
        .first();

    if (!user) {
        return ActionResult.notFound({
            message: `User ${params.id} not found.`
        });
    }

    await db(UserDbSchema)
        .where(t => t.id, params.id)
        .delete();

    return ActionResult.noContent();
};

// ── Get current user profile ──────────────────────────────────────────────────

export const getMyProfileHandler: Handler<typeof GetMyProfileEndpoint> = async (
    { principal },
    { db }
) => {
    const user = await db(UserDbSchema)
        .projected('public')
        .where(t => t.id, principal.userId)
        .first();

    if (!user) {
        return ActionResult.notFound({
            message: 'User not found.'
        });
    }

    return mapUser(user);
};
