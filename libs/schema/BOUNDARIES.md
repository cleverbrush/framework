# Schemas across boundaries

These APIs are additive. `InferType<S>` continues to mean validated output;
existing builder generic arguments and legacy preprocessors keep their meaning.

## Optional fallbacks

Before, consumers needed a separate safeParse helper for each optional scalar.
Now a fallback can use the optional or nullable schema's full output type:

```ts
import { boolean, object, string } from '@cleverbrush/schema';

const optionalText = string().optional().catch(undefined);
const ExternalRecord = object({
    name: optionalText,
    enabled: boolean().optional().catch(() => undefined)
});
ExternalRecord.parse({ name: 42, enabled: 'unknown' });
// { name: undefined, enabled: undefined }
```

Fallbacks are opt-in. A malformed required root object still fails. Arrays do
not silently discard invalid elements. A fallback factory runs only on failure.

**Compatibility limitation:** legacy optional schemas also accept `null` at
runtime, even though their inferred type does not include it. This release does
not change that behavior. Consequently, `.optional().catch(undefined)` leaves
`null` unchanged. Normalize it explicitly when the application requires this:

```ts
const normalizedText = string().optional()
    .addPreprocessor(value => value == null ? undefined : value)
    .catch(undefined);
```

Preprocessors can return optional/nullable values, including asynchronously.
Their existing callback parameter typing is preserved; it is not a guarantee
that unknown runtime input already has that type. Use explicit guards or
preprocessing/conversion followed by validation at untrusted boundaries.
Global strict null rejection is a separate, compatibility-sensitive follow-up.

## One named definition, many annotated references

Before, cloning `User.schemaName('User')` with `.optional()` created another
named instance and conflicted during OpenAPI generation.

```ts
import { number, object, schemaRef, string } from '@cleverbrush/schema';

const User = object({ id: number(), name: string() }).schemaName('User');
const History = object({
    current: schemaRef(User),
    previous: schemaRef(User).nullable().optional()
        .describe('The previous user, when known.')
});
```

`schemaRef` requires a named target. Its local modifiers do not rename, clone,
or mutate that target. References delegate validation and preserve nested
property selectors/errors. Independent schemas sharing a name still conflict;
there is no name-only deduplication. Use-site optionality controls omission;
nullability controls null acceptance for the wrapper independently.

JSON Schema/OpenAPI keeps one definition and uses reference composition for
local annotations, examples and nullability, including Draft 07 references.

## Defaults and validation

A default on the reference overrides missing values at that use site and is
validated by the target. Clearing it leaves any target default intact. Local
fallbacks use the existing catch semantics. Async target validators and local
callbacks require `parseAsync`/`validateAsync`.

Use `InferType` for schema inference and the existing `hasType` method when an
explicit static override is needed. Static overrides and casts do not change
runtime validation or convert values.

## API documents

JSON Schema, OpenAPI and AsyncAPI retain one canonical component per named
target. Reference annotations compose around that definition rather than
changing it. Named recursive references are supported; independently rebuilt
schemas with the same name still conflict. Standard JSON Schema `input()` and
`output()` retain their existing identical representation.
