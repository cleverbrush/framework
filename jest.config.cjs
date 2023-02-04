/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '/*.test.ts$/': [
            'ts-jest',
            {
                useESM: true,
                tsConfig: 'tsconfig.json'
            }
        ]
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.(js|ts)$': '$1'
    }
};
