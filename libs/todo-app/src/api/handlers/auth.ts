import {
    scrypt as _scrypt,
    randomBytes,
    type ScryptOptions,
    timingSafeEqual
} from 'node:crypto';
import { signJwt } from '@cleverbrush/auth';
import { ActionResult, type Handler } from '@cleverbrush/server';
import { config } from '../../config.js';
import { UserDbSchema } from '../../db/schemas.js';
import type { LoginEndpoint, RegisterEndpoint } from '../endpoints.js';
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

// ── Register ─────────────────────────────────────────────────────────────────

export const registerHandler: Handler<typeof RegisterEndpoint> = async (
    { body },
    { db }
) => {
    // Check for duplicate email
    const existing = await db(UserDbSchema)
        .where(t => t.email, body.email)
        .first();

    if (existing) {
        return ActionResult.badRequest({
            message: 'Email is already registered.'
        });
    }

    const passwordHash = await hashPassword(body.password);

    const user = await db(UserDbSchema).insert({
        email: body.email,
        passwordHash,
        role: 'user',
        createdAt: new Date()
    });

    return ActionResult.created(await mapUser(user), `/api/users/${user.id}`);
};

// ── Login ─────────────────────────────────────────────────────────────────────

export const loginHandler: Handler<typeof LoginEndpoint> = async (
    { body },
    { db }
) => {
    const user = await db(UserDbSchema)
        .where(t => t.email, body.email)
        .first();

    if (!user) {
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

    const token = signJwt(
        {
            sub: String(user.id),
            role: user.role,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + config.jwt.expiresInSeconds
        },
        config.jwt.secret,
        'HS256'
    );

    return ActionResult.ok({ token });
};
