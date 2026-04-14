import { array, boolean, date, number, string } from '@cleverbrush/schema';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
    EnvValidationError,
    env,
    parseEnv,
    parseEnvFlat,
    splitBy
} from './index.js';

describe('env()', () => {
    it('creates a branded EnvField', () => {
        const field = env('DB_HOST', string());
        expect(field.varName).toBe('DB_HOST');
        expect(field.schema).toBeDefined();
    });

    it('throws on empty varName', () => {
        expect(() => env('', string())).toThrow('non-empty string');
    });
});

describe('splitBy()', () => {
    it('splits a string by separator and trims elements', () => {
        const split = splitBy(',') as (value: unknown) => unknown;
        expect(split('a, b, c')).toEqual(['a', 'b', 'c']);
    });

    it('returns non-string values unchanged', () => {
        const split = splitBy(',') as (value: unknown) => unknown;
        expect(split(42)).toBe(42);
        expect(split(null)).toBe(null);
        expect(split(undefined)).toBe(undefined);
    });

    it('handles single element (no separator present)', () => {
        const split = splitBy(',') as (value: unknown) => unknown;
        expect(split('single')).toEqual(['single']);
    });
});

describe('parseEnv()', () => {
    describe('flat config with env()', () => {
        it('parses string values', () => {
            const config = parseEnv(
                {
                    host: env('DB_HOST', string())
                },
                { DB_HOST: 'localhost' }
            );
            expect(config.host).toBe('localhost');
            expectTypeOf(config.host).toBeString();
        });

        it('coerces number values', () => {
            const config = parseEnv(
                {
                    port: env('DB_PORT', number().coerce())
                },
                { DB_PORT: '5432' }
            );
            expect(config.port).toBe(5432);
            expectTypeOf(config.port).toBeNumber();
        });

        it('coerces boolean values', () => {
            const config = parseEnv(
                {
                    debug: env('DEBUG', boolean().coerce())
                },
                { DEBUG: 'true' }
            );
            expect(config.debug).toBe(true);
            expectTypeOf(config.debug).toBeBoolean();
        });

        it('coerces date values', () => {
            const config = parseEnv(
                {
                    created: env('CREATED', date().coerce())
                },
                { CREATED: '2025-01-15' }
            );
            expect(config.created).toBeInstanceOf(Date);
            expectTypeOf(config.created).toEqualTypeOf<Date>();
        });
    });

    describe('nested config', () => {
        it('parses nested object structures', () => {
            const config = parseEnv(
                {
                    db: {
                        host: env('DB_HOST', string()),
                        port: env('DB_PORT', number().coerce()),
                        name: env('DB_NAME', string())
                    }
                },
                {
                    DB_HOST: 'localhost',
                    DB_PORT: '5432',
                    DB_NAME: 'mydb'
                }
            );
            expect(config.db.host).toBe('localhost');
            expect(config.db.port).toBe(5432);
            expect(config.db.name).toBe('mydb');
            expectTypeOf(config.db.host).toBeString();
            expectTypeOf(config.db.port).toBeNumber();
            expectTypeOf(config.db.name).toBeString();
        });

        it('parses deeply nested structures (3+ levels)', () => {
            const config = parseEnv(
                {
                    services: {
                        auth: {
                            jwt: {
                                secret: env('JWT_SECRET', string())
                            }
                        }
                    }
                },
                { JWT_SECRET: 'my-secret-key' }
            );
            expect(config.services.auth.jwt.secret).toBe('my-secret-key');
            expectTypeOf(config.services.auth.jwt.secret).toBeString();
        });
    });

    describe('defaults', () => {
        it('applies default when env var is absent', () => {
            const config = parseEnv(
                {
                    host: env('DB_HOST', string().default('localhost')),
                    port: env('DB_PORT', number().coerce().default(5432))
                },
                {}
            );
            expect(config.host).toBe('localhost');
            expect(config.port).toBe(5432);
            expectTypeOf(config.host).toBeString();
            expectTypeOf(config.port).toBeNumber();
        });

        it('uses env value over default when present', () => {
            const config = parseEnv(
                {
                    host: env('DB_HOST', string().default('localhost'))
                },
                { DB_HOST: 'production-host' }
            );
            expect(config.host).toBe('production-host');
        });
    });

    describe('arrays', () => {
        it('parses comma-separated string into array via splitBy', () => {
            const config = parseEnv(
                {
                    origins: env(
                        'ALLOWED_ORIGINS',
                        array(string()).addPreprocessor(splitBy(','), {
                            mutates: false
                        })
                    )
                },
                { ALLOWED_ORIGINS: 'a, b, c' }
            );
            expect(config.origins).toEqual(['a', 'b', 'c']);
            expectTypeOf(config.origins).toEqualTypeOf<string[]>();
        });

        it('parses comma-separated numbers', () => {
            const config = parseEnv(
                {
                    ports: env(
                        'PORTS',
                        array(number().coerce()).addPreprocessor(splitBy(','), {
                            mutates: false
                        })
                    )
                },
                { PORTS: '3000, 4000, 5000' }
            );
            expect(config.ports).toEqual([3000, 4000, 5000]);
            expectTypeOf(config.ports).toEqualTypeOf<number[]>();
        });
    });

    describe('error handling', () => {
        it('throws EnvValidationError for missing required var', () => {
            expect(() =>
                parseEnv(
                    {
                        host: env('DB_HOST', string())
                    },
                    {}
                )
            ).toThrow(EnvValidationError);
        });

        it('includes var name and config path in missing error', () => {
            try {
                parseEnv(
                    {
                        db: {
                            host: env('DB_HOST', string())
                        }
                    },
                    {}
                );
                expect.unreachable('should have thrown');
            } catch (e) {
                expect(e).toBeInstanceOf(EnvValidationError);
                const err = e as EnvValidationError;
                expect(err.missing).toHaveLength(1);
                expect(err.missing[0].varName).toBe('DB_HOST');
                expect(err.missing[0].configPath).toBe('db.host');
                expect(err.missing[0].type).toBe('string');
            }
        });

        it('reports invalid values', () => {
            try {
                parseEnv(
                    {
                        port: env('DB_PORT', number().coerce())
                    },
                    { DB_PORT: 'not-a-number' }
                );
                expect.unreachable('should have thrown');
            } catch (e) {
                expect(e).toBeInstanceOf(EnvValidationError);
                const err = e as EnvValidationError;
                expect(err.invalid).toHaveLength(1);
                expect(err.invalid[0].varName).toBe('DB_PORT');
                expect(err.invalid[0].value).toBe('not-a-number');
            }
        });

        it('reports multiple missing vars at once', () => {
            try {
                parseEnv(
                    {
                        db: {
                            host: env('DB_HOST', string()),
                            name: env('DB_NAME', string())
                        },
                        jwt: {
                            secret: env('JWT_SECRET', string())
                        }
                    },
                    {}
                );
                expect.unreachable('should have thrown');
            } catch (e) {
                expect(e).toBeInstanceOf(EnvValidationError);
                const err = e as EnvValidationError;
                expect(err.missing).toHaveLength(3);
                const varNames = err.missing.map(m => m.varName).sort();
                expect(varNames).toEqual(['DB_HOST', 'DB_NAME', 'JWT_SECRET']);
            }
        });

        it('has formatted error message', () => {
            try {
                parseEnv(
                    {
                        host: env('DB_HOST', string())
                    },
                    {}
                );
                expect.unreachable('should have thrown');
            } catch (e) {
                const err = e as EnvValidationError;
                expect(err.message).toContain('Missing environment variables');
                expect(err.message).toContain('DB_HOST');
                expect(err.message).toContain('host');
            }
        });
    });

    describe('mixed config', () => {
        it('handles a realistic full config', () => {
            const config = parseEnv(
                {
                    db: {
                        host: env('DB_HOST', string().default('localhost')),
                        port: env('DB_PORT', number().coerce().default(5432)),
                        name: env('DB_NAME', string())
                    },
                    jwt: {
                        secret: env('JWT_SECRET', string().minLength(8))
                    },
                    debug: env('DEBUG', boolean().coerce().default(false)),
                    origins: env(
                        'ALLOWED_ORIGINS',
                        array(string()).addPreprocessor(splitBy(','), {
                            mutates: false
                        })
                    )
                },
                {
                    DB_NAME: 'prod',
                    JWT_SECRET: 'super-secret-key',
                    ALLOWED_ORIGINS: 'https://a.com, https://b.com'
                }
            );
            expect(config.db.host).toBe('localhost');
            expect(config.db.port).toBe(5432);
            expect(config.db.name).toBe('prod');
            expect(config.jwt.secret).toBe('super-secret-key');
            expect(config.debug).toBe(false);
            expect(config.origins).toEqual(['https://a.com', 'https://b.com']);
            expectTypeOf(config.db.host).toBeString();
            expectTypeOf(config.db.port).toBeNumber();
            expectTypeOf(config.db.name).toBeString();
            expectTypeOf(config.jwt.secret).toBeString();
            expectTypeOf(config.debug).toBeBoolean();
            expectTypeOf(config.origins).toEqualTypeOf<string[]>();
        });
    });
});

describe('parseEnvFlat()', () => {
    it('parses flat schemas using keys as var names', () => {
        const config = parseEnvFlat(
            {
                DB_HOST: string().default('localhost'),
                DB_PORT: number().coerce().default(5432),
                JWT_SECRET: string()
            },
            {
                JWT_SECRET: 'secret123'
            }
        );
        expect(config.DB_HOST).toBe('localhost');
        expect(config.DB_PORT).toBe(5432);
        expect(config.JWT_SECRET).toBe('secret123');
        expectTypeOf(config.DB_HOST).toBeString();
        expectTypeOf(config.DB_PORT).toBeNumber();
        expectTypeOf(config.JWT_SECRET).toBeString();
    });

    it('throws EnvValidationError for missing flat vars', () => {
        expect(() =>
            parseEnvFlat(
                {
                    REQUIRED: string()
                },
                {}
            )
        ).toThrow(EnvValidationError);
    });
});

describe('parseEnv() with compute callback', () => {
    it('computes a derived value from base config', () => {
        const config = parseEnv(
            {
                db: {
                    host: env('DB_HOST', string()),
                    port: env('DB_PORT', number().coerce()),
                    name: env('DB_NAME', string())
                }
            },
            base => ({
                connectionString: `postgres://${base.db.host}:${base.db.port}/${base.db.name}`
            }),
            {
                DB_HOST: 'localhost',
                DB_PORT: '5432',
                DB_NAME: 'mydb'
            }
        );
        expect(config.db.host).toBe('localhost');
        expect(config.db.port).toBe(5432);
        expect(config.db.name).toBe('mydb');
        expect(config.connectionString).toBe('postgres://localhost:5432/mydb');
        expectTypeOf(config.connectionString).toBeString();
        expectTypeOf(config.db.host).toBeString();
        expectTypeOf(config.db.port).toBeNumber();
    });

    it('deep-merges nested computed values into base config', () => {
        const config = parseEnv(
            {
                db: {
                    host: env('DB_HOST', string()),
                    port: env('DB_PORT', number().coerce())
                }
            },
            base => ({
                db: {
                    url: `postgres://${base.db.host}:${base.db.port}`
                }
            }),
            {
                DB_HOST: 'localhost',
                DB_PORT: '5432'
            }
        );
        expect(config.db.host).toBe('localhost');
        expect(config.db.port).toBe(5432);
        expect(config.db.url).toBe('postgres://localhost:5432');
        expectTypeOf(config.db.host).toBeString();
        expectTypeOf(config.db.port).toBeNumber();
        expectTypeOf(config.db.url).toBeString();
    });

    it('computes multiple derived values', () => {
        const config = parseEnv(
            {
                host: env('HOST', string()),
                port: env('PORT', number().coerce()),
                debug: env('DEBUG', boolean().coerce().default(false))
            },
            base => ({
                baseUrl: `http://${base.host}:${base.port}`,
                isVerbose: base.debug
            }),
            {
                HOST: 'example.com',
                PORT: '3000'
            }
        );
        expect(config.baseUrl).toBe('http://example.com:3000');
        expect(config.isVerbose).toBe(false);
        expectTypeOf(config.baseUrl).toBeString();
        expectTypeOf(config.isVerbose).toBeBoolean();
        expectTypeOf(config.host).toBeString();
        expectTypeOf(config.port).toBeNumber();
    });

    it('works without explicit source (uses process.env)', () => {
        const originalEnv = process.env;
        process.env = { ...originalEnv, TEST_VAR: 'hello' };
        try {
            const config = parseEnv(
                {
                    value: env('TEST_VAR', string())
                },
                base => ({
                    upper: base.value.toUpperCase()
                })
            );
            expect(config.value).toBe('hello');
            expect(config.upper).toBe('HELLO');
            expectTypeOf(config.upper).toBeString();
        } finally {
            process.env = originalEnv;
        }
    });

    it('throws EnvValidationError when base env vars are invalid', () => {
        expect(() =>
            parseEnv(
                {
                    host: env('DB_HOST', string())
                },
                base => ({
                    url: `http://${base.host}`
                }),
                {}
            )
        ).toThrow(EnvValidationError);
    });
});
