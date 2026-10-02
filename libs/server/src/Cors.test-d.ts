import { expectTypeOf, it } from 'vitest';
import {
    createServer,
    ServerBuilder,
    type ServerCorsOptions
} from './index.js';

it('supports exact, readonly and asynchronous origin policies through the public builder', () => {
    const options = {
        origin: ['https://app.example.test'],
        methods: ['POST'],
        allowedHeaders: ['authorization'],
        exposedHeaders: ['x-request-id'],
        credentials: true,
        maxAgeSeconds: 600
    } as const satisfies ServerCorsOptions;
    expectTypeOf(
        createServer().useCors(options)
    ).toEqualTypeOf<ServerBuilder>();
    new ServerBuilder().useCors({ origin: '*' });
    new ServerBuilder().useCors({ origin: 'https://app.example.test' });
    new ServerBuilder().useCors({
        origin: value => value.endsWith('.example.test')
    });
    new ServerBuilder().useCors({
        origin: async value => {
            expectTypeOf(value).toEqualTypeOf<string>();
            return true;
        }
    });
    // @ts-expect-error An explicit origin policy is required.
    new ServerBuilder().useCors({});
    // @ts-expect-error CORS cannot be enabled without configuration.
    new ServerBuilder().useCors();
    new ServerBuilder().useCors({
        // @ts-expect-error Origin callbacks decide permission with a boolean.
        origin: async () => 'https://app.example.test'
    });
    // @ts-expect-error Allowed headers are an explicit list, not a string policy.
    new ServerBuilder().useCors({ origin: '*', allowedHeaders: '*' });
});
