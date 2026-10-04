import { number, object, string } from '@cleverbrush/schema';
import { expectTypeOf } from 'vitest';
import {
    ActionResult,
    createServer,
    defineApi,
    type EndpointOptions,
    endpoint,
    implement
} from './index.js';

const Db = object({ tenant: string() });
const api = defineApi({
    items: {
        create: endpoint
            .post('/items')
            .idempotent()
            .body(object({ amount: number(), tenant: string().optional() }))
            .responses({ 201: string() })
    }
});
const scope = implement(api).group('items', { inject: { db: Db } });
const options: EndpointOptions<typeof scope.endpoints.create> = {
    prepare: async (request, { db }) => {
        expectTypeOf(request.body.amount).toEqualTypeOf<number>();
        expectTypeOf(db.tenant).toEqualTypeOf<string>();
        return { ...request, body: { ...request.body, tenant: db.tenant } };
    },
    idempotency: { scope: async ({ body }, { db }) => [db.tenant, body.amount] }
};
createServer().handle(
    scope.endpoints.create,
    () => ActionResult.created('ok'),
    options
);
scope.withHandlers({
    create: { ...options, handler: () => ActionResult.created('ok') }
});
const invalid: EndpointOptions<typeof scope.endpoints.create> = {
    // @ts-expect-error preparation must preserve the typed action context
    prepare: () => ({ body: { amount: 'invalid' } })
};
void invalid;
