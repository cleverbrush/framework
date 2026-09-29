import type { Handler } from '@cleverbrush/server';
import type { items } from '../scope.js';

export const list: Handler<typeof items.endpoints.list> = async (
    { principal, query },
    { db }
) => [{ id: 1, title: `${principal.userId}:${query.search}:${db.name}` }];
