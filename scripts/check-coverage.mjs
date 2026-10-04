import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const summary = JSON.parse(
    readFileSync(join(root, 'coverage/coverage-summary.json'), 'utf8')
);
const floors = JSON.parse(
    readFileSync(join(root, 'coverage-thresholds.json'), 'utf8')
);
const metrics = ['statements', 'branches', 'functions', 'lines'];
let failed = false;
for (const directory of readdirSync(join(root, 'libs'))) {
    const manifest = JSON.parse(
        readFileSync(join(root, 'libs', directory, 'package.json'), 'utf8')
    );
    if (manifest.private) continue;
    const prefix = resolve(root, 'libs', directory, 'src') + '/';
    const files = Object.entries(summary).filter(([file]) =>
        file.startsWith(prefix)
    );
    for (const metric of metrics) {
        const covered = files.reduce(
            (sum, [, data]) => sum + data[metric].covered,
            0
        );
        const total = files.reduce(
            (sum, [, data]) => sum + data[metric].total,
            0
        );
        const percent = total ? (covered / total) * 100 : 100;
        const floor = floors[directory]?.[metric];
        if (
            !files.length ||
            !Number.isFinite(floor) ||
            floor < 0 ||
            floor > 100 ||
            percent + 0.001 < floor
        ) {
            console.error(
                `${manifest.name} ${metric}: ${percent.toFixed(2)}%, required ${floor ?? 'MISSING'}% (${files.length} files)`
            );
            failed = true;
        }
    }
}
if (failed) process.exitCode = 1;
else console.log('All published-package coverage floors passed.');
