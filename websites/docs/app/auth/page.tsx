/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function AuthPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/auth</h1>
                    <p className="subtitle">
                        Transport-agnostic authentication and authorization for
                        TypeScript — JWT, cookies, typed principals, and fluent
                        policy composition.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <InstallBanner
                    command="npm install @cleverbrush/auth"
                    note={
                        <>
                            Zero runtime dependencies. Integrates seamlessly
                            with <code>@cleverbrush/server</code> via{' '}
                            <code>useAuthentication()</code> /{' '}
                            <code>useAuthorization()</code>.
                        </>
                    }
                />

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/auth?</h2>

                    <h3>The Problem</h3>
                    <p>
                        Authentication libraries are often tightly coupled to a
                        specific HTTP framework. Swapping frameworks means
                        rewriting auth middleware. Authorization is then bolted
                        on separately through per-route guards or decorator
                        magic.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        <code>@cleverbrush/auth</code> is{' '}
                        <strong>transport-agnostic</strong>: schemes receive a
                        plain <code>AuthenticationContext</code> (headers +
                        cookies + items map), not a raw HTTP request. The
                        resulting <code>Principal&lt;T&gt;</code> is fully typed
                        and can be used anywhere. Authorization composes through
                        a fluent <code>PolicyBuilder</code>.
                    </p>

                    <h3>Key Features</h3>
                    <ul>
                        <li>
                            <strong>JWT scheme</strong> — HS256/HS384/HS512 and
                            RS256/RS384/RS512 with configurable issuer,
                            audience, and clock tolerance.
                        </li>
                        <li>
                            <strong>Cookie scheme</strong> — delegates cookie
                            validation to your session store.
                        </li>
                        <li>
                            <strong>
                                Typed <code>Principal&lt;T&gt;</code>
                            </strong>{' '}
                            — <code>.hasRole()</code>, <code>.hasClaim()</code>,{' '}
                            <code>.isAuthenticated</code>.
                        </li>
                        <li>
                            <strong>Policy builder</strong> — compose
                            requirements with <code>.requireRole()</code> and{' '}
                            <code>.require(predicate)</code>.
                        </li>
                        <li>
                            <strong>Zero runtime dependencies</strong> — uses
                            only Node.js built-in <code>crypto</code>.
                        </li>
                    </ul>
                </div>

                {/* ── JWT ──────────────────────────────────────────── */}
                <div className="card">
                    <h2>JWT Authentication</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { jwtScheme, signJwt } from '@cleverbrush/auth';

type UserClaims = { sub: string; role: string };

// Sign a token (for testing or token issuance)
const token = signJwt(
    { sub: 'user-1', role: 'admin' },
    process.env.JWT_SECRET!
);

// Create the scheme
const scheme = jwtScheme<UserClaims>({
    secret: process.env.JWT_SECRET!,
    algorithms: ['HS256'],       // default
    issuer: 'https://my-app.com',
    audience: 'my-api',
    clockTolerance: 5,           // seconds
    mapClaims: claims => ({
        sub: claims.sub as string,
        role: claims.role as string
    })
});

// Authenticate
const result = await scheme.authenticate({
    headers: { authorization: \`Bearer \${token}\` },
    cookies: {},
    items: new Map()
});

if (result.succeeded) {
    result.principal.value?.sub;    // 'user-1'
    result.principal.hasRole('admin'); // true
}`)
                            }}
                        />
                    </pre>
                    <p>
                        Supported algorithms: <code>HS256</code>,{' '}
                        <code>HS384</code>, <code>HS512</code>,{' '}
                        <code>RS256</code>, <code>RS384</code>,{' '}
                        <code>RS512</code>.
                    </p>
                </div>

                {/* ── Cookie ───────────────────────────────────────── */}
                <div className="card">
                    <h2>Cookie Authentication</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { cookieScheme } from '@cleverbrush/auth';

type SessionData = { userId: string; role: string };

const scheme = cookieScheme<SessionData>({
    cookieName: 'session',
    validate: async (cookieValue) => {
        // Look up session from your store, verify signature, etc.
        const session = await sessionStore.get(cookieValue);
        if (!session || session.expired) return null;
        return { userId: session.userId, role: session.role };
    }
});`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Principal ────────────────────────────────────── */}
                <div className="card">
                    <h2>Principal</h2>
                    <p>
                        All schemes produce a <code>Principal&lt;T&gt;</code> —
                        an immutable value object exposing the typed claims and
                        role/claim helpers:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { Principal } from '@cleverbrush/auth';

const principal: Principal<{ sub: string; role: string }> = result.principal;

principal.isAuthenticated;         // true
principal.value?.sub;              // 'user-1'
principal.hasRole('admin');        // true
principal.hasClaim('role', 'admin'); // true

// Anonymous sentinel
const anon = Principal.anonymous();
anon.isAuthenticated; // false`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Authorization ─────────────────────────────────── */}
                <div className="card">
                    <h2>Authorization</h2>
                    <p>
                        Compose policies with <code>PolicyBuilder</code> and
                        evaluate them with <code>AuthorizationService</code>:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { PolicyBuilder, AuthorizationService, requireRole } from '@cleverbrush/auth';

// Build a policy
const adminPolicy = new PolicyBuilder()
    .requireRole('admin')
    .require(p => p.hasClaim('verified', 'true'))
    .build('admin-only');

const policies = new Map([['admin-only', adminPolicy]]);
const authz = new AuthorizationService(policies);

// Check by requirements array
const r1 = await authz.authorize(principal, [requireRole('admin')]);

// Check by named policy
const r2 = await authz.authorize(principal, 'admin-only');

if (!r2.allowed) {
    console.log(r2.reason); // 'Forbidden' | 'Not authenticated'
}`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Cookie Utils ─────────────────────────────────── */}
                <div className="card">
                    <h2>Cookie Utilities</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { parseCookies, serializeCookie } from '@cleverbrush/auth';

// Parse Cookie header
const cookies = parseCookies('session=abc123; theme=dark');
// { session: 'abc123', theme: 'dark' }

// Build Set-Cookie header value
const header = serializeCookie('session', 'token-value', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 3600  // seconds
});
// 'session=token-value; Max-Age=3600; Path=/; HttpOnly; Secure; SameSite=Lax'`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Server Integration ───────────────────────────── */}
                <div className="card">
                    <h2>Integration with @cleverbrush/server</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { createServer, endpoint } from '@cleverbrush/server';
import { jwtScheme } from '@cleverbrush/auth';
import { object, string } from '@cleverbrush/schema';

const UserPrincipal = object({ sub: string(), role: string() });

const server = createServer();

server
    .useAuthentication({
        defaultScheme: 'jwt',
        schemes: [
            jwtScheme({
                secret: process.env.JWT_SECRET!,
                mapClaims: c => ({ sub: c.sub as string, role: c.role as string })
            })
        ]
    })
    .useAuthorization()
    .handle(
        endpoint.get('/api/admin').authorize(UserPrincipal, 'admin'),
        ({ principal }) => ({ greeting: \`Hello \${principal.value?.sub}\` })
    );

await server.listen(3000);`)
                            }}
                        />
                    </pre>
                </div>
            </div>
        </div>
    );
}
