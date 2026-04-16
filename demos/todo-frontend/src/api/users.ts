import type { UserResponse } from '@cleverbrush/todo-shared';
import { http } from '../lib/http-client';

export function me() {
    return http.get<UserResponse>('/api/users/me');
}

export function list(page = 1, limit = 20) {
    return http.get<UserResponse[]>('/api/users', { query: { page, limit } });
}

export function deleteUser(id: number | string) {
    return http.delete<void>(`/api/users/${id}`);
}
