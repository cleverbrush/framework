import { type ActionContext, ActionResult } from '@cleverbrush/server';
import type { deleteAllTodosEp, listUsersEp } from '../endpoints.js';
import { clearTodos, todos } from '../store.js';

export function deleteAllTodos(_ctx: ActionContext<typeof deleteAllTodosEp>) {
    clearTodos();
    return ActionResult.noContent();
}

export function listUsers(_ctx: ActionContext<typeof listUsersEp>) {
    const owners = new Set<string>();
    for (const t of todos.values()) owners.add(t.ownerId);
    return [...owners];
}
