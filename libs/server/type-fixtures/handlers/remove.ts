import { ActionResult, type Handler } from '@cleverbrush/server';
import type { items } from '../scope.js';

export const remove: Handler<typeof items.endpoints.remove> = ({ params }) => {
    if (params.id < 0) throw new Error('Not a persisted item');
    return ActionResult.noContent();
};
