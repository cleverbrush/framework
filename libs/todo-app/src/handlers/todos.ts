import {
    ActionResult,
    ForbiddenError,
    type Handler,
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

export const listTodos: Handler<typeof listTodosEp> = ({
    principal,
    query
}) => {
    const all = [...todos.values()];
    if (principal.role === 'admin' && query.ownerId) {
        return all.filter(t => t.ownerId === query.ownerId);
    }
    if (principal.role !== 'admin') {
        return all.filter(t => t.ownerId === principal.userId);
    }
    return all;
};

export const getTodo: Handler<typeof getTodoEp> = ({ params, principal }) => {
    const todo = todos.get(params.id);
    if (!todo) throw new NotFoundError(`Todo ${params.id} not found`);
    assertCanAccess(principal, todo);
    return todo;
};

export const createTodo: Handler<typeof createTodoEp> = ({
    body,
    principal
}) => {
    const todo = addTodo(body.title, principal.userId);
    return ActionResult.created(todo, `/api/todos/${todo.id}`);
};

export const updateTodo: Handler<typeof updateTodoEp> = ({
    params,
    body,
    principal
}) => {
    const todo = todos.get(params.id);
    if (!todo) throw new NotFoundError(`Todo ${params.id} not found`);
    assertCanAccess(principal, todo);
    if (body.title !== undefined) todo.title = body.title;
    if (body.completed !== undefined) todo.completed = body.completed;
    return todo;
};

export const deleteTodo: Handler<typeof deleteTodoEp> = ({
    params,
    principal
}) => {
    const todo = todos.get(params.id);
    if (!todo) throw new NotFoundError(`Todo ${params.id} not found`);
    assertCanAccess(principal, todo);
    todos.delete(params.id);
    return ActionResult.noContent();
};
