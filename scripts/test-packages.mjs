import { execFileSync } from 'node:child_process';
import {
    mkdtempSync,
    readdirSync,
    readFileSync,
    writeFileSync,
    rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'framework-packages-'));
const dependencies = {};
const peers = {};
const specifiers = [];
const execute = (command, args, cwd = directory) =>
    execFileSync(command, args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
            npm_config_audit: 'false',
            npm_config_fund: 'false'
        },
        timeout: 300_000,
        maxBuffer: 10 * 1024 * 1024
    });

try {
    for (const folder of readdirSync(join(root, 'libs'))) {
        const workspace = join(root, 'libs', folder);
        const pkg = JSON.parse(
            readFileSync(join(workspace, 'package.json'), 'utf8')
        );
        if (pkg.private) continue;
        const [packed] = JSON.parse(
            execute(
                'npm',
                [
                    'pack',
                    '--ignore-scripts',
                    '--json',
                    '--pack-destination',
                    directory
                ],
                workspace
            )
        );
        const files = new Set(packed.files.map(file => file.path));
        if (!files.has('LICENSE'))
            throw new Error(`${pkg.name}: missing packaged license`);
        if (
            [...files].some(file =>
                /(?:\.test(?:-d)?\.[cm]?tsx?$|\.env$)/.test(file)
            )
        )
            throw new Error(`${pkg.name}: test or environment file in tarball`);
        for (const [subpath, exported] of Object.entries(pkg.exports)) {
            const target =
                typeof exported === 'string'
                    ? {
                          import: exported,
                          types: exported.replace(/\.js$/, '.d.ts')
                      }
                    : exported;
            for (const field of ['import', 'types']) {
                if (
                    !target[field] ||
                    !files.has(target[field].replace(/^\.\//, ''))
                )
                    throw new Error(
                        `${pkg.name}${subpath}: missing ${field} target`
                    );
            }
            specifiers.push(
                pkg.name + (subpath === '.' ? '' : subpath.slice(1))
            );
        }
        Object.assign(peers, pkg.peerDependencies);
        dependencies[pkg.name] = `file:${join(directory, packed.filename)}`;
    }
    writeFileSync(
        join(directory, 'package.json'),
        JSON.stringify({
            private: true,
            type: 'module',
            dependencies: {
                ...peers,
                '@types/node': '^24',
                '@types/react': '^19',
                ...dependencies
            }
        })
    );
    // Generate a disposable consumer lockfile, then install reproducibly.
    execute('npm', ['update', '--package-lock-only', '--ignore-scripts']);
    execute('npm', ['ci', '--ignore-scripts']);
    execute(process.execPath, [
        '--input-type=module',
        '-e',
        `for (const name of ${JSON.stringify(specifiers)}) await import(name);`
    ]);
    const declarations = specifiers
        .map(
            (name, i) =>
                `import type * as Entry${i} from ${JSON.stringify(name)};`
        )
        .join('\n');
    const readmeExample = readFileSync(join(root, 'README.md'), 'utf8').match(
        /## How The Pieces Fit[\s\S]*?```ts\n([\s\S]*?)```/
    )?.[1];
    if (!readmeExample)
        throw new Error('Root README consumer example is missing');
    writeFileSync(
        join(directory, 'consumer.ts'),
        declarations + '\n' + readmeExample
    );
    execute(process.execPath, [
        join(root, 'node_modules/typescript/bin/tsc'),
        '--noEmit',
        '--strict',
        '--skipLibCheck',
        'false',
        '--target',
        'ES2022',
        '--lib',
        'ES2022,DOM,ESNext.Disposable',
        '--types',
        'node,react',
        '--module',
        'ESNext',
        '--moduleResolution',
        'bundler',
        'consumer.ts'
    ]);
    await build({
        stdin: {
            contents: `import * as schema from '@cleverbrush/schema'; import * as client from '@cleverbrush/client'; import * as form from '@cleverbrush/react-form'; import * as contract from '@cleverbrush/server/contract'; globalThis.framework = { schema, client, form, contract };`,
            resolveDir: directory
        },
        bundle: true,
        platform: 'browser',
        format: 'esm',
        write: false
    });
    console.log(
        `Packed consumer passed: ${Object.keys(dependencies).length} packages, ${specifiers.length} entry points, declarations and browser bundle.`
    );
} catch (error) {
    if (error.stdout) console.error(error.stdout.toString());
    console.error(error.stderr?.toString() || error.message);
    process.exitCode = 1;
} finally {
    rmSync(directory, { recursive: true, force: true });
}
