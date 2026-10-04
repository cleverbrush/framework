import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertPackageLicense } from './package-license.mjs';

const canonicalLicense = readFileSync(
    new URL('../LICENSE', import.meta.url),
    'utf8'
);
let directory;

beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'framework-license-test-'));
});

afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
});

function fixture(
    relativePath,
    license = canonicalLicense,
    identifier = 'BSD-3-Clause'
) {
    const location = join(directory, relativePath);
    mkdirSync(location, { recursive: true });
    writeFileSync(
        join(location, 'package.json'),
        JSON.stringify({
            name: '@cleverbrush/example',
            license: identifier ?? undefined
        })
    );
    if (license !== null) writeFileSync(join(location, 'LICENSE'), license);
    return location;
}

describe('package licensing', () => {
    it.each(['.', 'libs/example', 'node_modules/@cleverbrush/example'])(
        'accepts canonical licensing in %s',
        relativePath => {
            expect(() =>
                assertPackageLicense(fixture(relativePath), canonicalLicense)
            ).not.toThrow();
        }
    );

    it('rejects a missing LICENSE', () => {
        expect(() =>
            assertPackageLicense(fixture('.', null), canonicalLicense)
        ).toThrow('@cleverbrush/example: missing LICENSE');
    });

    it('rejects a mismatched LICENSE even when metadata is correct', () => {
        expect(() =>
            assertPackageLicense(
                fixture('.', 'Unlicense or 0BSD'),
                canonicalLicense
            )
        ).toThrow('@cleverbrush/example: LICENSE does not match root LICENSE');
    });

    it.each(['MIT', '0BSD', 'BSD 3-Clause', null])(
        'rejects incorrect or absent license metadata: %s',
        identifier => {
            expect(() =>
                assertPackageLicense(
                    fixture('.', canonicalLicense, identifier),
                    canonicalLicense
                )
            ).toThrow(
                '@cleverbrush/example: package license must be BSD-3-Clause'
            );
        }
    );

    it('rejects an incorrect canonical license even when all copies agree', () => {
        const incorrectLicense = 'Unlicense or 0BSD';
        expect(() =>
            assertPackageLicense(
                fixture('.', incorrectLicense),
                incorrectLicense
            )
        ).toThrow('Root LICENSE must contain the BSD-3-Clause license');
    });
});
