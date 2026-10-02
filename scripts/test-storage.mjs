import { randomBytes, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

const root = fileURLToPath(new URL('../', import.meta.url));
const image = 'dxflrs/garage:v2.3.0@sha256:866bd13ed2038ba7e7190e840482bc27234c4afaf77be8cfa439ae088c1e4690';
const env = { ...process.env };
let container;
let directory;
let child;
const docker = args => {
    const result = spawnSync('docker', args, { encoding: 'utf8' });
    if (result.error || result.status !== 0) throw new Error(`Docker failed: ${result.stderr || result.error}`);
    return result.stdout.trim();
};
async function cleanup() {
    if (container) {
        spawnSync('docker', ['rm', '--force', '--volumes', container], { stdio: 'ignore' });
        container = undefined;
    }
    if (directory) await rm(directory, { recursive: true, force: true });
}
for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
        child?.kill(signal);
        void cleanup().finally(() => process.exit(130));
    });
}
try {
    if (!env.STORAGE_TEST_ENDPOINT) {
        directory = await mkdtemp(join(tmpdir(), 'framework-storage-'));
        const config = join(directory, 'garage.toml');
        await writeFile(config, `metadata_dir = "/tmp/meta"
data_dir = "/tmp/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "${randomBytes(32).toString('hex')}"
[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:3900"
`, { mode: 0o600 });
        Object.assign(env, {
            STORAGE_TEST_REGION: 'garage', STORAGE_TEST_BUCKET: 'framework-storage-test',
            STORAGE_TEST_ACCESS_KEY_ID: `GK${randomBytes(16).toString('hex')}`,
            STORAGE_TEST_SECRET_ACCESS_KEY: randomBytes(32).toString('hex'),
            STORAGE_TEST_FORCE_PATH_STYLE: 'true'
        });
        container = `framework-storage-${randomUUID()}`;
        docker(['run', '--detach', '--name', container, '-p', '127.0.0.1::3900',
            '-v', `${config}:/etc/garage.toml:ro`,
            '-e', `GARAGE_DEFAULT_ACCESS_KEY=${env.STORAGE_TEST_ACCESS_KEY_ID}`,
            '-e', `GARAGE_DEFAULT_SECRET_KEY=${env.STORAGE_TEST_SECRET_ACCESS_KEY}`,
            '-e', `GARAGE_DEFAULT_BUCKET=${env.STORAGE_TEST_BUCKET}`,
            image, '/garage', 'server', '--single-node', '--default-bucket']);
        env.STORAGE_TEST_ENDPOINT = `http://${docker(['port', container, '3900']).split('\n')[0]}`;
    }
    for (const name of ['STORAGE_TEST_REGION', 'STORAGE_TEST_BUCKET', 'STORAGE_TEST_ACCESS_KEY_ID', 'STORAGE_TEST_SECRET_ACCESS_KEY']) {
        if (!env[name]) throw new Error(`${name} is required for the storage integration suite`);
    }
    const client = new S3Client({
        endpoint: env.STORAGE_TEST_ENDPOINT, region: env.STORAGE_TEST_REGION,
        credentials: { accessKeyId: env.STORAGE_TEST_ACCESS_KEY_ID, secretAccessKey: env.STORAGE_TEST_SECRET_ACCESS_KEY },
        forcePathStyle: env.STORAGE_TEST_FORCE_PATH_STYLE !== 'false', maxAttempts: 1,
        requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED'
    });
    try {
        let ready = false;
        for (let attempt = 0; attempt < 40; attempt++) {
            try {
                await client.send(new HeadBucketCommand({ Bucket: env.STORAGE_TEST_BUCKET }), { abortSignal: AbortSignal.timeout(1000) });
                ready = true; break;
            } catch { await delay(250); }
        }
        if (!ready) throw new Error('S3 test bucket did not become ready; verify test endpoint, region and credentials');
    } finally { client.destroy(); }
    child = spawn(process.execPath, [resolve(root, 'node_modules/vitest/vitest.mjs'), 'run', '--config', 'vitest.storage.config.mts'], { cwd: root, env, stdio: 'inherit' });
    process.exitCode = await new Promise((done, reject) => { child.once('error', reject); child.once('exit', code => done(code ?? 1)); });
} catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
} finally { await cleanup(); }
