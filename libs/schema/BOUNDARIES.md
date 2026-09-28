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
`decode` at untrusted boundaries. Global strict null rejection is a separate,
compatibility-sensitive follow-up.

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

## Declare both sides of a conversion

```ts
import { decode, type InferInput, type InferOutput, number, object, string }
    from '@cleverbrush/schema';

const PageSize = decode(
    string(),
    number().isInteger().min(1).max(100),
    value => Number(value)
);
const SearchInput = object({
    pageSize: PageSize,
    term: string().default('')
});

type Editable = InferInput<typeof SearchInput>; // pageSize is string
type Validated = InferOutput<typeof SearchInput>; // pageSize is number
const request = SearchInput.parse({ pageSize: '20' });
```

Parsing validates the input, invokes the converter once, then validates its
output. Converter exceptions/rejections become validation failures. Asynchronous
converters require `parseAsync`/`validateAsync`; synchronous parsing rejects
Promise-returning conversion. Runtime parsing always validates unknown values.

Nested objects, arrays, tuples, records, unions, intersections, references and
lazy schemas retain input/output inference. Recursive schemas still require
explicit TypeScript annotations. Standard Schema exposes the corresponding
input/output types. `InferOutput` is an alias for `InferType`.

An input-schema default runs before conversion. A default on the boundary itself
is an **output** default, validated without conversion. Optional/nullable
use-site modifiers bypass conversion for their allowed sentinel values.

### Application-agnostic example

```ts
const Priority = decode(
    string().oneOf('low', 'normal', 'high'),
    number().min(1).max(3),
    value => ({ low: 1, normal: 2, high: 3 })[value]
);
const Ticket = object({ title: string().minLength(1), priority: Priority });
Ticket.parse({ title: 'Improve documentation', priority: 'high' });
// { title: 'Improve documentation', priority: 3 }
```

Conversion policy remains application-owned: trimming, empty strings, numeric
precision, date formats and intentional data loss are not global defaults.

## JSON Schema and OpenAPI

```ts
import { toJsonSchema, withStandardJsonSchema } from '@cleverbrush/schema-json';

toJsonSchema(PageSize, { mode: 'input' });  // declared string shape
toJsonSchema(PageSize, { mode: 'output' }); // constrained numeric shape
toJsonSchema(PageSize);                    // output remains the default

const standard = withStandardJsonSchema(PageSize)['~standard'];
standard.jsonSchema.input({ target: 'draft-2020-12' });
standard.jsonSchema.output({ target: 'draft-2020-12' });
```

Converters are never executed by schema export. JSON Schema describes the
declared shapes, not arbitrary converter logic or opaque custom validators.

OpenAPI uses input views for requests and output views for responses. Named
schemas with different views receive `NameInput` and `NameOutput` components;
unchanged views retain their original name. Generated-name collisions throw,
including collisions propagated through nested named or recursive references.
AsyncAPI incoming/outgoing payloads use the same directional model.

## Adoption boundary

This release does **not** redesign React form state or typed HTTP client request
inference. Those consumers may still assume input equals output. Do not treat a
decoder as a drop-in shared form/endpoint contract for those APIs.

Until that adoption, keep an explicit wire schema in shared contracts and decode
inside the application boundary/handler, then return the validated output DTO.
A decoder is not an encoder: no reverse conversion is inferred for requests,
URLs, response serialization, database writes or editable form state.
