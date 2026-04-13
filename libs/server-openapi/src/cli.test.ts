import * as fs from 'node:fs';
import type { EndpointRegistration } from '@cleverbrush/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeOpenApiSpec } from './cli.js';

vi.mock('node:fs', async () => {
    const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
    return {
        ...actual,
        writeFileSync: vi.fn(),
        existsSync: vi.fn(() => true),
        mkdirSync: vi.fn()
    };
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('writeOpenApiSpec', () => {
    it('generates and writes spec to file', () => {
        const spec = writeOpenApiSpec(
            {
                registrations: [] as EndpointRegistration[],
                info: { title: 'CLI Test', version: '1.0.0' }
            },
            '/tmp/openapi.json'
        );

        expect(spec['openapi']).toBe('3.1.0');
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            '/tmp/openapi.json',
            expect.any(String),
            'utf-8'
        );
        // Verify written content is valid JSON
        const written = (fs.writeFileSync as any).mock.calls[0][1];
        const parsed = JSON.parse(written);
        expect(parsed.info.title).toBe('CLI Test');
    });

    it('creates directory if it does not exist', () => {
        (fs.existsSync as any).mockReturnValue(false);

        writeOpenApiSpec(
            {
                registrations: [] as EndpointRegistration[],
                info: { title: 'Test', version: '1.0.0' }
            },
            '/some/deep/dir/openapi.json'
        );

        expect(fs.mkdirSync).toHaveBeenCalledWith('/some/deep/dir', {
            recursive: true
        });
    });

    it('returns the generated spec document', () => {
        const spec = writeOpenApiSpec(
            {
                registrations: [] as EndpointRegistration[],
                info: { title: 'Return Test', version: '2.0.0' }
            },
            '/tmp/out.json'
        );

        expect(spec).toBeDefined();
        expect((spec['info'] as any).title).toBe('Return Test');
        expect((spec['info'] as any).version).toBe('2.0.0');
    });

    it('writes pretty-printed JSON', () => {
        writeOpenApiSpec(
            {
                registrations: [] as EndpointRegistration[],
                info: { title: 'Pretty', version: '1.0.0' }
            },
            '/tmp/pretty.json'
        );

        const written = (fs.writeFileSync as any).mock.calls[0][1] as string;
        // JSON.stringify with 2-space indent produces newlines
        expect(written).toContain('\n');
        expect(written).toContain('  ');
    });
});
