import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, platform, arch, totalmem } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { typescriptCli } from './typescript-cli.mjs';

const { values } = parseArgs({ options: {
    baseline: { type: 'string' },
    candidate: { type: 'string' },
    output: { type: 'string' },
    runs: { type: 'string', default: '5' }
} });
const runs = Number(values.runs);
if (!values.baseline || !values.candidate || !values.output ||
    !Number.isInteger(runs) || runs < 1) {
    throw new Error('Usage: node scripts/benchmark-build.mjs --baseline <checkout> --candidate <checkout> --output <json> [--runs 5]');
}
const output = resolve(values.output);
const logs = `${output}.logs`;
mkdirSync(logs, { recursive: true });
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const execute = (root, command, args, log) => {
    const start = performance.now();
    const result = spawnSync(command, args, {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, CI: 'true', TURBO_TELEMETRY_DISABLED: '1' },
        timeout: 600_000,
        maxBuffer: 32 * 1024 * 1024
    });
    const seconds = (performance.now() - start) / 1000;
    if (log) writeFileSync(log, `${result.stdout ?? ''}${result.stderr ?? ''}`);
    if (result.error || result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed: ${result.error ?? result.status}; see ${log}`);
    }
    return { seconds, stdout: result.stdout };
};
const checkouts = Object.entries({ baseline: values.baseline, candidate: values.candidate })
    .map(([name, directory]) => {
        const root = resolve(directory);
        const pkg = readJson(join(root, 'package.json'));
        if (pkg.name !== 'cleverbrush-framework') throw new Error(`Unexpected checkout: ${root}`);
        const compiler = typescriptCli(join(root, 'package.json'));
        const libraries = readdirSync(join(root, 'libs')).filter(name => {
            const manifest = readJson(join(root, 'libs', name, 'package.json'));
            return !manifest.private && manifest.scripts?.build?.includes('tsc');
        }).sort();
        return { name, root, compiler, libraries };
    });
if (checkouts[0].root === checkouts[1].root) throw new Error('Use separate checkouts');

const result = {
    recordedAt: new Date().toISOString(),
    machine: { platform: platform(), architecture: arch(), cpu: cpus()[0]?.model,
        logicalCpus: cpus().length, memoryBytes: totalmem(), node: process.version,
        npm: execute(checkouts[0].root, 'npm', ['--version']).stdout.trim() },
    methodology: {
        runs,
        warmups: 1,
        ordering: 'alternating baseline/candidate, reversed on odd iterations',
        cleanBuild: 'remove package dist and tsbuildinfo; npm run build -- --force',
        declarations: 'sequential tsc --project <library>/tsconfig.build.json --emitDeclarationOnly --incremental false --composite false for every published library',
        incremental: 'schema declaration-only incremental build immediately after an untimed priming build',
        installationExcluded: true,
        caches: 'Turbo cache reads bypassed with --force; filesystem cache warm'
    },
    checkouts: checkouts.map(({ name, root, compiler, libraries }) => ({
        name,
        root,
        commit: execute(root, 'git', ['rev-parse', 'HEAD']).stdout.trim(),
        diffSha256: createHash('sha256').update(execute(root, 'git', ['diff', 'HEAD']).stdout).digest('hex'),
        lockSha256: createHash('sha256').update(readFileSync(join(root, 'package-lock.json'))).digest('hex'),
        compiler: execute(root, process.execPath, [compiler, '--version']).stdout.trim(),
        libraries
    })),
    samples: [],
    summary: {}
};

function clean(root) {
    // Restrict removal to generated package artifacts, and refuse tracked ones.
    const directories = ['libs', 'demos'].flatMap(parent =>
        readdirSync(join(root, parent), { withFileTypes: true })
            .filter(entry => entry.isDirectory()).map(entry => join(parent, entry.name))
    );
    const targets = directories.flatMap(directory => [
        join(directory, 'dist'),
        ...readdirSync(join(root, directory)).filter(file => file.endsWith('.tsbuildinfo'))
            .map(file => join(directory, file))
    ]);
    for (const target of targets) {
        const tracked = execute(root, 'git', ['ls-files', '--', target]).stdout.trim();
        if (tracked) throw new Error(`Refusing to remove tracked output: ${target}`);
        rmSync(join(root, target), { recursive: true, force: true });
    }
}

for (let iteration = 0; iteration <= runs; iteration++) {
    const order = iteration % 2 ? [...checkouts].reverse() : checkouts;
    for (const checkout of order) {
        const { name, root, compiler, libraries } = checkout;
        const prefix = join(logs, `${iteration}-${name}`);
        clean(root);
        const build = execute(root, 'npm', ['run', 'build', '--', '--force'], `${prefix}-build.log`);
        const declarationStart = performance.now();
        for (const library of libraries) {
            execute(root, process.execPath, [compiler, '--project', `libs/${library}/tsconfig.build.json`,
                '--emitDeclarationOnly', '--incremental', 'false', '--composite', 'false'], `${prefix}-${library}.log`);
        }
        const declarations = (performance.now() - declarationStart) / 1000;
        const buildInfo = `${prefix}.tsbuildinfo`;
        rmSync(buildInfo, { force: true });
        const incrementalArgs = [compiler, '--project', 'libs/schema/tsconfig.build.json',
            '--emitDeclarationOnly', '--incremental', '--tsBuildInfoFile', buildInfo];
        execute(root, process.execPath, incrementalArgs, `${prefix}-incremental-prime.log`);
        const incremental = execute(root, process.execPath, incrementalArgs, `${prefix}-incremental.log`);
        const sample = { iteration, warmup: iteration === 0, checkout: name,
            buildSeconds: build.seconds, declarationSeconds: declarations,
            incrementalSeconds: incremental.seconds };
        result.samples.push(sample);
        writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
        process.stdout.write(JSON.stringify(sample) + '\n');
    }
}
const median = numbers => {
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
for (const metric of ['buildSeconds', 'declarationSeconds', 'incrementalSeconds']) {
    const baseline = result.samples.filter(s => !s.warmup && s.checkout === 'baseline').map(s => s[metric]);
    const candidate = result.samples.filter(s => !s.warmup && s.checkout === 'candidate').map(s => s[metric]);
    result.summary[metric] = {
        baseline: { median: median(baseline), min: Math.min(...baseline), max: Math.max(...baseline) },
        candidate: { median: median(candidate), min: Math.min(...candidate), max: Math.max(...candidate) },
        improvementPercent: (1 - median(candidate) / median(baseline)) * 100,
        fasterPairs: candidate.filter((value, i) => value < baseline[i]).length
    };
}
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result.summary, null, 2) + '\n');
