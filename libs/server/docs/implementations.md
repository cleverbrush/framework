# Modular implementations and shared error policies

`implement` adds server-only configuration and complete handler registration to
an existing shared API contract. It does not replace endpoint builders, change
the wire contract, or require business logic inside one fluent expression.
`errorMap` and `withErrors` also work independently of this registration API.

## A complete multi-file example

The application functions and service registration below are application-owned.
The contract in this example has exactly two operations, so its root is complete.

### Shared contract

```ts
// contracts.ts — browser-safe; no server configuration or handler imports
import { defineApi, endpoint, route } from '@cleverbrush/server/contract';
import { array, number, object, string } from '@cleverbrush/schema';

export const Item = object({ id: number(), title: string() });
const Message = object({ message: string() });
export const Principal = object({ userId: string() });
const resource = endpoint.resource('/items').authorize(Principal);

export const api = defineApi({
    items: {
        list: resource.get().responses({ 200: array(Item) }),
        remove: resource.delete(
            route({ id: number().coerce() })`/${p => p.id}`
        ).responses({ 204: null, 404: Message })
    }
});
```

### Server configuration without handlers

```ts
// features/items/scope.ts
import { implement } from '@cleverbrush/server';
import { api } from '../../contracts.js';
import { DbToken } from '../../di/tokens.js';

export const items = implement(api).group('items', {
    inject: { db: DbToken },
    tags: ['items'],
    operations: {
        list: { summary: 'List items', operationId: 'listItems' },
        remove: { summary: 'Remove an item', operationId: 'removeItem' }
    }
});
```

`items.endpoints` contains immutable, server-configured builders. Export the
scope constant and reference it with `typeof`; do not annotate it with a broad
base type that erases operation names or service types.

### Separate handlers

```ts
// features/items/handlers/list.ts
import type { Handler } from '@cleverbrush/server';
import type { items } from '../scope.js';
import { listItems } from '../../../application/items.js';

export const list: Handler<typeof items.endpoints.list> = (
    { principal }, { db }
) => listItems(db, principal.userId);
```

```ts
// features/items/handlers/remove.ts
import { ActionResult, type Handler } from '@cleverbrush/server';
import type { items } from '../scope.js';
import { removeItem } from '../../../application/items.js';

export const remove: Handler<typeof items.endpoints.remove> = async (
    { params, principal }, { db }
) => {
    await removeItem(db, principal.userId, params.id);
    return ActionResult.noContent();
};
```

The application function can throw a domain exception. Handlers do not need a
repeated catch block. Requests, principals, injected services, and responses are
derived at the handler's declaration site, not inferred retrospectively from a
later registration call. Type-only scope imports avoid runtime import cycles.

### Application-owned policy and feature registration

```ts
// features/items/errors.ts
import { ActionResult, errorMap } from '@cleverbrush/server';
import { MissingItemError } from '../../application/errors.js';

export const itemErrors = errorMap().on(MissingItemError, () =>
    ActionResult.notFound({ message: 'Item not found' })
);
```

```ts
// features/items/index.ts
import { items } from './scope.js';
import { itemErrors } from './errors.js';
import { list } from './handlers/list.js';
import { remove } from './handlers/remove.js';

export const itemsModule = items.withHandlers({
    list,
    remove: { handler: remove, errors: itemErrors }
});
```

Attaching this policy to `list` is a type error: `list` does not declare 404.
Declaring 204 on `remove` does not permit arbitrary other statuses or bodies.

```ts
// server.ts — after the application's ordinary server/DI setup
import { implement } from '@cleverbrush/server';
import { api } from './contracts.js';
import { itemsModule } from './features/items/index.js';

server.handleAll(implement(api).use(itemsModule).complete());
```

`complete()` fails at compile time if an operation is missing, and checks again
at runtime for JavaScript callers and erased types. The output is the existing
`HandlerMapping`. Authentication, validation, caching, batching, middleware,
serialization, logging, and OpenAPI generation use their existing paths.

## Split large features and compose contract slices

```ts
export const reads = items.pick('list').withHandlers({ list });
export const writes = items.pick('remove').withHandlers({
    remove: { handler: remove, errors: itemErrors }
});
export const feature = implement(api).use(reads, writes);

// Partial roots can be exported and composed; finalize only at the full root.
server.handleAll(implement(api).use(feature).complete());
```

Other groups are separate feature modules added to the same `use(...)` call.
Pass modules directly or in a literal tuple, not an array widened to a generic
module type. Duplicate bindings are rejected across modules and calls. Source
endpoint identity is checked at runtime as well: independently recreated
endpoints are not interchangeable just because their TypeScript shapes match.
`pickGroups`, `omitGroups`, and `mergeContracts` preserve endpoint references,
so intentional contract slices can be implemented and recomposed.

Subscriptions use the same scopes, `SubscriptionHandler<typeof scope.endpoints.x>`,
and existing subscription handler descriptors. They count toward completeness.
HTTP error policies are not accepted on subscription handlers and do not change
the WebSocket error protocol.

## Configuration rules

- `inject` merges contract bindings, then group bindings, then operation bindings.
  A same-name binding is replaced by the later value in both the type and runtime
  service map. Other dependencies remain available. Endpoint `.inject()` itself
  retains its existing replacement behavior.
- An operation's `authorize` schema takes precedence over a group's schema;
  existing endpoint roles are retained. Supplying authorization explicitly makes
  even a previously public operation authenticated. Omit it when authorization
  already lives entirely in the shared contract. There is no implicit auth default.
- Operation `tags` replace group tags; group tags replace existing tags. Other
  metadata changes only when supplied: `summary`, `description`, `operationId`,
  and `deprecated: true`. Deprecation is additive and cannot be cleared here.
- Request/response schemas, cache definitions, upload settings, links, examples,
  and other endpoint metadata remain on the shared endpoint. Scopes do not edit
  the wire contract or silently add error responses.
- Handler descriptors support existing per-operation `middlewares`. Configuration
  scopes do not register anything until explicitly bound and composed.

## Error policy behavior and limits

Policies are immutable. Each `.on(ErrorClass, translator)` returns a new policy.
Rules match by `instanceof` in declaration order; put subclasses before base
classes. Both handlers and translators may be synchronous or asynchronous.

Translators return explicit JSON or bodyless `ActionResult` values. Every result
must fit the target endpoint's `.responses()` status/body map. Policies cannot
use raw/file/stream results to escape that check, and endpoints without explicit
responses cannot attach a policy. TypeScript escape hatches (`any`, assertions,
or deliberately erased annotations) still bypass static guarantees; this is not
a replacement for runtime response validation.

Only exceptions from the handler invocation are translated. Authentication,
request validation, DI resolution, middleware, and response serialization are
outside the wrapper. Unknown thrown values are rethrown unchanged. If a translator
fails, its failure propagates without recursively applying the policy again.
Existing centralized handling still logs unexpected failures and sends safe 500
Problem Details. There is no automatic catch-all or exposure of `Error.message`.

Application authors decide which errors are safe to map and which details can
be returned. Framework has no knowledge of domain ownership or privacy rules.

## Incremental adoption

The old `handle` and `mapHandlers` APIs remain unchanged. Adopt just error policies
without migrating registration:

```ts
import { withErrors } from '@cleverbrush/server';

server.handle(
    RemoveItemEndpoint,
    withErrors(RemoveItemEndpoint, itemErrors, removeHandler)
);
```

The returned function can also be placed in an existing handler map. To migrate
registration, move server-only metadata/DI into scopes, type the existing handler
files against `scope.endpoints`, bind feature modules, and finalize at the root.
Keep the shared contract in `/contract` imports; implementation facilities and
policies are server-entry-point exports only.

The repository tests include a strict multi-file consumer against emitted package
declarations and a generated 1,000-operation consumer with one handler per file.
The latter records compiler diagnostics, memory, and timings for both existing
and modular registration without using environment-dependent timing thresholds.
