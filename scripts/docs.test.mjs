import { spawnSync } from 'node:child_process';
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDocsVersion, prepareDocs } from './docs.mjs';

let rootDir;

function writeJson(path, value) {
    writeFileSync(path, JSON.stringify(value));
}

function writePackage(name, version = '5.1.0') {
    const directory = join(rootDir, 'libs', name);
    mkdirSync(directory, { recursive: true });
    writeJson(join(directory, 'package.json'), {
        name: `@cleverbrush/${name}`,
        version
    });
}

beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), 'framework-docs-test-'));
    mkdirSync(join(rootDir, '.changeset'));
    mkdirSync(join(rootDir, 'scripts'));
    writeJson(join(rootDir, 'package.json'), {
        private: true,
        version: '4.2.0'
    });
    writeJson(join(rootDir, '.changeset/config.json'), {
        fixed: [['@cleverbrush/schema', '@cleverbrush/deep']]
    });
    writePackage('schema');
    writePackage('deep');
    writeFileSync(join(rootDir, 'LICENSE'), 'Fixture license');
    for (const name of ['docs.mjs', 'snapshot-docs.sh']) {
        copyFileSync(
            new URL(name, import.meta.url),
            join(rootDir, 'scripts', name)
        );
    }
});

afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
});

describe('documentation versions', () => {
    it('uses release packages rather than the stale private root version', () => {
        mkdirSync(join(rootDir, 'libs/unrelated-directory'));
        expect(getDocsVersion(rootDir)).toBe('5.1.0');
    });

    it('preserves explicit prerelease version overrides', () => {
        expect(getDocsVersion(rootDir, '5.2.0-beta.1+build.2')).toBe(
            '5.2.0-beta.1+build.2'
        );
    });

    it('rejects mixed package versions even with an override', () => {
        writePackage('deep', '5.0.0');
        expect(() => getDocsVersion(rootDir)).toThrow('do not match');
        expect(() => getDocsVersion(rootDir, '5.1.0')).toThrow('do not match');
    });

    it('rejects missing fixed release packages', () => {
        rmSync(join(rootDir, 'libs/deep'), { recursive: true });
        expect(() => getDocsVersion(rootDir)).toThrow('@cleverbrush/deep');
    });

    it.each(['../5.1.0', 'v5.1.0', '05.1.0', '5.1.0-beta.01', ''])(
        'rejects an invalid override: %s',
        version => {
            expect(() => getDocsVersion(rootDir, version)).toThrow(
                'Invalid documentation version'
            );
        }
    );
});

function latestDocs(version = '5.1.0') {
    const directory = join(rootDir, 'websites/docs/public/api-docs/latest');
    mkdirSync(directory, { recursive: true });
    writeFileSync(
        join(directory, 'index.html'),
        `<title>Libraries v${version}</title><a href="./LICENSE">License</a>`
    );
    return directory;
}

it('keeps license links local at every documentation depth', () => {
    const directory = latestDocs();
    mkdirSync(join(directory, 'modules/nested'), { recursive: true });
    const module = join(directory, 'modules/package.html');
    const nested = join(directory, 'modules/nested/example.html');
    writeFileSync(module, '<a href="../../LICENSE">License</a>');
    writeFileSync(
        nested,
        '<a href="../../LICENSE">License</a>' +
            '<a href="https://example.com/LICENSE">External</a>'
    );

    prepareDocs(directory, rootDir);

    expect(readFileSync(join(directory, 'LICENSE'), 'utf8')).toBe(
        'Fixture license'
    );
    expect(readFileSync(join(directory, 'index.html'), 'utf8')).toContain(
        'href="LICENSE"'
    );
    expect(readFileSync(module, 'utf8')).toContain('href="../LICENSE"');
    expect(readFileSync(nested, 'utf8')).toContain('href="../../LICENSE"');
    expect(readFileSync(nested, 'utf8')).toContain(
        'href="https://example.com/LICENSE"'
    );
});

function snapshot(version) {
    const env = { ...process.env };
    delete env.VERSION;
    if (version !== undefined) env.VERSION = version;
    return spawnSync('bash', [join(rootDir, 'scripts/snapshot-docs.sh')], {
        cwd: rootDir,
        encoding: 'utf8',
        env
    });
}

describe('documentation snapshots', () => {
    it('archives matching latest docs and updates the sorted version picker', () => {
        const latest = latestDocs();
        prepareDocs(latest, rootDir);
        const docs = join(latest, '..');
        mkdirSync(join(docs, 'v5.0.0'));
        writeFileSync(join(docs, 'v5.0.0/index.html'), 'Archived release');

        const result = snapshot();

        expect(result.status, result.stderr).toBe(0);
        expect(readFileSync(join(docs, 'v5.1.0/index.html'), 'utf8')).toBe(
            readFileSync(join(latest, 'index.html'), 'utf8')
        );
        expect(readFileSync(join(docs, 'v5.1.0/LICENSE'), 'utf8')).toBe(
            'Fixture license'
        );
        expect(
            JSON.parse(readFileSync(join(docs, 'versions.json'), 'utf8'))
        ).toEqual([
            { version: 'v5.1.0', path: 'v5.1.0/index.html' },
            { version: 'v5.0.0', path: 'v5.0.0/index.html' }
        ]);
        expect(readFileSync(join(docs, 'index.html'), 'utf8')).toContain(
            './v5.1.0/index.html'
        );
        expect(readFileSync(join(docs, 'v5.0.0/index.html'), 'utf8')).toBe(
            'Archived release'
        );

        writeFileSync(join(latest, 'index.html'), 'Changed latest docs');
        const repeated = snapshot();
        expect(repeated.status).toBe(1);
        expect(repeated.stdout).toContain('already exists');
        expect(readFileSync(join(docs, 'v5.1.0/index.html'), 'utf8')).toContain(
            '<title>Libraries v5.1.0</title>'
        );
    });

    it('rejects stale latest docs instead of mislabeling the archive', () => {
        const latest = latestDocs('5.0.0');
        const result = snapshot();
        expect(result.status).toBe(1);
        expect(result.stdout).toContain('do not match v5.1.0');
        expect(existsSync(join(latest, '../v5.1.0'))).toBe(false);
    });

    it('preserves matching explicit version overrides', () => {
        const latest = latestDocs('5.2.0-beta.1');
        const result = snapshot('5.2.0-beta.1');
        expect(result.status, result.stderr).toBe(0);
        expect(existsSync(join(latest, '../v5.2.0-beta.1/index.html'))).toBe(
            true
        );
    });

    it('requires latest docs to have been generated', () => {
        const result = snapshot();
        expect(result.status).toBe(1);
        expect(result.stdout).toContain("Run 'npm run docs' first");
    });
});
