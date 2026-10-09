import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Check first-party source or installed-package licensing against the root
 * LICENSE. This checks consistency, not the licensing of dependencies.
 *
 * @param {string} directory - Root, workspace or installed package directory.
 * @param {string} expectedLicense - Canonical root LICENSE contents.
 * @returns {void}
 */
export function assertPackageLicense(directory, expectedLicense) {
    if (!/^BSD 3-Clause License\r?\n/.test(expectedLicense)) {
        throw new Error('Root LICENSE must contain the BSD-3-Clause license');
    }
    const pkg = JSON.parse(
        readFileSync(join(directory, 'package.json'), 'utf8')
    );
    if (pkg.license !== 'BSD-3-Clause') {
        throw new Error(`${pkg.name}: package license must be BSD-3-Clause`);
    }
    let license;
    try {
        license = readFileSync(join(directory, 'LICENSE'), 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        throw new Error(`${pkg.name}: missing LICENSE`, { cause: error });
    }
    if (license !== expectedLicense) {
        throw new Error(`${pkg.name}: LICENSE does not match root LICENSE`);
    }
}
