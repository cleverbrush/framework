import { json, request } from './http.js';
import { uniqueEmail } from './ids.js';
import { promoteToAdmin } from './db.js';

export interface AuthedUser {
    id: number;
    email: string;
    password: string;
    token: string;
    role: 'user' | 'admin';
}

/**
 * Register a new user via the backend HTTP API and log them in to obtain
 * a JWT.  Optionally promotes the user to admin via direct SQL UPDATE
 * (the API has no "create admin" endpoint by design).
 */
export async function createUser(
    options: {
        suite?: string;
        role?: 'user' | 'admin';
        password?: string;
    } = {}
): Promise<AuthedUser> {
    const email = uniqueEmail(options.suite ?? 'e2e');
    const password = options.password ?? 'TestPass123!';

    const registerRes = await request('POST', '/api/auth/register', {
        body: { email, password }
    });
    if (registerRes.status !== 201) {
        throw new Error(
            `Failed to register ${email}: HTTP ${registerRes.status} ${registerRes.body}`
        );
    }
    const user = json<{ id: number }>(registerRes);

    if (options.role === 'admin') {
        await promoteToAdmin(user.id);
    }

    const loginRes = await request('POST', '/api/auth/login', {
        body: { email, password }
    });
    if (loginRes.status !== 200) {
        throw new Error(
            `Failed to log in ${email}: HTTP ${loginRes.status} ${loginRes.body}`
        );
    }
    const { token } = json<{ token: string }>(loginRes);

    return {
        id: user.id,
        email,
        password,
        token,
        role: options.role ?? 'user'
    };
}

/** Convenience: shortcut for `request(...)` with token attached. */
export function authedRequest(token: string) {
    return (
        method: string,
        urlPath: string,
        options: Parameters<typeof request>[2] = {}
    ) => request(method, urlPath, { ...options, token });
}
