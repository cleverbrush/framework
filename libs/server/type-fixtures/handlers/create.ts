import { ActionResult, type Handler } from '@cleverbrush/server';
import type { items } from '../scope.js';

export const create: Handler<typeof items.endpoints.create> = (
    { body },
    { db, mailer }
) =>
    ActionResult.created({
        id: 1,
        title: `${body.title}:${db.name}:${mailer.host}`
    });
