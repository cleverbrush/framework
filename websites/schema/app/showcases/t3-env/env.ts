/**
 * T3 Env schema defined entirely with @cleverbrush/schema.
 *
 * Every @cleverbrush/schema builder implements the Standard Schema v1
 * interface, so it can be passed directly to createEnv — no adapter needed.
 *
 * This file is the canonical example of the integration.
 * Import `env` wherever you need type-safe access to environment variables.
 */

import { boolean, number, string } from '@cleverbrush/schema';
import { createEnv } from '@t3-oss/env-nextjs';

export const env = createEnv({
    server: {
        /** PostgreSQL / any JDBC-style connection string */
        DATABASE_URL: string()
            .required('DATABASE_URL is required')
            .matches(
                /^(postgres|postgresql|mysql|sqlite):\/\/.+/,
                'DATABASE_URL must be a valid database connection string'
            ),

        /** Secret used to sign API tokens — must be at least 32 characters */
        API_SECRET: string()
            .required('API_SECRET is required')
            .minLength(32, 'API_SECRET must be at least 32 characters'),

        /** HTTP port the server listens on (will be coerced from string) */
        PORT: number()
            .min(1, 'PORT must be ≥ 1')
            .max(65535, 'PORT must be ≤ 65535'),

        /** Log level — one of debug | info | warn | error */
        LOG_LEVEL: string()
            .required('LOG_LEVEL is required')
            .matches(
                /^(debug|info|warn|error)$/,
                'LOG_LEVEL must be one of: debug, info, warn, error'
            )
    },

    client: {
        /** Public API base URL exposed to the browser */
        NEXT_PUBLIC_API_URL: string()
            .required('NEXT_PUBLIC_API_URL is required')
            .matches(
                /^https?:\/\/.+/,
                'NEXT_PUBLIC_API_URL must be a valid http/https URL'
            ),

        /** Whether to display the analytics banner */
        NEXT_PUBLIC_ENABLE_ANALYTICS: boolean()
    },

    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        API_SECRET: process.env.API_SECRET,
        PORT: process.env.PORT ? Number(process.env.PORT) : undefined,
        LOG_LEVEL: process.env.LOG_LEVEL,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_ENABLE_ANALYTICS:
            process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
    }
});
