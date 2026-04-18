'use client';

import { boolean, number, string } from '@cleverbrush/schema';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import { useState } from 'react';

/* ── Mirror the server/client schemas locally so we can run them in-browser ── */

const serverSchemas = {
    DATABASE_URL: string()
        .required('DATABASE_URL is required')
        .matches(
            /^(postgres|postgresql|mysql|sqlite):\/\/.+/,
            'DATABASE_URL must be a valid database connection string'
        ),
    API_SECRET: string()
        .required('API_SECRET is required')
        .minLength(32, 'API_SECRET must be at least 32 characters'),
    PORT: number()
        .min(1, 'PORT must be ≥ 1')
        .max(65535, 'PORT must be ≤ 65535'),
    LOG_LEVEL: string()
        .required('LOG_LEVEL is required')
        .matches(
            /^(debug|info|warn|error)$/,
            'LOG_LEVEL must be one of: debug, info, warn, error'
        )
} as const;

const clientSchemas = {
    NEXT_PUBLIC_API_URL: string()
        .required('NEXT_PUBLIC_API_URL is required')
        .matches(
            /^https?:\/\/.+/,
            'NEXT_PUBLIC_API_URL must be a valid http/https URL'
        ),
    NEXT_PUBLIC_ENABLE_ANALYTICS: boolean()
} as const;

const allSchemas = { ...serverSchemas, ...clientSchemas };

type EnvKey = keyof typeof allSchemas;

const defaultValues: Record<EnvKey, string> = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/mydb',
    API_SECRET: 'super-secret-signing-key-at-least-32-chars!!',
    PORT: '3000',
    LOG_LEVEL: 'info',
    NEXT_PUBLIC_API_URL: 'https://api.example.com',
    NEXT_PUBLIC_ENABLE_ANALYTICS: 'true'
};

/* ── Validate a raw string value against a schema via Standard Schema ─────── */
function validateRaw(key: EnvKey, raw: string): string | null {
    const schema = allSchemas[key];
    // Coerce PORT to number before validating
    const coerced: unknown =
        key === 'PORT'
            ? raw === ''
                ? undefined
                : Number(raw)
            : key === 'NEXT_PUBLIC_ENABLE_ANALYTICS'
              ? raw === 'true'
              : raw;
    const result = schema['~standard'].validate(coerced);
    if (result instanceof Promise) return null; // sync only in this demo
    if (!result.issues) return null;
    return result.issues[0]?.message ?? 'Invalid value';
}

/* ── Per-key row ─────────────────────────────────────────────────────────── */
function EnvRow({ envKey }: { envKey: EnvKey }) {
    const [value, setValue] = useState(defaultValues[envKey]);
    const error = validateRaw(envKey, value);
    const isClient = (envKey as string).startsWith('NEXT_PUBLIC_');
    const isBoolean = envKey === 'NEXT_PUBLIC_ENABLE_ANALYTICS';

    return (
        <div className="demo-form-row">
            <label htmlFor={`env-${envKey}`}>
                <code style={{ fontSize: '0.8rem' }}>{envKey}</code>
                <span
                    style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: isClient
                            ? 'rgba(34,211,238,0.12)'
                            : 'rgba(129,140,248,0.12)',
                        color: isClient
                            ? 'var(--accent-cyan)'
                            : 'var(--accent-indigo)',
                        fontWeight: 600
                    }}
                >
                    {isClient ? 'client' : 'server'}
                </span>
            </label>
            <div className="demo-field">
                {isBoolean ? (
                    <select
                        id={`env-${envKey}`}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.6rem 0.85rem',
                            background: 'rgba(6,8,15,0.8)',
                            border: `1px solid ${error ? '#ef4444' : 'var(--border-subtle)'}`,
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)',
                            fontSize: '0.95rem',
                            fontFamily: 'inherit',
                            outline: 'none',
                            boxSizing: 'border-box' as const
                        }}
                    >
                        <option value="true">true</option>
                        <option value="false">false</option>
                    </select>
                ) : (
                    <input
                        id={`env-${envKey}`}
                        type={envKey === 'PORT' ? 'number' : 'text'}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        className={error ? 'has-error' : ''}
                        style={{
                            fontFamily:
                                'var(--font-mono, "JetBrains Mono", monospace)'
                        }}
                    />
                )}
                {error && <span className="demo-error">{error}</span>}
                {!error && (
                    <span
                        style={{
                            display: 'block',
                            color: '#86efac',
                            fontSize: '0.78rem',
                            marginTop: '0.35rem',
                            fontWeight: 500
                        }}
                    >
                        ✓ valid
                    </span>
                )}
            </div>
        </div>
    );
}

/* ── Live validator ──────────────────────────────────────────────────────── */
function EnvValidatorDemo() {
    const keys = Object.keys(allSchemas) as EnvKey[];
    const serverKeys = keys.filter(
        k => !(k as string).startsWith('NEXT_PUBLIC_')
    );
    const clientKeys = keys.filter(k =>
        (k as string).startsWith('NEXT_PUBLIC_')
    );

    return (
        <div className="demo-form">
            <p
                style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    marginTop: 0
                }}
            >
                Edit any value to see live validation powered by{' '}
                <code>schema['~standard'].validate()</code> — the same call T3
                Env makes at startup.
            </p>

            <p
                style={{
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                }}
            >
                Server variables
            </p>
            {serverKeys.map(k => (
                <EnvRow key={k} envKey={k} />
            ))}

            <p
                style={{
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '1.25rem 0 0.5rem'
                }}
            >
                Client variables
            </p>
            {clientKeys.map(k => (
                <EnvRow key={k} envKey={k} />
            ))}
        </div>
    );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function T3EnvPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>T3 Env + Standard Schema</h1>
                    <p className="subtitle">
                        Using{' '}
                        <a
                            href="https://env.t3.gg"
                            target="_blank"
                            rel="noreferrer"
                        >
                            T3 Env
                        </a>{' '}
                        with <code>@cleverbrush/schema</code> for type-safe,
                        validated environment variables via the{' '}
                        <a
                            href="https://standardschema.dev"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Standard Schema v1
                        </a>{' '}
                        interface.
                    </p>
                </div>

                {/* ── How it works ─────────────────────────── */}
                <div className="card">
                    <h2>How it works</h2>
                    <p>
                        T3 Env accepts any <strong>Standard Schema v1</strong>{' '}
                        compliant validator in its <code>server</code> and{' '}
                        <code>client</code> objects. Every{' '}
                        <code>@cleverbrush/schema</code> builder exposes a{' '}
                        <code>{'["~standard"]'}</code> property, so schemas can
                        be passed directly — no adapter, no wrapper.
                    </p>
                    <p>
                        T3 Env calls{' '}
                        <code>schema['~standard'].validate(value)</code> for
                        each environment variable at startup. If validation
                        fails, the app crashes with a clear error listing which
                        variables are invalid — before a single request is
                        served.
                    </p>
                </div>

                {/* ── env.ts ───────────────────────────────── */}
                <div className="card">
                    <h2>
                        <code>app/env.ts</code>
                    </h2>
                    <p>
                        Drop this file in your Next.js app. Every{' '}
                        <code>@cleverbrush/schema</code> type goes straight into
                        the <code>server</code> / <code>client</code> map:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { createEnv } from '@t3-oss/env-nextjs';
import { boolean, number, string } from '@cleverbrush/schema';

export const env = createEnv({
  server: {
    DATABASE_URL: string()
      .required('DATABASE_URL is required')
      .matches(
        /^(postgres|postgresql|mysql|sqlite):\\/\\/.+/,
        'DATABASE_URL must be a valid database connection string'
      ),

    API_SECRET: string()
      .required('API_SECRET is required')
      .minLength(32, 'API_SECRET must be at least 32 characters'),

    PORT: number().min(1, 'PORT must be ≥ 1').max(65535, 'PORT must be ≤ 65535'),

    LOG_LEVEL: string()
      .required('LOG_LEVEL is required')
      .matches(
        /^(debug|info|warn|error)$/,
        'LOG_LEVEL must be one of: debug, info, warn, error'
      ),
  },

  client: {
    NEXT_PUBLIC_API_URL: string()
      .required('NEXT_PUBLIC_API_URL is required')
      .matches(/^https?:\\/\\/.+/, 'Must be a valid http/https URL'),

    NEXT_PUBLIC_ENABLE_ANALYTICS: boolean(),
  },

  runtimeEnv: {
    DATABASE_URL:              process.env.DATABASE_URL,
    API_SECRET:                process.env.API_SECRET,
    PORT:                      process.env.PORT ? Number(process.env.PORT) : undefined,
    LOG_LEVEL:                 process.env.LOG_LEVEL,
    NEXT_PUBLIC_API_URL:       process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_ENABLE_ANALYTICS:
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  },
});`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── next.config.ts note ──────────────────── */}
                <div className="card">
                    <h2>
                        <code>next.config.ts</code>
                    </h2>
                    <p>
                        When using the <code>standalone</code> output mode, add
                        the T3 Env packages to <code>transpilePackages</code> so
                        Next.js bundles them correctly:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import './app/env'; // validates at build time
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core'],
};

export default nextConfig;`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Usage ────────────────────────────────── */}
                <div className="card">
                    <h2>Usage</h2>
                    <p>
                        Import <code>env</code> anywhere in your app. TypeScript
                        infers the exact type of each variable from the schema:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// Server component or API route
import { env } from '~/app/env';

export async function GET() {
  const db = createPool(env.DATABASE_URL); // string — validated URL
  const port = env.PORT;                   // number | undefined
  return new Response('ok');
}

// Client component
import { env } from '~/app/env';

export function AnalyticsBanner() {
  if (!env.NEXT_PUBLIC_ENABLE_ANALYTICS) return null;
  return <script src={env.NEXT_PUBLIC_API_URL + '/analytics.js'} />;
}`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Live demo ────────────────────────────── */}
                <div className="card">
                    <h2>Live Validation Demo</h2>
                    <p>
                        Simulates exactly what T3 Env does at startup: passes
                        each value through{' '}
                        <code>schema['~standard'].validate()</code>. Try
                        entering invalid values to see the error messages.
                    </p>
                    <EnvValidatorDemo />
                </div>

                {/* ── Why this works ───────────────────────── */}
                <div className="card">
                    <h2>Why this works: Standard Schema interop</h2>
                    <p>
                        T3 Env checks for the presence of a{' '}
                        <code>['~standard']</code> property on each validator
                        and, if present, delegates validation to{' '}
                        <code>validator['~standard'].validate(value)</code>.
                        This is the Standard Schema v1 contract. Since every{' '}
                        <code>@cleverbrush/schema</code> builder exposes this
                        property, the integration is zero-config:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { string } from '@cleverbrush/schema';

const schema = string().required('required').minLength(8, 'too short');

// T3 Env calls this internally:
const result = schema['~standard'].validate('hi');
// result => { issues: [{ message: 'too short' }] }

const ok = schema['~standard'].validate('long enough value');
// ok => { value: 'long enough value' }

console.log(schema['~standard'].version); // => 1
console.log(schema['~standard'].vendor);  // => '@cleverbrush/schema'`)
                            }}
                        />
                    </pre>
                </div>
            </div>
        </div>
    );
}
