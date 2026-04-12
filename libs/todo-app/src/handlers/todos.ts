import {
    type ActionContext,
    ActionResult,
    ForbiddenError,
    NotFoundError
} from '@cleverbrush/server';
import type {
    createTodoEp,
    deleteTodoEp,
    getTodoEp,
    listTodosEp,
    updateTodoEp
} from '../endpoints.js';
import { addTodo, type Todo, todos } from '../store.js';

function assertCanAccess(
    principal: { userId: string; role: string },
    todo: Todo
): void {
    if (principal.role !== 'admin' && todo.ownerId !== principal.userId) {
        throw new ForbiddenError('You can only access your own todos');
    }
}

export function listTodos({
    principal,
    query
}: ActionContext<typeof listTodosEp>) {
    const all = [...todos.values()];
    if (principal.role === 'admin' && query.ownerId) {
        return all.filter(t => t.ownerId === query.ownerId);
    }
    if (principal.role !== 'admin') {
        return all.filter(t => t.ownerId === principal.userId);
    }
    return all;
}

export function getTodo({
    params,
    principal
}: ActionContext<typeof getTodoEp>) {
    const todo = todos.get(params.id);
    if (!todo) throw new NotFoundError(`Todo ${params.id} not found`);
    assertCanAccess(principal, todo);
    return todo;
}

export function createTodo({
    body,
    principal
}: ActionContext<typeof createTodoEp>) {
    const todo = addTodo(body.title, principal.userId);
    return ActionResult.created(todo, `/api/todos/${todo.id}`);
}

export function updateTodo({
    params,
    body,
    principal
}: ActionContext<typeof updateTodoEp>) {
    const todo = todos.get(params.id);
    if (!todo) throw new NotFoundError(`Todo ${params.id} not found`);
    assertCanAccess(principal, todo);
    if (body.title !== undefined) todo.title = body.title;
    if (body.completed !== undefined) todo.completed = body.completed;
    return todo;
}

export function deleteTodo({
    params,
    principal
}: ActionContext<typeof deleteTodoEp>) {
    const todo = todos.get(params.id);
    if (!todo) throw new NotFoundError(`Todo ${params.id} not found`);
    assertCanAccess(principal, todo);
    todos.delete(params.id);
    return ActionResult.noContent();
}
