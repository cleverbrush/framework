---
'@cleverbrush/server': minor
---

Add contract composition utilities — `mergeContracts`, `pickGroups`, and `omitGroups`.

## `@cleverbrush/server` — contract composition

Three new functions exported from both `@cleverbrush/server` and
`@cleverbrush/server/contract` make it straightforward to define
audience-scoped API bundles.

### `mergeContracts<A, B>(a, b)`

Combines two `ApiContract` objects into one frozen contract. Groups that
only exist in one source are passed through unchanged; groups whose key
appears in **both** have their endpoint maps shallowly merged. The TypeScript
return type is `MergedContracts<A, B>` — a precise mapped type that reflects
the combined shape.

```ts
const publicApi  = defineApi({ todos: {...}, auth: {...} });
const adminApi   = defineApi({ admin: { activityLog: ... } });
const fullApi    = mergeContracts(publicApi, adminApi);
// TypeScript: { todos, auth, admin }
```

### `pickGroups<T, K>(contract, ...groups)`

Returns a new frozen contract containing only the listed groups. The return
type is `Pick<T, K>` — the compiler sees exactly those groups and nothing
else.

```ts
const clientApi = pickGroups(fullApi, 'todos', 'auth');
// TypeScript: { todos, auth }
// 'admin' is absent at both the type level and runtime
```

### `omitGroups<T, K>(contract, ...groups)`

Inverse of `pickGroups` — strips the listed groups and keeps everything else.
Return type is `Omit<T, K>`.

```ts
const publicApi = omitGroups(fullApi, 'admin', 'debug');
// TypeScript: { todos, auth }
```

### Bundle isolation pattern

Define separate entry-point files that export different contract slices:

```
shared-contracts/src/public.ts  → export const publicApi  = defineApi({ ... })
shared-contracts/src/full.ts    → export const fullApi    = mergeContracts(publicApi, adminApi)
```

Client apps import `publicApi`; admin apps import `fullApi`. Admin schemas
are never included in the client bundle.
