import { spawnSync } from 'node:child_process';
import {
    copyFileSync,
    existsSync,
    readFileSync,
    readdirSync,
    writeFileSync
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleReleasePlan } from '@changesets/assemble-release-plan';
import { readConfig } from '@changesets/config';
import { readPreState } from '@changesets/pre';
import { readChangesets } from '@changesets/read';
import { getPackages } from '@manypkg/get-packages';

const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const numeric = '(?:0|[1-9]\\d*)';
const prerelease = `(?:${numeric}|\\d*[A-Za-z-][0-9A-Za-z-]*)`;
const versionPattern = new RegExp(
    `^${numeric}\\.${numeric}\\.${numeric}` +
        `(?:-${prerelease}(?:\\.${prerelease})*)?` +
        '(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$'
);

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

export async function getDocsVersion(rootDir = ROOT_DIR, override) {
    const packageNames = readJson(
        join(rootDir, '.changeset/config.json')
    ).fixed.flat();
    if (packageNames.length === 0) {
        throw new Error('No fixed release packages configured.');
    }

    const packages = new Map(
        readdirSync(join(rootDir, 'libs'), { withFileTypes: true })
            .filter(
                entry =>
                    entry.isDirectory() &&
                    existsSync(
                        join(rootDir, 'libs', entry.name, 'package.json')
                    )
            )
            .map(entry => {
                const pkg = readJson(
                    join(rootDir, 'libs', entry.name, 'package.json')
                );
                return [pkg.name, pkg];
            })
    );
    const versions = new Set(
        packageNames.map(name => {
            const pkg = packages.get(name);
            if (!pkg || !versionPattern.test(pkg.version)) {
                throw new Error(`Missing package or invalid version: ${name}`);
            }
            return pkg.version;
        })
    );
    if (versions.size !== 1) {
        throw new Error('Published package versions do not match.');
    }

    let version = override;
    if (version === undefined) {
        // Read the upcoming release without consuming changesets or requiring Git.
        const workspaces = await getPackages(rootDir);
        const [{ config, errors }, changesets, preState] = await Promise.all([
            readConfig(rootDir, workspaces),
            readChangesets(rootDir),
            readPreState(rootDir)
        ]);
        if (errors) throw new Error(errors.join('\n'));
        const plan = assembleReleasePlan(
            changesets,
            workspaces,
            config,
            preState
        );
        const plannedVersions = new Set(
            plan.releases
                .filter(release => packageNames.includes(release.name))
                .map(release => release.newVersion)
        );
        if (plannedVersions.size > 1) {
            throw new Error('Planned package versions do not match.');
        }
        version =
            plannedVersions.values().next().value ??
            versions.values().next().value;
    }
    if (!versionPattern.test(version)) {
        throw new Error(`Invalid documentation version: ${version}`);
    }
    return version;
}

export function prepareDocs(directory, rootDir = ROOT_DIR) {
    const license = join(directory, 'LICENSE');
    copyFileSync(join(rootDir, 'LICENSE'), license);

    function visit(path) {
        for (const entry of readdirSync(path, { withFileTypes: true })) {
            const file = join(path, entry.name);
            if (entry.isDirectory()) {
                visit(file);
            } else if (entry.name.endsWith('.html')) {
                const html = readFileSync(file, 'utf8');
                const licensePath = relative(dirname(file), license)
                    .split(sep)
                    .join('/');
                const updated = html.replace(
                    /href="(?:\.\.?\/)*LICENSE"/g,
                    `href="${licensePath}"`
                );
                if (updated !== html) writeFileSync(file, updated);
            }
        }
    }
    visit(directory);
}

function run(command, args) {
    const result = spawnSync(command, args, {
        cwd: ROOT_DIR,
        stdio: 'inherit'
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
}

if (import.meta.main) {
    const version = await getDocsVersion(ROOT_DIR, process.env.VERSION);
    if (process.argv[2] === '--version') {
        process.stdout.write(`${version}\n`);
    } else {
        const output = join(ROOT_DIR, 'websites/docs/public/api-docs/latest');
        run(process.execPath, [
            join(ROOT_DIR, 'node_modules/typedoc/bin/typedoc'),
            '--name',
            `Libraries v${version}`
        ]);
        prepareDocs(output);
        run('bash', [join(ROOT_DIR, 'scripts/inject-gtm.sh'), output]);
    }
}
