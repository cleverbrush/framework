# Schemas across boundaries

`InferType<S>` continues to mean validated output;
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
import { number, object, string } from '@cleverbrush/schema';

const User = object({ id: number(), name: string() }).schemaName('User');
const History = object({
    current: User,
    previous: User.nullable().optional()
        .describe('The previous user, when known.')
});
```

No wrapper is needed. Ordinary immutable modifiers keep the concrete builder,
fluent methods, extension methods, inference, and nested property selectors.
They validate normally; canonical-reference metadata only affects exporters.
The original definition is never mutated. Reuse the plain constant when there
are no local modifiers. Independent definitions sharing a name still conflict;
there is no name-based or structural deduplication.

### Which changes preserve the named definition?

- Use-site presence/nullability: `optional`, `required`, `nullable`, `notNullable`.
- Annotations: `describe`, `example`, `readonly`.
- Type-only changes: `brand`, `hasType`, `clearHasType`, `optimize`.

Chains of these modifiers always reference the original canonical definition,
not another alias. Calling `schemaName` explicitly creates a new independent
definition, even when the previous name is reused.

### Shape and rule changes become unnamed

Property additions/removals, `partial`, `pick`, `omit`, constraints, validators,
preprocessors, defaults, fallbacks, and their clear methods discard the inherited
name and canonical association. Extension changes detach conservatively, too.
These derivatives cannot safely claim to be the original definition. Later
annotations or optionality do not reconnect them.

```ts
const PartialUser = User.partial(); // unnamed, all properties optional
const UserWithEmail = User.addProp('email', string()); // unnamed, new shape
const PublicUser = User.omit('id').schemaName('PublicUser'); // new definition
const ShortName = string().schemaName('Name').maxLength(20); // unnamed rule change
```

Existing nested named schemas still reuse their own definitions. To retain a
stable component name after a shape or rule change, call `schemaName` **last**.
This intentionally changes inherited-name behavior; review code that relied on
constraint/property modifications retaining the old component name.

JSON Schema/OpenAPI keeps one definition and uses reference composition for
local annotations, examples and nullability, including Draft 07 references.

## Defaults and validation

Defaults and fallbacks retain ordinary builder behavior, not delegated wrapper
behavior. Adding or clearing either detaches the name. Clearing a default removes
it completely; it does not reveal a hidden canonical default. Async validators
and preprocessors still require `parseAsync`/`validateAsync`.

Use `InferType` for schema inference and the existing `hasType` method when an
explicit static override is needed. Static overrides and casts do not change
runtime validation or convert values.

## API documents

JSON Schema, OpenAPI and AsyncAPI retain one canonical component per named
target. Reference annotations compose around that definition rather than
changing it. Named recursive references are supported; independently rebuilt
schemas with the same name still conflict. Standard JSON Schema `input()` and
`output()` retain their existing identical representation.
