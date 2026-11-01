/**
 * Opt-in auto-instrumentations.
 *
 * These helpers wrap upstream OpenTelemetry instrumentation packages
 * for outbound HTTP and Node.js runtime metrics. They are kept in a
 * separate entry point so projects that don't want them avoid the
 * extra dependencies and the `require-in-the-middle` patching at
 * startup.
 *
 * Pass the returned arrays to `setupOtel({ instrumentations: [...] })`.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const requireFromHere = createRequire(import.meta.url);

export type InstrumentationLoadReason =
    | 'not-found'
    | 'load-failed'
    | 'invalid-export'
    | 'constructor-failed'
    | 'incompatible-version'
    | 'invalid-resolution-base';

/** Safe diagnostic data; never includes a loader exception or filesystem path. */
export interface InstrumentationDiagnostic {
    readonly packageName: string;
    readonly reason: InstrumentationLoadReason;
    readonly expectedVersionRange: string;
}

export interface InstrumentationLoadOptions {
    /** Resolve peers from a caller's absolute module filename or file URL. */
    resolveFrom?: string | URL;
    /** Throw a sanitized load error instead of continuing without the peer. */
    strict?: boolean;
    /** Receive safe diagnostics instead of the default process warning. */
    onDiagnostic?: (diagnostic: InstrumentationDiagnostic) => void;
}

/** A deliberately safe error without the original loader error as its cause. */
export class InstrumentationLoadError extends Error {
    readonly diagnostic: InstrumentationDiagnostic;

    constructor(diagnostic: InstrumentationDiagnostic) {
        super(
            `Optional instrumentation ${diagnostic.packageName} unavailable ` +
                `(${diagnostic.reason}); expected ${diagnostic.expectedVersionRange}`
        );
        this.name = 'InstrumentationLoadError';
        this.diagnostic = diagnostic;
    }
}

interface InstrumentationPeer {
    packageName: string;
    exportName: string;
    /** Supported stable 0.x minor; must match the package's optional peer range. */
    minor: number;
}

function packageVersion(entry: string, packageName: string): string {
    let directory = dirname(entry);
    for (;;) {
        try {
            const metadata = JSON.parse(
                readFileSync(join(directory, 'package.json'), 'utf8')
            );
            if (metadata.name === packageName) return metadata.version;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        const parent = dirname(directory);
        if (parent === directory) throw new Error('Package metadata missing');
        directory = parent;
    }
}

function loadInstrumentation(
    peer: InstrumentationPeer,
    options: InstrumentationLoadOptions
): unknown[] {
    const unavailable = (reason: InstrumentationLoadReason): unknown[] => {
        const diagnostic = Object.freeze({
            packageName: peer.packageName,
            reason,
            expectedVersionRange: `^0.${peer.minor}.0`
        });
        const error = new InstrumentationLoadError(diagnostic);
        if (options.onDiagnostic) {
            try {
                options.onDiagnostic(diagnostic);
            } catch {
                // A diagnostic callback must not change application startup.
            }
        } else if (!options.strict) {
            process.emitWarning(error.message, {
                code: 'CLEVERBRUSH_OTEL_INSTRUMENTATION'
            });
        }
        if (options.strict) throw error;
        return [];
    };

    let loader: ReturnType<typeof createRequire>;
    try {
        loader = options.resolveFrom
            ? createRequire(options.resolveFrom)
            : requireFromHere;
    } catch {
        return unavailable('invalid-resolution-base');
    }
    let entry: string;
    try {
        entry = loader.resolve(peer.packageName);
    } catch {
        return unavailable('not-found');
    }
    let version: string;
    try {
        version = packageVersion(entry, peer.packageName);
    } catch {
        return unavailable('load-failed');
    }
    // The three optional peers use ^0.MINOR.0 ranges. Prereleases require an
    // explicit compatibility update rather than being accepted accidentally.
    const stable =
        typeof version === 'string'
            ? /^0\.(\d+)\.\d+(?:\+[\w.-]+)?$/.exec(version)
            : null;
    if (!stable || Number(stable[1]) !== peer.minor)
        return unavailable('incompatible-version');
    let Constructor: any;
    try {
        const module = loader(peer.packageName);
        Constructor = module[peer.exportName] ?? module.default;
    } catch {
        return unavailable('load-failed');
    }
    if (typeof Constructor !== 'function') return unavailable('invalid-export');
    try {
        return [new Constructor()];
    } catch {
        return unavailable('constructor-failed');
    }
}

/**
 * Returns instrumentations for outbound HTTP traffic — Node `http`/`https`
 * (covers `node-fetch` etc.) and `undici` (covers global `fetch`).
 *
 * Both packages are declared as optional peer dependencies of
 * `@cleverbrush/otel`. Install them in the host project to use:
 *
 * ```sh
 * npm install @opentelemetry/instrumentation-http @opentelemetry/instrumentation-undici
 * ```
 *
 * @returns an array of instrumentation instances ready to pass to `setupOtel`
 *
 * @example
 * ```ts
 * import { setupOtel } from '@cleverbrush/otel';
 * import { outboundHttpInstrumentations } from '@cleverbrush/otel/instrumentations';
 *
 * setupOtel({
 *     serviceName: 'todo-backend',
 *     instrumentations: outboundHttpInstrumentations(),
 * });
 * ```
 */
export function outboundHttpInstrumentations(
    options: InstrumentationLoadOptions = {}
): unknown[] {
    return [
        ...loadInstrumentation(
            {
                packageName: '@opentelemetry/instrumentation-http',
                exportName: 'HttpInstrumentation',
                minor: 222
            },
            options
        ),
        ...loadInstrumentation(
            {
                packageName: '@opentelemetry/instrumentation-undici',
                exportName: 'UndiciInstrumentation',
                minor: 25
            },
            options
        )
    ];
}

/**
 * Returns the Node.js runtime metrics instrumentation, which emits
 * basic process gauges (event loop lag, GC, heap size).
 *
 * Requires `@opentelemetry/instrumentation-runtime-node` to be
 * installed in the host project.
 *
 * Failures warn by default; use strict to validate startup, or onDiagnostic to
 * handle safe failure information. Resolve workspace peers with resolveFrom.
 *
 * @returns one instrumentation, or an empty array with a failure diagnostic
 *
 * @example
 * ```ts
 * import { setupOtel } from '@cleverbrush/otel';
 * import { runtimeMetrics } from '@cleverbrush/otel/instrumentations';
 *
 * setupOtel({
 *     serviceName: 'todo-backend',
 *     instrumentations: runtimeMetrics(),
 * });
 * ```
 */
export function runtimeMetrics(
    options: InstrumentationLoadOptions = {}
): unknown[] {
    return loadInstrumentation(
        {
            packageName: '@opentelemetry/instrumentation-runtime-node',
            exportName: 'RuntimeNodeInstrumentation',
            minor: 28
        },
        options
    );
}
