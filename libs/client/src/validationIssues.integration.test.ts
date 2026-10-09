// @vitest-environment node
import { array, object, string } from '@cleverbrush/schema';
import {
    createServer,
    defineApi,
    endpoint,
    implement
} from '@cleverbrush/server';
import { expect, test } from 'vitest';
import { createClient } from './client.js';
import { batching } from './middlewares/batching.js';
import { decodeValidationIssues } from './validationIssues.js';

test.each([false, true])(
    'real HTTP validation survives serialization (batched=%s)',
    async batched => {
        const schema = object({
            addresses: array(object({ city: string().minLength(2) }))
        });
        const api = defineApi({
            profiles: {
                save: endpoint
                    .post('/profiles')
                    .body(schema)
                    .responses({ 200: schema })
            }
        });
        const handlers = implement(api)
            .group('profiles')
            .withHandlers({ save: ({ body }) => body });
        const server = await createServer()
            .useBatching()
            .handleAll(implement(api).use(handlers).complete())
            .listen(0);
        try {
            const client = createClient(api, {
                baseUrl: `http://127.0.0.1:${server.address!.port}`,
                middlewares: batched ? [batching({ windowMs: 5 })] : []
            });
            let decoded: unknown;
            const [valid] = await Promise.all([
                client.profiles.save({
                    body: { addresses: [{ city: 'Paris' }] }
                }),
                client.profiles
                    .save({ body: { addresses: [{ city: '' }] } })
                    .catch(error => {
                        decoded = decodeValidationIssues(error, {
                            source: 'body'
                        });
                    })
            ]);
            expect(valid).toEqual({ addresses: [{ city: 'Paris' }] });
            expect(JSON.parse(JSON.stringify(decoded))).toEqual(
                expect.arrayContaining([
                    { pointer: '/addresses/0/city', detail: expect.any(String) }
                ])
            );
            expect(
                await client.profiles.save({
                    body: { addresses: [{ city: 'Paris' }] }
                })
            ).toEqual({ addresses: [{ city: 'Paris' }] });
        } finally {
            await server.close();
        }
    }
);
