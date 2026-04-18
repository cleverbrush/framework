/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: needed to show examples */
import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function EnvPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/env</h1>
                    <p className="subtitle">
                        Type-safe environment variable parsing — validated,
                        coerced, structured configs from process.env.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <InstallBanner
                    command="npm install @cleverbrush/env @cleverbrush/schema"
                    note={
                        <>
                            Requires <code>@cleverbrush/schema</code> as a peer
                            dependency.
                        </>
                    }
                />

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/env?</h2>

                    <h3>The Problem</h3>
                    <p>
                        Environment variables are untyped strings. Most apps
                        access them via <code>process.env.SOME_VAR!</code> — no
                        validation, no coercion, no structure. Missing variables
                        surface as runtime crashes. Secrets accidentally leak
                        into frontend bundles. Config objects are ad-hoc and
                        fragile.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        <code>@cleverbrush/env</code> uses{' '}
                        <code>@cleverbrush/schema</code> builders for validation
                        and coercion, and a branded <code>env()</code> wrapper
                        for type-safe variable binding. TypeScript enforces at{' '}
                        <strong>compile time</strong> that every config leaf is
                        bound to an environment variable. At runtime, all
                        variables are validated at once — with clear error
                        messages for CI and startup logs.
                    </p>

                    <h3>Key Features</h3>
                    <ul>
                        <li>
                            <strong>Compile-time enforcement</strong> —
                            forgetting <code>env()</code> on a config leaf is a
                            TypeScript error
                        </li>
                        <li>
                            <strong>Nested configs</strong> — nest objects
                            arbitrarily deep; env vars map to leaf fields
                        </li>
                        <li>
                            <strong>Full schema power</strong> —{' '}
                            <code>.minLength()</code>, <code>.coerce()</code>,{' '}
                            <code>.default()</code>, custom validators
                        </li>
                        <li>
                            <strong>Array support</strong> —{' '}
                            <code>splitBy(',')</code> preprocessor for
                            comma-separated values
                        </li>
                        <li>
                            <strong>Computed values</strong> — derive values
                            from resolved config via a type-safe callback,
                            deep-merged into the result
                        </li>
                        <li>
                            <strong>All-at-once errors</strong> — lists every
                            missing and invalid variable in one message
                        </li>
                    </ul>
                </div>

                {/* ── Quick Start ──────────────────────────────────── */}
                <div className="card">
                    <h2>Quick Start — Structured Config</h2>
                    <p>
                        Define a nested config tree where every leaf is bound to
                        an env var with <code>env()</code>. Types are inferred
                        automatically:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { env, parseEnv, splitBy } from '@cleverbrush/env';
import { string, number, boolean, array } from '@cleverbrush/schema';

const config = parseEnv({
  db: {
    host: env('DB_HOST', string().default('localhost')),
    port: env('DB_PORT', number().coerce().default(5432)),
    name: env('DB_NAME', string()),
  },
  jwt: {
    secret: env('JWT_SECRET', string().minLength(32)),
  },
  debug: env('DEBUG', boolean().coerce().default(false)),
  allowedOrigins: env(
    'ALLOWED_ORIGINS',
    array(string()).addPreprocessor(splitBy(','), { mutates: false })
  ),
});

// Inferred type:
// {
//   db: { host: string, port: number, name: string },
//   jwt: { secret: string },
//   debug: boolean,
//   allowedOrigins: string[]
// }

config.db.host      // string
config.db.port      // number (coerced from string)
config.debug        // boolean (coerced from "true"/"false")
config.allowedOrigins // string[] (split from "a,b,c")`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Type Enforcement ─────────────────────────────── */}
                <div className="card">
                    <h2>Compile-Time Enforcement</h2>
                    <p>
                        The <code>parseEnv()</code> function only accepts config
                        trees where every leaf is an <code>EnvField</code>{' '}
                        (created by <code>env()</code>). Passing a bare schema
                        builder is a TypeScript error:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// ✗ Compile error — forgot env()
parseEnv({
  db: {
    host: string(),
    //    ^^^^^^^^ Type 'StringSchemaBuilder' is not
    //             assignable to type 'EnvConfigNode'
  },
});

// ✓ Correct — every leaf wrapped with env()
parseEnv({
  db: {
    host: env('DB_HOST', string()),
  },
});`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Flat Mode ────────────────────────────────────── */}
                <div className="card">
                    <h2>Flat Mode</h2>
                    <p>
                        For simple apps where each config key is also the env
                        var name, use <code>parseEnvFlat()</code> — no{' '}
                        <code>env()</code> wrapper needed:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { parseEnvFlat } from '@cleverbrush/env';
import { string, number } from '@cleverbrush/schema';

const config = parseEnvFlat({
  DB_HOST: string().default('localhost'),
  DB_PORT: number().coerce().default(5432),
  JWT_SECRET: string().minLength(32),
});
// Type: { DB_HOST: string, DB_PORT: number, JWT_SECRET: string }`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Arrays ───────────────────────────────────────── */}
                <div className="card">
                    <h2>Array Support</h2>
                    <p>
                        Use the <code>splitBy()</code> preprocessor to parse
                        delimited strings into arrays:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { env, splitBy } from '@cleverbrush/env';
import { array, string, number } from '@cleverbrush/schema';

// Comma-separated strings → string[]
env('ORIGINS', array(string()).addPreprocessor(splitBy(','), { mutates: false }))
// "https://a.com, https://b.com" → ['https://a.com', 'https://b.com']

// Comma-separated numbers → number[] (coerced per element)
env('PORTS', array(number().coerce()).addPreprocessor(splitBy(','), { mutates: false }))
// "3000, 4000, 5000" → [3000, 4000, 5000]`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Computed Values ──────────────────────────────── */}
                <div className="card">
                    <h2>Computed Values</h2>
                    <p>
                        Derive values from the resolved config by passing a
                        compute callback as the second argument. The callback
                        receives the fully typed base config and returns an
                        object that is <strong>deep-merged</strong> into the
                        result:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { env, parseEnv } from '@cleverbrush/env';
import { string, number } from '@cleverbrush/schema';

const config = parseEnv(
  {
    db: {
      host: env('DB_HOST', string().default('localhost')),
      port: env('DB_PORT', number().coerce().default(5432)),
      name: env('DB_NAME', string()),
    },
  },
  (base) => ({
    db: {
      connectionString: \`postgres://\${base.db.host}:\${base.db.port}/\${base.db.name}\`,
    },
  })
);

// base is fully typed: { db: { host: string, port: number, name: string } }
// Result: { db: { host, port, name, connectionString } }
config.db.connectionString // "postgres://localhost:5432/mydb"`)
                            }}
                        />
                    </pre>
                    <p>
                        When using a compute callback, the optional source is
                        passed as the third argument:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const config = parseEnv(
  { host: env('HOST', string()) },
  (base) => ({ url: \`http://\${base.host}\` }),
  { HOST: 'example.com' }  // custom source
);`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Error Reporting ──────────────────────────────── */}
                <div className="card">
                    <h2>Error Reporting</h2>
                    <p>
                        When variables are missing or invalid,{' '}
                        <code>parseEnv()</code> throws an{' '}
                        <code>EnvValidationError</code> with a formatted message
                        listing every problem at once:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`try {
  const config = parseEnv({ ... });
} catch (e) {
  if (e instanceof EnvValidationError) {
    console.error(e.message);
    // Missing environment variables:
    //   - DB_NAME (required by db.name) [string]
    //   - JWT_SECRET (required by jwt.secret) [string]
    // Invalid environment variables:
    //   - DB_PORT: "abc" (required by db.port) — number expected

    // Programmatic access:
    e.missing  // [{ varName, configPath, type }]
    e.invalid  // [{ varName, configPath, value, errors }]
  }
}`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Comparison ───────────────────────────────────── */}
                <div className="table-wrap">
                    <h2>Comparison</h2>
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>@cleverbrush/env</th>
                                <th>t3-env</th>
                                <th>envalid</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Compile-time leaf enforcement</td>
                                <td>✓</td>
                                <td>✗</td>
                                <td>✗</td>
                            </tr>
                            <tr>
                                <td>Nested config structures</td>
                                <td>✓</td>
                                <td>✗</td>
                                <td>✗</td>
                            </tr>
                            <tr>
                                <td>Schema-based validation</td>
                                <td>✓</td>
                                <td>✓</td>
                                <td>~</td>
                            </tr>
                            <tr>
                                <td>Type coercion</td>
                                <td>✓</td>
                                <td>Manual</td>
                                <td>✓</td>
                            </tr>
                            <tr>
                                <td>Array support</td>
                                <td>✓</td>
                                <td>✗</td>
                                <td>✗</td>
                            </tr>
                            <tr>
                                <td>Computed / derived values</td>
                                <td>✓</td>
                                <td>✗</td>
                                <td>✗</td>
                            </tr>
                            <tr>
                                <td>All-at-once error reporting</td>
                                <td>✓</td>
                                <td>✓</td>
                                <td>✓</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── API Reference ────────────────────────────────── */}
                <div className="table-wrap">
                    <h2>API Reference</h2>
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Export</th>
                                <th>Type</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>env(varName, schema)</code>
                                </td>
                                <td>Function</td>
                                <td>
                                    Binds a schema to an env var name. Required
                                    for every leaf in <code>parseEnv()</code>.
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>parseEnv(config, source?)</code>
                                </td>
                                <td>Function</td>
                                <td>
                                    Parses env vars into a validated, typed
                                    nested config object.
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>
                                        parseEnv(config, compute, source?)
                                    </code>
                                </td>
                                <td>Function</td>
                                <td>
                                    Parses env vars, then deep-merges computed
                                    values from the callback.
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>parseEnvFlat(schemas, source?)</code>
                                </td>
                                <td>Function</td>
                                <td>
                                    Flat convenience — keys are env var names,
                                    no <code>env()</code> needed.
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>splitBy(separator)</code>
                                </td>
                                <td>Function</td>
                                <td>
                                    Preprocessor that splits a string into an
                                    array.
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>EnvValidationError</code>
                                </td>
                                <td>Class</td>
                                <td>
                                    Thrown when env vars are missing or invalid.
                                    Has <code>.missing</code> and{' '}
                                    <code>.invalid</code> properties.
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>EnvField&lt;T&gt;</code>
                                </td>
                                <td>Type</td>
                                <td>
                                    Branded wrapper type created by{' '}
                                    <code>env()</code>.
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>InferEnvConfig&lt;T&gt;</code>
                                </td>
                                <td>Type</td>
                                <td>
                                    Infers the runtime type from a config
                                    descriptor.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
