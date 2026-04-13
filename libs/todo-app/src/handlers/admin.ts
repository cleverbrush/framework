import { ActionResult, type Handler } from '@cleverbrush/server';
import type { deleteAllTodosEp, listUsersEp } from '../endpoints.js';
import { clearTodos, todos } from '../store.js';

export const deleteAllTodos: Handler<typeof deleteAllTodosEp> = () => {
    clearTodos();
    return ActionResult.noContent();
};

export const listUsers: Handler<typeof listUsersEp> = () => {
    const owners = new Set<string>();
    for (const t of todos.values()) owners.add(t.ownerId);
    return [...owners];
};
