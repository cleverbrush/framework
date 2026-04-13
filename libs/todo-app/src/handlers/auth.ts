import { signJwt } from '@cleverbrush/auth';
import { ActionResult, type Handler } from '@cleverbrush/server';
import { JWT_SECRET } from '../config.js';
import type { loginEp } from '../endpoints.js';

const USERS: Record<string, { password: string; name: string; role: string }> =
    {
        alice: { password: 'alice123', name: 'Alice', role: 'admin' },
        bob: { password: 'bob123', name: 'Bob', role: 'user' },
        carol: { password: 'carol123', name: 'Carol', role: 'user' }
    };

export const login: Handler<typeof loginEp> = ({
    body: { username, password }
}) => {
    const user = USERS[username];
    if (!user || user.password !== password) {
        return ActionResult.json(
            { error: 'Invalid username or password' },
            401
        );
    }
    const token = signJwt(
        { sub: username, name: user.name, role: user.role },
        JWT_SECRET
    );
    return { token };
};
