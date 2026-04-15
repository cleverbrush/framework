import { env, parseEnv } from '@cleverbrush/env';
import { number, string } from '@cleverbrush/schema';

export const config = parseEnv(
    {
        db: {
            host: env('DB_HOST', string().default('localhost')),
            port: env('DB_PORT', number().coerce().default(5432)),
            name: env('DB_NAME', string().default('todo_db')),
            user: env('DB_USER', string().default('postgres')),
            password: env('DB_PASSWORD', string().default('postgres'))
        },
        jwt: {
            secret: env('JWT_SECRET', string().minLength(32)),
            expiresInSeconds: env(
                'JWT_EXPIRES_IN',
                number().coerce().default(3600)
            )
        },
        server: {
            port: env('PORT', number().coerce().default(3000)),
            host: env('HOST', string().default('0.0.0.0'))
        },
        logLevel: env('LOG_LEVEL', string().default('info')),
        nodeEnv: env('NODE_ENV', string().default('production'))
    },
    base => ({
        db: {
            connectionString: `postgresql://${base.db.user}:${base.db.password}@${base.db.host}:${base.db.port}/${base.db.name}`
        }
    })
);

export type Config = typeof config;
