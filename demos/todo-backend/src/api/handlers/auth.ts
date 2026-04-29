import {
    scrypt as _scrypt,
    randomBytes,
    type ScryptOptions,
    timingSafeEqual
} from 'node:crypto';
import { signJwt } from '@cleverbrush/auth';
import { ActionResult, type Handler } from '@cleverbrush/server';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config.js';
import type {
    GoogleLoginEndpoint,
    LoginEndpoint,
    RegisterEndpoint
} from '../endpoints.js';
import { mapUser } from '../mappers.js';

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS: ScryptOptions = { N: 16384, r: 8, p: 1 };

function scryptAsync(
    password: string,
    salt: string,
    keylen: number,
    options: ScryptOptions
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        _scrypt(password, salt, keylen, options, (err, derived) => {
            if (err) reject(err);
            else resolve(derived);
        });
    });
}

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = await scryptAsync(
        password,
        salt,
        SCRYPT_KEYLEN,
        SCRYPT_PARAMS
    );
    return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(
    password: string,
    stored: string
): Promise<boolean> {
    const [salt, hashHex] = stored.split(':');
    if (!salt || !hashHex) return false;
    const stored_buf = Buffer.from(hashHex, 'hex');
    const derived = await scryptAsync(
        password,
        salt,
        SCRYPT_KEYLEN,
        SCRYPT_PARAMS
    );
    if (derived.length !== stored_buf.length) return false;
    return timingSafeEqual(derived, stored_buf);
}

function issueToken(userId: number, role: string): string {
    const exp = Math.floor(Date.now() / 1000) + config.jwt.expiresInSeconds;
    return signJwt({ sub: String(userId), role, exp }, config.jwt.secret);
}

// ── Register ─────────────────────────────────────────────────────────────────

export const registerHandler: Handler<typeof RegisterEndpoint> = async (
    { body },
    { db }
) => {
    const existing = await db.users
        .projected('public')
        .where(t => t.email, body.email)
        .first();
    if (existing) {
        return ActionResult.badRequest({
            message: 'Email is already registered.'
        });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await db.users.insert({
        email: body.email,
        passwordHash,
        role: 'user',
        authProvider: 'local'
    });

    return ActionResult.created(await mapUser(user), `/api/users/${user.id}`);
};

// ── Login ─────────────────────────────────────────────────────────────────────

export const loginHandler: Handler<typeof LoginEndpoint> = async (
    { body },
    { db }
) => {
    const user = await db.users
        .projected('auth')
        .where(t => t.email, body.email)
        .first();

    if (!user?.passwordHash) {
        return ActionResult.unauthorized({
            message: 'Invalid email or password.'
        });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
        return ActionResult.unauthorized({
            message: 'Invalid email or password.'
        });
    }

    return { token: issueToken(user.id, user.role) };
};

// ── Google Login ─────────────────────────────────────────────────────────────

export const googleLoginHandler: Handler<typeof GoogleLoginEndpoint> = async (
    { body },
    { db }
) => {
    const clientId = config.google.clientId;
    if (!clientId) {
        return ActionResult.badRequest({
            message: 'Google authentication is not configured on this server.'
        });
    }

    let email: string | undefined;

    // Try verifying as an ID token first, fall back to access token
    const client = new OAuth2Client(clientId);
    try {
        const ticket = await client.verifyIdToken({
            idToken: body.idToken,
            audience: clientId
        });
        email = ticket.getPayload()?.email;
    } catch {
        // Not a valid ID token — treat as an access token and fetch user info
        try {
            const res = await fetch(
                `https://www.googleapis.com/oauth2/v3/userinfo`,
                { headers: { Authorization: `Bearer ${body.idToken}` } }
            );
            if (!res.ok) {
                return ActionResult.unauthorized({
                    message: 'Invalid Google token.'
                });
            }
            const info = (await res.json()) as { email?: string };
            email = info.email;
        } catch {
            return ActionResult.unauthorized({
                message: 'Invalid Google token.'
            });
        }
    }

    if (!email) {
        return ActionResult.unauthorized({
            message: 'Google token does not contain an email address.'
        });
    }

    // Find or auto-provision user
    const foundUser = await db.users
        .projected('public')
        .where(t => t.email, email)
        .first();
    const user =
        foundUser ??
        (await db.users.insert({
            email,
            passwordHash: undefined,
            role: 'user',
            authProvider: 'google'
        }));

    return { token: issueToken(user.id, user.role) };
};
