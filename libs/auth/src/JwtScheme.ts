import * as crypto from 'node:crypto';
import type {
    AuthenticationContext,
    AuthenticationResult,
    AuthenticationScheme
} from './AuthenticationScheme.js';
import { Principal } from './Principal.js';

// ---------------------------------------------------------------------------
// JWT Types
// ---------------------------------------------------------------------------

export interface JwtHeader {
    alg: string;
    typ?: string;
}

export interface JwtPayload {
    [key: string]: unknown;
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    nbf?: number;
    iat?: number;
    jti?: string;
}

// ---------------------------------------------------------------------------
// JWT Scheme Config
// ---------------------------------------------------------------------------

export interface JwtSchemeOptions<T> {
    /** HMAC secret (for HS256/HS384/HS512) or PEM public key (for RS256/RS384/RS512). */
    secret: string | Buffer;
    /** Map raw JWT claims to the typed principal value. */
    mapClaims: (claims: JwtPayload) => T;
    /** Allowed algorithms (default: ['HS256']). */
    algorithms?: string[];
    /** Expected issuer — if set, `iss` must match. */
    issuer?: string;
    /** Expected audience — if set, `aud` must include it. */
    audience?: string;
    /** Clock tolerance in seconds for exp/nbf checks (default: 0). */
    clockTolerance?: number;
    /** Custom scheme name (default: 'jwt'). */
    name?: string;
    /** Claim key used for roles (default: 'role'). */
    roleClaim?: string;
}

// ---------------------------------------------------------------------------
// Base64url helpers
// ---------------------------------------------------------------------------

function base64urlDecode(input: string): Buffer {
    // Restore standard base64 padding
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad === 2) base64 += '==';
    else if (pad === 3) base64 += '=';
    return Buffer.from(base64, 'base64');
}

// ---------------------------------------------------------------------------
// Algorithm mapping
// ---------------------------------------------------------------------------

const HMAC_ALGOS: Record<string, string> = {
    HS256: 'sha256',
    HS384: 'sha384',
    HS512: 'sha512'
};

const RSA_ALGOS: Record<string, string> = {
    RS256: 'sha256',
    RS384: 'sha384',
    RS512: 'sha512'
};

// ---------------------------------------------------------------------------
// JWT verification
// ---------------------------------------------------------------------------

function verifySignature(
    headerB64: string,
    payloadB64: string,
    signatureB64: string,
    alg: string,
    secret: string | Buffer
): boolean {
    const data = `${headerB64}.${payloadB64}`;
    const signatureBytes = base64urlDecode(signatureB64);

    const hmacHash = HMAC_ALGOS[alg];
    if (hmacHash) {
        const expected = crypto
            .createHmac(hmacHash, secret)
            .update(data)
            .digest();
        return crypto.timingSafeEqual(expected, signatureBytes);
    }

    const rsaHash = RSA_ALGOS[alg];
    if (rsaHash) {
        return crypto
            .createVerify(rsaHash)
            .update(data)
            .verify(
                typeof secret === 'string' ? secret : { key: secret },
                signatureBytes
            );
    }

    return false;
}

function decodeJwt(
    token: string,
    secret: string | Buffer,
    allowedAlgorithms: string[],
    issuer?: string,
    audience?: string,
    clockTolerance = 0
): { header: JwtHeader; payload: JwtPayload } | { error: string } {
    const parts = token.split('.');
    if (parts.length !== 3) {
        return { error: 'Malformed JWT: expected 3 segments' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    let header: JwtHeader;
    try {
        header = JSON.parse(base64urlDecode(headerB64).toString('utf-8'));
    } catch {
        return { error: 'Malformed JWT header' };
    }

    if (!allowedAlgorithms.includes(header.alg)) {
        return { error: `Unsupported algorithm: ${header.alg}` };
    }

    if (
        !verifySignature(
            headerB64,
            payloadB64,
            signatureB64,
            header.alg,
            secret
        )
    ) {
        return { error: 'Invalid signature' };
    }

    let payload: JwtPayload;
    try {
        payload = JSON.parse(base64urlDecode(payloadB64).toString('utf-8'));
    } catch {
        return { error: 'Malformed JWT payload' };
    }

    const now = Math.floor(Date.now() / 1000);

    if (payload.exp !== undefined && now > payload.exp + clockTolerance) {
        return { error: 'Token expired' };
    }

    if (payload.nbf !== undefined && now < payload.nbf - clockTolerance) {
        return { error: 'Token not yet valid' };
    }

    if (issuer !== undefined && payload.iss !== issuer) {
        return { error: `Invalid issuer: expected "${issuer}"` };
    }

    if (audience !== undefined) {
        const aud = payload.aud;
        const audArray = Array.isArray(aud) ? aud : aud ? [aud] : [];
        if (!audArray.includes(audience)) {
            return { error: `Invalid audience: expected "${audience}"` };
        }
    }

    return { header, payload };
}

// ---------------------------------------------------------------------------
// JWT Authentication Scheme
// ---------------------------------------------------------------------------

class JwtAuthenticationScheme<T> implements AuthenticationScheme<T> {
    readonly name: string;
    readonly #options: JwtSchemeOptions<T>;
    readonly #algorithms: string[];

    constructor(options: JwtSchemeOptions<T>) {
        this.name = options.name ?? 'jwt';
        this.#options = options;
        this.#algorithms = options.algorithms ?? ['HS256'];
    }

    async authenticate(
        context: AuthenticationContext
    ): Promise<AuthenticationResult<T>> {
        const authHeader = context.headers['authorization'];
        if (!authHeader) {
            return {
                succeeded: false,
                failure: 'Missing Authorization header'
            };
        }

        if (!authHeader.startsWith('Bearer ')) {
            return {
                succeeded: false,
                failure: 'Authorization header must use Bearer scheme'
            };
        }

        const token = authHeader.slice(7).trim();
        if (!token) {
            return { succeeded: false, failure: 'Empty Bearer token' };
        }

        const result = decodeJwt(
            token,
            this.#options.secret,
            this.#algorithms,
            this.#options.issuer,
            this.#options.audience,
            this.#options.clockTolerance
        );

        if ('error' in result) {
            return { succeeded: false, failure: result.error };
        }

        const value = this.#options.mapClaims(result.payload);

        // Build claims map from JWT payload
        const claims = new Map<string, string | string[]>();
        for (const [key, val] of Object.entries(result.payload)) {
            if (typeof val === 'string') {
                claims.set(key, val);
            } else if (
                Array.isArray(val) &&
                val.every(v => typeof v === 'string')
            ) {
                claims.set(key, val);
            }
        }

        const principal = new Principal(true, value, claims);
        return { succeeded: true, principal };
    }

    challenge(): { headerName: string; headerValue: string } {
        return {
            headerName: 'WWW-Authenticate',
            headerValue: 'Bearer'
        };
    }
}

/**
 * Create a JWT authentication scheme.
 */
export function jwtScheme<T>(
    options: JwtSchemeOptions<T>
): AuthenticationScheme<T> {
    return new JwtAuthenticationScheme(options);
}

// ---------------------------------------------------------------------------
// JWT signing (utility for tests / token generation)
// ---------------------------------------------------------------------------

function base64urlEncode(data: Buffer): string {
    return data
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Sign a JWT payload. Utility for tests and token generation.
 * Supports HS256/HS384/HS512 (HMAC) and RS256/RS384/RS512 (RSA).
 */
export function signJwt(
    payload: JwtPayload,
    secret: string | Buffer,
    algorithm = 'HS256'
): string {
    const header: JwtHeader = { alg: algorithm, typ: 'JWT' };

    const headerB64 = base64urlEncode(
        Buffer.from(JSON.stringify(header), 'utf-8')
    );
    const payloadB64 = base64urlEncode(
        Buffer.from(JSON.stringify(payload), 'utf-8')
    );

    const data = `${headerB64}.${payloadB64}`;

    let signature: Buffer;

    const hmacHash = HMAC_ALGOS[algorithm];
    if (hmacHash) {
        signature = crypto.createHmac(hmacHash, secret).update(data).digest();
    } else {
        const rsaHash = RSA_ALGOS[algorithm];
        if (!rsaHash) {
            throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
        signature = crypto
            .createSign(rsaHash)
            .update(data)
            .sign(typeof secret === 'string' ? secret : { key: secret });
    }

    return `${data}.${base64urlEncode(signature)}`;
}
