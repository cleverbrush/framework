const BASE_URL = import.meta.env.VITE_API_URL ?? '';

let _token: string | null = null;

export function setToken(token: string | null) {
    _token = token;
    if (token) {
        localStorage.setItem('auth_token', token);
    } else {
        localStorage.removeItem('auth_token');
    }
}

export function loadToken(): string | null {
    _token = localStorage.getItem('auth_token');
    return _token;
}

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function request<T>(
    method: string,
    path: string,
    options: {
        body?: unknown;
        query?: Record<string, string | number | boolean | undefined | null>;
        headers?: Record<string, string>;
        signal?: AbortSignal;
    } = {}
): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`, window.location.origin);

    if (options.query) {
        for (const [key, value] of Object.entries(options.query)) {
            if (value != null) {
                url.searchParams.set(key, String(value));
            }
        }
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (_token) {
        headers['Authorization'] = `Bearer ${_token}`;
    }

    const response = await fetch(url.toString(), {
        method,
        headers,
        body: options.body != null ? JSON.stringify(options.body) : undefined,
        signal: options.signal
    });

    if (response.status === 401) {
        setToken(null);
        window.location.href = '/login';
        throw new ApiError(401, 'Unauthorized');
    }

    if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
            const err = await response.json();
            if (err?.message) message = err.message;
        } catch {
            // ignore
        }
        throw new ApiError(response.status, message);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
        return response.json() as Promise<T>;
    }

    return response.text() as unknown as Promise<T>;
}

export const http = {
    get: <T>(path: string, options?: Parameters<typeof request>[2]) =>
        request<T>('GET', path, options),
    post: <T>(path: string, body?: unknown, options?: Omit<Parameters<typeof request>[2], 'body'>) =>
        request<T>('POST', path, { ...options, body }),
    patch: <T>(path: string, body?: unknown, options?: Omit<Parameters<typeof request>[2], 'body'>) =>
        request<T>('PATCH', path, { ...options, body }),
    put: <T>(path: string, body?: unknown, options?: Omit<Parameters<typeof request>[2], 'body'>) =>
        request<T>('PUT', path, { ...options, body }),
    delete: <T>(path: string, options?: Parameters<typeof request>[2]) =>
        request<T>('DELETE', path, options)
};
