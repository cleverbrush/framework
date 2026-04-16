import type { UserResponse } from '@cleverbrush/todo-shared';
import { http } from '../lib/http-client';

export type PaginatedQuery = { page?: number; limit?: number };

export const authApi = {
    register: (body: { email: string; password: string }) =>
        http.post<UserResponse>('/api/auth/register', body),

    login: (body: { email: string; password: string }) =>
        http.post<{ token: string }>('/api/auth/login', body),

    googleLogin: (idToken: string) =>
        http.post<{ token: string }>('/api/auth/google', { idToken })
};
