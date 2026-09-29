import { number, object, string } from '@cleverbrush/schema';
import {
    ActionResult,
    errorMap,
    type Handler,
    type HandlerMapping,
    implement,
    withErrors
} from '@cleverbrush/server';
import { defineApi, endpoint, pickGroups } from '@cleverbrush/server/contract';
import { expectTypeOf, test } from 'vitest';
import { api } from '../type-fixtures/contracts.js';
import type { create } from '../type-fixtures/handlers/create.js';
import { list } from '../type-fixtures/handlers/list.js';
import { remove } from '../type-fixtures/handlers/remove.js';
import {
    itemsImplementation,
    live,
    reads,
    writes
} from '../type-fixtures/module.js';
import { missingItem } from '../type-fixtures/policies.js';
import { Db, items } from '../type-fixtures/scope.js';
import { mapping } from '../type-fixtures/server.js';

test('cross-file declarations preserve exact request, DI and return types', () => {
    expectTypeOf(mapping).toEqualTypeOf<HandlerMapping>();
    expectTypeOf<Parameters<typeof list>[0]['query']>().toEqualTypeOf<{
        search: string;
    }>();
    expectTypeOf<Parameters<typeof list>[0]['principal']>().toEqualTypeOf<{
        userId: string;
    }>();
    expectTypeOf<Parameters<typeof list>[1]>().toEqualTypeOf<{
        db: { name: string };
    }>();
    expectTypeOf<Parameters<typeof create>[1]>().toEqualTypeOf<{
        db: { name: string };
        mailer: { host: string };
    }>();
    expectTypeOf<Parameters<typeof remove>[0]['params']>().toEqualTypeOf<{
        id: number;
    }>();
    expectTypeOf<Parameters<typeof list>[0]>().not.toBeAny();
    items.pick('list').withHandlers({
        list: ({ query }, { db }) => {
            expectTypeOf(query.search).toEqualTypeOf<string>();
            expectTypeOf(db.name).toEqualTypeOf<string>();
            // @ts-expect-error undeclared query property
            query.missing;
            return [];
        }
    });
    const wrong = () => ActionResult.created([]);
    // @ts-expect-error independently declared handlers cannot return an undeclared status
    const checked: Handler<typeof items.endpoints.list> = wrong;
    const noMailer: Handler<typeof items.endpoints.list> = (_ctx, services) => {
        // @ts-expect-error per-operation mailer does not leak into list
        services.mailer;
        return [];
    };
    void checked;
    void noMailer;
});

test('coverage, identity-compatible slices, and exact keys survive composition', () => {
    implement(api).use(itemsImplementation, live).complete();
    implement(pickGroups(api, 'items')).use(reads, writes).complete();
    // @ts-expect-error live.changes has not been registered
    implement(api).use(itemsImplementation).complete();
    // @ts-expect-error an empty root is incomplete
    implement(api).complete();
    // @ts-expect-error missing selected operations
    items.withHandlers({ list });
    // @ts-expect-error duplicate operation in the same use call
    implement(api).use(reads, reads);
    // @ts-expect-error duplicate operation across calls
    implement(api).use(reads).use(reads);
    // @ts-expect-error unknown group
    implement(api).group('unknown');
    // @ts-expect-error unknown operation
    items.pick('unknown');
    implement(api).group('items', {
        // @ts-expect-error unknown operation-specific configuration
        operations: { unknown: { summary: 'No' } }
    });
    const extra = { list, unknown: list };
    // @ts-expect-error extra keys also rejected from named objects
    items.pick('list').withHandlers(extra);
    const changed = defineApi({
        items: { list: endpoint.get('/items').responses({ 200: string() }) }
    });
    const changedModule = implement(changed)
        .group('items')
        .withHandlers({ list: () => 'different' });
    // @ts-expect-error incompatible response contract
    implement(api).use(changedModule);
});

test('service overrides and authorization retain inference', () => {
    const contract = defineApi({
        things: {
            get: endpoint
                .get('/things')
                .inject({ original: Db, db: Db })
                .responses({ 200: string() })
        }
    });
    const scope = implement(contract).group('things', {
        inject: { db: object({ shared: number() }) },
        authorize: object({ subject: string() }),
        operations: { get: { inject: { db: object({ specific: string() }) } } }
    });
    scope.withHandlers({
        get: ({ principal }, { original, db }) => {
            expectTypeOf(principal.subject).toEqualTypeOf<string>();
            expectTypeOf(original.name).toEqualTypeOf<string>();
            expectTypeOf(db).toEqualTypeOf<{ specific: string }>();
            return db.specific;
        }
    });
});

test('error responses are constrained even when an endpoint declares 204', () => {
    withErrors(items.endpoints.remove, missingItem, remove);
    // @ts-expect-error list does not declare 404
    withErrors(items.endpoints.list, missingItem, list);
    items.pick('list').withHandlers({
        // @ts-expect-error descriptors enforce the same policy check
        list: { handler: list, errors: missingItem }
    });
    const wrongBody = errorMap().on(Error, () =>
        ActionResult.notFound({ message: 42 })
    );
    // @ts-expect-error wrong body must not be accepted via the declared 204 branch
    withErrors(items.endpoints.remove, wrongBody, remove);
    const wrongStatus = errorMap().on(Error, () =>
        ActionResult.forbidden({ message: 'No' })
    );
    // @ts-expect-error undeclared status must not be accepted via 204
    withErrors(items.endpoints.remove, wrongStatus, remove);
    const raw = errorMap().on(Error, () => ActionResult.raw(() => {}));
    // @ts-expect-error raw response cannot bypass a policy contract check
    withErrors(items.endpoints.remove, raw, remove);
    // @ts-expect-error a declared responses map is required, even for an empty policy
    withErrors(endpoint.get('/legacy'), errorMap(), () => 'legacy');
    implement(api)
        .group('live')
        .withHandlers({
            // @ts-expect-error error policies are HTTP-only
            changes: { handler: async function* () {}, errors: missingItem }
        });
});
