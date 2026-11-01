import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
    AggregationTemporality,
    InMemoryMetricExporter,
    MeterProvider,
    PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    type InstrumentationDiagnostic,
    InstrumentationLoadError,
    outboundHttpInstrumentations,
    runtimeMetrics
} from './instrumentations.js';

const roots: string[] = [];
const root = () => {
    const directory = mkdtempSync(join(tmpdir(), 'framework-instrumentation-'));
    roots.push(directory);
    return directory;
};
const peerName = '@opentelemetry/instrumentation-runtime-node';
function peer(
    directory: string,
    name = peerName,
    version = '0.28.0',
    code = 'export class RuntimeNodeInstrumentation { source = "fixture"; }'
) {
    const packageDirectory = join(directory, 'node_modules', name);
    mkdirSync(packageDirectory, { recursive: true });
    writeFileSync(
        join(packageDirectory, 'package.json'),
        JSON.stringify({
            name,
            version,
            type: 'module',
            main: 'index.js'
        })
    );
    writeFileSync(join(packageDirectory, 'index.js'), code);
}
afterEach(() => {
    for (const directory of roots.splice(0))
        rmSync(directory, { recursive: true, force: true });
});

describe('instrumentations', () => {
    it('outboundHttpInstrumentations returns an array', () => {
        const result = outboundHttpInstrumentations();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        for (const instrumentation of result)
            (instrumentation as any).disable();
    });

    it('runtimeMetrics returns an array', () => {
        const result = runtimeMetrics({ strict: true });
        expect(result).toHaveLength(1);
        (result[0] as any).disable();
    });

    it.each(['hoisted', 'nested'])(
        'resolves %s peers from the caller module',
        layout => {
            const directory = root();
            const workspace = join(directory, 'services', 'api');
            mkdirSync(workspace, { recursive: true });
            peer(layout === 'hoisted' ? directory : workspace);
            const result = runtimeMetrics({
                resolveFrom: pathToFileURL(join(workspace, 'telemetry.mjs')),
                strict: true
            });
            expect(result).toEqual([
                expect.objectContaining({ source: 'fixture' })
            ]);
        }
    );

    it.each([
        ['not-found', undefined, undefined],
        [
            'incompatible-version',
            '0.29.0',
            'export class RuntimeNodeInstrumentation {}'
        ],
        ['invalid-export', '0.28.0', 'export const other = true;'],
        [
            'load-failed',
            '0.28.0',
            'throw new Error("https://credential@private.local");'
        ],
        [
            'constructor-failed',
            '0.28.0',
            'export class RuntimeNodeInstrumentation { constructor() { throw new Error("private SQL credential"); } }'
        ]
    ] as const)(
        'diagnoses %s without disclosing loader errors',
        (reason, version, code) => {
            const directory = root();
            if (version) peer(directory, peerName, version, code);
            const diagnostics: InstrumentationDiagnostic[] = [];
            const options = {
                resolveFrom: join(directory, 'telemetry.mjs'),
                onDiagnostic: (diagnostic: InstrumentationDiagnostic) =>
                    diagnostics.push(diagnostic)
            };
            expect(runtimeMetrics(options)).toEqual([]);
            expect(diagnostics).toEqual([
                {
                    packageName: peerName,
                    reason,
                    expectedVersionRange: '^0.28.0'
                }
            ]);
            expect(() => runtimeMetrics({ ...options, strict: true })).toThrow(
                InstrumentationLoadError
            );
            try {
                runtimeMetrics({ ...options, strict: true });
            } catch (error) {
                expect((error as Error).message).not.toContain('private');
                expect((error as Error).message).not.toContain(directory);
                expect((error as Error).cause).toBeUndefined();
            }
        }
    );

    it('warns by default, safely handles diagnostic failures and rejects invalid bases', () => {
        const warning = vi
            .spyOn(process, 'emitWarning')
            .mockImplementation(() => {});
        try {
            const resolveFrom = join(root(), 'telemetry.mjs');
            expect(runtimeMetrics({ resolveFrom })).toEqual([]);
            expect(warning).toHaveBeenCalledTimes(1);
            expect(String(warning.mock.calls[0]![0])).toContain('not-found');
            expect(String(warning.mock.calls[0]![0])).not.toContain(
                resolveFrom
            );
            expect(
                runtimeMetrics({
                    resolveFrom,
                    onDiagnostic: () => {
                        throw new Error('secret');
                    }
                })
            ).toEqual([]);
            const diagnostic = vi.fn();
            expect(
                runtimeMetrics({
                    resolveFrom: 'relative.js',
                    onDiagnostic: diagnostic
                })
            ).toEqual([]);
            expect(diagnostic).toHaveBeenCalledWith(
                expect.objectContaining({ reason: 'invalid-resolution-base' })
            );
        } finally {
            warning.mockRestore();
        }
    });

    it('keeps successful outbound peers when another requested peer is absent', () => {
        const directory = root();
        peer(
            directory,
            '@opentelemetry/instrumentation-http',
            '0.222.0',
            'export class HttpInstrumentation {}'
        );
        const diagnostics: InstrumentationDiagnostic[] = [];
        const result = outboundHttpInstrumentations({
            resolveFrom: join(directory, 'telemetry.mjs'),
            onDiagnostic: diagnostic => diagnostics.push(diagnostic)
        });
        expect(result).toHaveLength(1);
        expect(diagnostics[0]?.packageName).toBe(
            '@opentelemetry/instrumentation-undici'
        );
        const metadata = JSON.parse(
            readFileSync(new URL('../package.json', import.meta.url), 'utf8')
        );
        expect(diagnostics[0]?.expectedVersionRange).toBe(
            metadata.peerDependencies[diagnostics[0]!.packageName]
        );
    });

    it('collects real runtime metrics with caller resource attributes', async () => {
        const [instrumentation] = runtimeMetrics({ strict: true });
        const exporter = new InMemoryMetricExporter(
            AggregationTemporality.CUMULATIVE
        );
        const reader = new PeriodicExportingMetricReader({
            exporter,
            exportIntervalMillis: 60000
        });
        const provider = new MeterProvider({
            resource: resourceFromAttributes({
                'service.name': 'runtime-test',
                'team.name': 'platform'
            }),
            readers: [reader]
        });
        try {
            (instrumentation as any).setMeterProvider(provider);
            await provider.forceFlush();
            const metrics = exporter.getMetrics();
            expect(metrics.length).toBeGreaterThan(0);
            expect(metrics[0]!.resource.attributes).toMatchObject({
                'service.name': 'runtime-test',
                'team.name': 'platform'
            });
            expect(
                metrics
                    .flatMap(resource =>
                        resource.scopeMetrics.flatMap(scope => scope.metrics)
                    )
                    .some(
                        metric =>
                            metric.descriptor.name.startsWith('nodejs.') ||
                            metric.descriptor.name.startsWith('v8js.')
                    )
            ).toBe(true);
        } finally {
            (instrumentation as any).disable();
            await provider.shutdown();
        }
    });
});
