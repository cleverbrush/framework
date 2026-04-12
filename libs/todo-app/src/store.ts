export interface Todo {
    id: number;
    title: string;
    completed: boolean;
    ownerId: string;
}

let nextId = 1;
export const todos = new Map<number, Todo>();

export function addTodo(title: string, ownerId: string): Todo {
    const todo: Todo = { id: nextId++, title, completed: false, ownerId };
    todos.set(todo.id, todo);
    return todo;
}

export function clearTodos(): void {
    todos.clear();
    nextId = 1;
}
