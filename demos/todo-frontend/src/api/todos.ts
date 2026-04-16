import type {
    TodoEvent,
    TodoResponse,
    UserResponse
} from '@cleverbrush/todo-shared';
import { http } from '../lib/http-client';

export type PaginatedQuery = {
    page?: number;
    limit?: number;
};

export type TodoListQuery = PaginatedQuery & {
    userId?: number;
};

export const todosApi = {
    list: (query?: TodoListQuery) =>
        http.get<TodoResponse[]>('/api/todos', { query }),

    get: (id: number) => http.get<TodoResponse>(`/api/todos/${id}`),

    getWithAuthor: (id: number) =>
        http.get<{ todo: TodoResponse; author: UserResponse }>(
            `/api/todos/${id}/with-author`
        ),

    create: (body: { title: string; description?: string }) =>
        http.post<TodoResponse>('/api/todos', body),

    update: (id: number, body: { title?: string; description?: string; completed?: boolean }) =>
        http.patch<TodoResponse>(`/api/todos/${id}`, body),

    delete: (id: number) => http.delete<void>(`/api/todos/${id}`),

    complete: (id: number, etag?: string) =>
        http.post<TodoResponse>(`/api/todos/${id}/complete`, undefined, {
            headers: etag ? { 'if-match': etag } : {}
        }),

    sendEvent: (id: number, event: TodoEvent) =>
        http.post<TodoEvent>(`/api/todos/${id}/events`, event),

    exportCsv: async () => {
        const token = localStorage.getItem('auth_token');
        const resp = await fetch('/api/todos/export', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!resp.ok) throw new Error('Export failed');
        const totalCount = resp.headers.get('x-total-count');
        const blob = await resp.blob();
        return { blob, totalCount: totalCount ? Number(totalCount) : 0 };
    },

    downloadAttachment: async (id: number) => {
        const token = localStorage.getItem('auth_token');
        const resp = await fetch(`/api/todos/${id}/attachment`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!resp.ok) throw new Error('Download failed');
        return resp.blob();
    },

    import: (items: { title: string; description?: string }[], idempotencyKey?: string) =>
        http.post<{ imported: number; total: number; items: { title: string; success: boolean; error?: string }[] }>(
            '/api/todos/import',
            { items },
            { headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {} }
        )
};
