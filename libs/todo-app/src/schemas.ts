import { array, boolean, number, object, string } from '@cleverbrush/schema';
import { route } from '@cleverbrush/server';

export const CreateTodoBody = object({
    title: string().minLength(1).maxLength(200)
});

export const UpdateTodoBody = object({
    title: string().minLength(1).maxLength(200).optional(),
    completed: boolean().optional()
});

export const TodoSchema = object({
    id: number(),
    title: string(),
    completed: boolean(),
    ownerId: string()
});

export const TodoListSchema = array(TodoSchema);

export const ById = route({ id: number().coerce() })`/${t => t.id}`;
