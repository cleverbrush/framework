# @cleverbrush/schema

## 3.1.0

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.

## 3.0.0

### Major Changes

- 60efc99: Add `.coerce()` to `number()`, `boolean()`, and `date()` builders

  A new fluent `.coerce()` method on three schema builders that adds a preprocessor to convert string values to the target type. Useful when input comes from string sources like URL parameters, form inputs, or parse-string schemas.

  ### `number().coerce()`

  Converts string values to numbers using `Number(value)`. Non-string values pass through unchanged.

  ```ts
  const schema = number().coerce();
  schema.validate("42"); // { valid: true, object: 42 }
  schema.validate("hello"); // { valid: false } — NaN fails number validation
  schema.validate(7); // { valid: true, object: 7 } — non-string passthrough
  ```

  ### `boolean().coerce()`

  Converts `"true"` → `true` and `"false"` → `false`. Other values pass through unchanged so the boolean schema rejects them.

  ```ts
  const schema = boolean().coerce();
  schema.validate("true"); // { valid: true, object: true }
  schema.validate("false"); // { valid: true, object: false }
  schema.validate("yes"); // { valid: false } — unrecognized string
  ```

  ### `date().coerce()`

  Converts string values to `Date` using `new Date(value)`. Invalid date strings are left unchanged so the date schema rejects them. Non-string values pass through unchanged.

  ```ts
  const schema = date().coerce();
  schema.validate("2024-01-15"); // { valid: true, object: Date }
  schema.validate("not-a-date"); // { valid: false } — invalid date string
  schema.validate(new Date()); // { valid: true } — Date passthrough
  ```

  All three methods return a new immutable schema instance (consistent with the builder pattern) and can be chained with any other fluent method.

- 2f06dc4: Add `addParameter()` and `hasReturnType()` to `FunctionSchemaBuilder`

  `func()` schemas can now describe their parameter types and return type using the fluent API:

  ```ts
  import { func, string, number, InferType } from "@cleverbrush/schema";

  const greet = func()
    .addParameter(string()) // (param0: string, ...) => any
    .addParameter(number().optional()) // (param0: string, param1: number | undefined) => any
    .hasReturnType(string()); // (...) => string

  // TypeScript infers the full signature
  type Greet = InferType<typeof greet>;
  // (param0: string, param1: number | undefined) => string
  ```

  - **`addParameter(schema)`** — appends a parameter schema; each call extends the inferred tuple of parameter types. Chainable.
  - **`hasReturnType(schema)`** — sets the return type schema; replaces any previously set return type in the inferred signature.
  - **`introspect().parameters`** — array of all accumulated parameter schemas.
  - **`introspect().returnType`** — the return type schema, or `undefined` if not set.

  All existing fluent methods (`.optional()`, `.nullable()`, `.default()`, `.required()`, `.readonly()`, `.brand()`, etc.) preserve the accumulated `TParameters` and `TReturnTypeSchema` generics correctly.

- f0f93ba: Add `generic()` schema builder

  A new `GenericSchemaBuilder` and `generic()` factory enable reusable, type-safe parameterized schemas whose TypeScript type is inferred from the template function's generic signature.

  ## Basic usage — single type parameter

  ```ts
  import {
    generic,
    object,
    array,
    number,
    string,
    type InferType,
  } from "@cleverbrush/schema";

  // Define a reusable paginated-list template
  const PaginatedList = generic(
    <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
      object({
        items: array(itemSchema),
        total: number(),
        page: number(),
      })
  );

  const userSchema = object({ name: string(), age: number() });
  const PaginatedUsers = PaginatedList.apply(userSchema);

  type PaginatedUsersType = InferType<typeof PaginatedUsers>;
  // → { items: { name: string; age: number }[]; total: number; page: number }

  PaginatedUsers.validate({
    items: [{ name: "Alice", age: 30 }],
    total: 1,
    page: 1,
  });
  // { valid: true }
  ```

  ## Multiple type parameters

  ```ts
  const Result = generic(
    <
      T extends SchemaBuilder<any, any, any, any, any>,
      E extends SchemaBuilder<any, any, any, any, any>
    >(
      valueSchema: T,
      errorSchema: E
    ) =>
      object({
        ok: boolean(),
        value: valueSchema.optional(),
        error: errorSchema.optional(),
      })
  );

  const StringResult = Result.apply(string(), number());
  // InferType → { ok: boolean; value?: string; error?: number }
  ```

  ## With default arguments (direct validation without `.apply()`)

  Pass a positional defaults array as the first argument to enable direct `.validate()` on the template itself:

  ```ts
  const AnyList = generic(
    [any()], // default args — one per template parameter
    <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
      object({ items: array(itemSchema), total: number() })
  );

  // Validate directly using the any() default:
  AnyList.validate({ items: [1, "two", true], total: 3 }); // valid

  // Or apply a concrete schema first:
  AnyList.apply(string()).validate({ items: ["a", "b"], total: 2 }); // valid
  ```

  ## API

  - `generic(templateFn)` — wraps a generic function; call `.apply()` before validating
  - `generic(defaults, templateFn)` — wraps a generic function with default arguments; can validate directly
  - `.apply(...args)` — calls the template with concrete schemas; returns the concrete builder
  - All standard builder methods work: `.optional()`, `.required()`, `.nullable()`, `.default()`, `.catch()`, `.readonly()`, `.brand()`, `.hasType()`, etc.
  - `introspect()` exposes `type: 'generic'`, `templateFn`, and `defaults`
  - Compatible with the extension system — extensions can target the `"generic"` builder type

- 0df3d59: Add `addConstructor()` and `clearConstructor()` to `ObjectSchemaBuilder`

  `object()` schemas can now declare constructor overloads using the fluent API. Each `.addConstructor()` call appends a `FunctionSchemaBuilder` to the accumulated list of constructor signatures. The inferred type becomes an intersection of all construct signatures and the plain instance type.

  ```ts
  import { object, func, string, number, InferType } from "@cleverbrush/schema";

  const PersonSchema = object({ name: string(), age: number() })
    .addConstructor(func().addParameter(string())) // new(name: string): ...
    .addConstructor(func().addParameter(string()).addParameter(number())); // new(name, age): ...

  type Person = InferType<typeof PersonSchema>;
  // { new(p0: string): { name: string; age: number } }
  // & { new(p0: string, p1: number): { name: string; age: number } }
  // & { name: string; age: number }

  declare const Person: Person;
  const instance = new Person("Alice");
  ```

  - **`addConstructor(funcSchema)`** — appends a constructor overload; each call extends the accumulated tuple of constructor schemas. Chainable.
  - **`clearConstructors()`** — resets constructor schemas to an empty list, removing all construct signatures from the inferred type.
  - **`introspect().constructorSchemas`** — array of all accumulated constructor `FunctionSchemaBuilder` schemas.
  - Constructor signatures are **type-only**: runtime `validate()` still validates plain objects as before.

  All existing fluent methods (`.optional()`, `.nullable()`, `.default()`, `.required()`, `.readonly()`, `.brand()`, `.addProp()`, `.omit()`, `.pick()`, `.partial()`, `.intersect()`, etc.) preserve the accumulated `TConstructorSchemas` generics correctly.

- 0cc7cbe: Add `parseString()` schema builder

  A new `ParseStringSchemaBuilder` and `parseString()` factory that validates a string against a template pattern and parses it into a strongly-typed object. Uses a tagged-template syntax with type-safe property selectors.

  ### Basic Usage

  ```ts
  import {
    parseString,
    object,
    string,
    number,
    type InferType,
  } from "@cleverbrush/schema";

  const RouteSchema = parseString(
    object({ userId: string().uuid(), id: number().coerce() }),
    ($t) => $t`/orders/${(t) => t.id}/${(t) => t.userId}`
  );

  type Route = InferType<typeof RouteSchema>;
  // { userId: string; id: number }

  const result = RouteSchema.validate(
    "/orders/42/550e8400-e29b-41d4-a716-446655440000"
  );
  // result.valid === true
  // result.object === { id: 42, userId: '550e8400-...' }
  ```

  ### Key Features

  - **Tagged-template API** — `$t => $t\`/path/${t => t.prop}\`` with full IntelliSense on the property selectors.
  - **Type-safe selectors** — only properties whose inferred type extends `string | number | boolean | Date` are selectable.
  - **Nested objects** — navigate deep properties via `t => t.order.id`.
  - **Coercion via property schemas** — property schemas handle their own coercion (e.g. `number().coerce()`, `date().coerce()`). The builder passes raw captured strings directly to each property schema's `validate()`.
  - **Sync & async** — both `validate()` and `validateAsync()` are supported; async is auto-detected.
  - **Full fluent chain** — `.optional()`, `.nullable()`, `.default()`, `.brand()`, `.readonly()`, `.required()`, `.hasType()`, `.clearHasType()` all work and preserve type inference.
  - **Error messages** — segment-level errors include the property path (e.g. `"id: expected an integer number"`).
  - **`doNotStopOnFirstError`** — collects all segment errors when the context flag is set.

- 181f89e: Add `promise()` schema builder

  A new `PromiseSchemaBuilder` and `promise()` factory let you validate that a value is a JavaScript `Promise` and optionally annotate the resolved value type:

  ```ts
  import { promise, string, number, InferType } from "@cleverbrush/schema";

  // Untyped — accepts any Promise
  const anyPromise = promise();
  anyPromise.validate(Promise.resolve(42)); // { valid: true }
  anyPromise.validate("not a promise"); // { valid: false }

  // Typed resolved value via factory argument
  const stringPromise = promise(string());
  type StringPromise = InferType<typeof stringPromise>;
  // → Promise<string>

  // Typed resolved value via fluent method
  const numPromise = promise().hasResolvedType(number());
  type NumPromise = InferType<typeof numPromise>;
  // → Promise<number>

  // Optional promise
  const opt = promise(string()).optional();
  type Opt = InferType<typeof opt>;
  // → Promise<string> | undefined
  ```

  - **`promise(schema?)`** — factory function. When `schema` is provided the inferred type is `Promise<InferType<typeof schema>>`.
  - **`.hasResolvedType(schema)`** — fluent method to set or replace the resolved-value schema. Updates the inferred type to `Promise<T>` and stores the schema in `introspect().resolvedType`.
  - All standard builder methods are supported: `.optional()`, `.nullable()`, `.notNullable()`, `.default(value)`, `.required()`, `.readonly()`, `.brand()`, `.hasType<T>()`, `.addValidator(fn)`, `.addPreprocessor(fn)`, `.describe(text)`.
  - Sub-path export added: `@cleverbrush/schema/promise`.

- 8979127: Add typed HTTP client (`@cleverbrush/client`) and API contract system.

  ### `@cleverbrush/client` (new package)

  - `createClient(contract, options)` — creates a two-level Proxy-based HTTP client
    from an API contract defined with `defineApi()`. All endpoint arguments (params,
    body, query, headers) and response types are inferred at compile time — zero
    code generation required.
  - `ApiError` — typed error class thrown on non-2xx responses, carrying `status`,
    `message`, and parsed `body`.
  - Type utilities: `EndpointCallArgs<E>`, `EndpointResponse<E>`, `TypedClient<T>`,
    `ClientOptions`.

  ### `@cleverbrush/server`

  - New `@cleverbrush/server/contract` entry point — browser-safe re-exports of
    `endpoint`, `EndpointBuilder`, `route()`, `createEndpoints`, and type helpers
    without pulling in the Node.js server runtime.
  - `defineApi(contract)` — typed identity function that defines a one-level grouped
    API contract. Each group is a record of named `EndpointBuilder` instances.
    The returned contract is frozen to prevent accidental mutation.
  - Exported types: `ApiContract`, `ApiGroup`.

  ### `@cleverbrush/schema`

  - `ParseStringSchemaBuilder.serialize(params)` — reverse of `validate()`.
    Reconstructs a string from the template by substituting parameter values.
    Used by `@cleverbrush/client` to build URL paths at runtime.

- b8f1285: Emit the OpenAPI `discriminator` keyword for discriminated unions

  **`@cleverbrush/schema`** — `UnionSchemaBuilder.introspect()` now exposes
  `discriminatorPropertyName: string | undefined`. When all union branches are
  object schemas sharing a required property with unique literal values, this
  field returns the property name (e.g. `'type'`). Otherwise it is `undefined`.

  **`@cleverbrush/schema-json`** — `toJsonSchema()` emits
  `discriminator: { propertyName }` alongside `anyOf` for discriminated unions.
  When a `nameResolver` is provided and union branches resolve to `$ref` pointers,
  a `mapping` object is also emitted mapping each discriminator value to its
  corresponding `$ref` path.

  This enables code-generation consumers (openapi-generator, orval, etc.) to
  produce proper tagged union types from the generated OpenAPI specs.

  `@cleverbrush/server-openapi` benefits automatically — no code changes needed
  in that package.

- 3473d7e: Add `.example()` to `SchemaBuilder` and `.example()` / `.examples()` to `EndpointBuilder`

  **Schema-level examples:**

  - New `.example(value)` method on `SchemaBuilder` stores a typed example value
  - `toJsonSchema()` emits the value as a JSON Schema `examples` array
  - Flows through to OpenAPI parameter and response schemas automatically

  **Endpoint-level examples:**

  - New `.example(value)` method on `EndpointBuilder` sets a single request body example
  - New `.examples(map)` method sets named examples with `{ summary?, description?, value }`
  - Both emit on the OpenAPI Media Type Object (`application/json`)
  - Pre-fills "Try it out" in Swagger UI without manual editing

- 308c9ea: Add `.schemaName()` and `components/schemas` `$ref` deduplication

  ### `@cleverbrush/schema`

  New method `.schemaName(name: string)` on every schema builder. Attaches an OpenAPI component name to the schema as runtime metadata (accessible via `.introspect().schemaName`). Has no effect on validation. Follows the same immutable-builder pattern as `.describe()`.

  ```ts
  import { object, string, number } from "@cleverbrush/schema";

  export const UserSchema = object({
    id: number(),
    name: string(),
  }).schemaName("User");

  UserSchema.introspect().schemaName; // 'User'
  ```

  ### `@cleverbrush/schema-json`

  New optional `nameResolver` option on `toJsonSchema()`. When provided, it is called for every schema node during recursive conversion. Returning a non-null string short-circuits conversion and emits a `$ref` pointer instead:

  ```ts
  toJsonSchema(schema, {
    $schema: false,
    nameResolver: (s) => s.introspect().schemaName ?? null,
  });
  ```

  ### `@cleverbrush/server-openapi`

  Named schemas are now automatically collected into `components.schemas` and referenced via `$ref` throughout the generated OpenAPI document:

  ```ts
  import { object, string, number, array } from '@cleverbrush/schema';
  import { generateOpenApiSpec } from '@cleverbrush/server-openapi';
  import { endpoint } from '@cleverbrush/server';

  export const UserSchema = object({ id: number(), name: string() })
      .schemaName('User');

  const GetUser   = endpoint.get('/users/:id').returns(UserSchema);
  const ListUsers = endpoint.get('/users').returns(array(UserSchema));

  // Both operations emit $ref: '#/components/schemas/User'
  // A single components.schemas.User entry holds the full definition.
  generateOpenApiSpec({ registrations: [...], info: { title: 'API', version: '1' } });
  ```

  Two different schema instances with the same name throw at generation time — uniqueness is the caller's responsibility.

  New exports from `@cleverbrush/server-openapi`:

  - `SchemaRegistry` — low-level registry class (for custom tooling)
  - `walkSchemas` — recursive schema walker used by the pre-pass

- 26a7d85: Support property-targeted errors from object-level validators

  `ValidationError` now accepts an optional `property` selector that routes
  the error to a specific property, making it visible via `getErrorsFor()`.
  This uses the same selector signature as `getErrorsFor()` and react-form's
  `forProperty`, so no new concepts are introduced.

  ```typescript
  const SignupSchema = object({
    password: string().minLength(8),
    confirmPassword: string().minLength(8),
  }).addValidator((value) => {
    if (value.password !== value.confirmPassword) {
      return {
        valid: false,
        errors: [
          {
            message: "Passwords do not match",
            property: (t) => t.confirmPassword,
          },
        ],
      };
    }
    return { valid: true };
  });

  const result = SignupSchema.validate(
    { password: "secret1", confirmPassword: "secret2" },
    { doNotStopOnFirstError: true }
  );

  // Error is now routed to the confirmPassword property:
  const confirmErrors = result.getErrorsFor((t) => t.confirmPassword);
  console.log(confirmErrors.errors); // ['Passwords do not match']

  // Other properties are not affected:
  const passwordErrors = result.getErrorsFor((t) => t.password);
  console.log(passwordErrors.errors); // []
  ```

  Additionally, object-level validator errors are now correctly routed through
  `getErrorsFor()` when `doNotStopOnFirstError: true` is used. Previously,
  these errors were only present in the flat `errors` array and were invisible
  to `getErrorsFor()`.

## 2.0.0

### Major Changes

- 13ce119: # Release 2.0.0

  ## @cleverbrush/schema

  ### Major Changes

  - **Property Descriptor system** — new `PropertyDescriptor`, `PropertyDescriptorTree`, and `PropertyDescriptorInner` types that allow programmatic navigation, getting, and setting of values within nested object schemas. Property descriptors act as type-safe pointers to individual properties (similar to expression trees in C# .NET).
  - **`ObjectSchemaBuilder.getPropertiesFor(schema)`** — new static method to obtain a property descriptor tree for any object schema.
  - **`ObjectSchemaBuilder.isValidPropertyDescriptor(descriptor)`** — new static method to validate whether an object is a valid property descriptor.
  - **Enhanced validation error reporting** — `ObjectSchemaValidationResult` now exposes a `getErrorsFor(selector)` method that returns per-property validation results (`PropertyValidationResult`) for any property in the schema tree.
  - **Removed `path` from `ValidationError`** — the `ValidationError` type is now `{ message: string }` instead of `{ path: string; message: string }`. String-based path concatenation was a major performance bottleneck. Use `getErrorsFor()` with PropertyDescriptors for per-property error inspection instead — it is type-safe and zero-cost on the valid path.
  - **Removed `path` from `ValidationContext`** — the `path` field on `ValidationContext` has been removed. It was only used internally to build the now-removed `ValidationError.path` strings.
  - **`ArraySchemaValidationResult.getNestedErrors()`** — returns per-element validation results including element-level errors and root-level array errors.
  - **`PropertyValidationResult` class** — new mutable container for tracking per-property validation errors, child errors, and accumulated error messages during object validation.
  - **Custom error messages on `required()`** — all schema builders (`string`, `number`, `boolean`, `date`, `array`, `object`, `any`, `function`, `union`) now accept an optional `errorMessage` parameter on `.required()` for custom required-field messages.
  - **Custom error messages on validation constraints** — `minLength`, `maxLength`, `min`, `max`, `equals`, and other constraint methods across builders now accept optional custom error message providers.
  - **`TupleSchemaBuilder`** — new `tuple([...schemas])` factory for fixed-length arrays with per-position type checking. Supports an optional `.rest(schema)` for trailing variadic elements. `TupleSchemaValidationResult.getNestedErrors()` returns per-position validation results alongside root-level tuple errors. Exported as the `tuple()` factory and via the `@cleverbrush/schema/tuple` sub-path.
  - **`RecordSchemaBuilder`** — new `record(valueSchema)` factory for `Record<string, V>` validation (unknown keys, uniform value type). Accepts an optional key schema (`record(keySchema, valueSchema)`) to validate key format with a string schema. `RecordSchemaValidationResult.getErrorsFor(key)` returns per-entry validation results. Exported as the `record()` factory and via `@cleverbrush/schema/record`.
  - **`LazySchemaBuilder`** — new `lazy(() => schema)` factory for recursive and self-referential schemas (tree nodes, nested menus, threaded comments). The getter is called once on first validation and the result is cached. TypeScript cannot infer recursive types automatically, so an explicit type annotation is required on the variable holding the schema.
  - **`NullSchemaBuilder`** — new `nul()` factory for schemas that accept exactly `null`. Required by default (rejects `undefined`); `.optional()` accepts `null | undefined`. Useful for discriminated-union branches and JSON payloads that carry an explicit JSON `null`.
  - **`.nullable()` / `.notNullable()`** — new first-class methods on all `SchemaBuilder` instances. `.nullable()` makes the schema accept `null` as a valid value (type-safe via the `TNullable` generic parameter). `.notNullable()` removes the nullable mark.
  - **`.default(value | factory)`** — new method on all builders. Sets a default value returned when the input is `undefined`. A factory function (`() => value`) should be used for mutable defaults such as arrays and objects. `introspect()` exposes `hasDefault`. `.clearDefault()` removes a previously set default. Type-safe via the `THasDefault` generic parameter.
  - **`.catch(value | factory)`** — new method on all builders. Supplies a fallback for _any_ validation failure (not just `undefined`). When set, `parse()` and `parseAsync()` will never throw. Preserves specialized result shapes (`getErrorsFor` / `getNestedErrors`) when the fallback fires.
  - **`parse()` / `parseAsync()`** — new throwing convenience methods on all builders. `parse(value)` returns the validated value directly or throws `SchemaParseError` on failure. `parseAsync(value)` is the async counterpart. When `.catch()` is configured these methods never throw.
  - **`.describe(text)`** — new method on all builders. Attaches a human-readable description to the schema; stored as `description` in `introspect()`.
  - **`.readonly()`** — new method on all builders. Marks a schema as immutable (informational flag surfaced via `introspect().readonly`).
  - **`ObjectSchemaBuilder.deepPartial()`** — recursively makes every property and nested-object property optional. Returns a new builder with the `DeepMakeChildrenOptional<TProperties>` inferred type, suitable for PATCH bodies and partial update payloads.
  - **Sub-path exports** — individual schema builders can now be imported directly. Available sub-paths: `@cleverbrush/schema/string`, `/number`, `/boolean`, `/object`, `/array`, `/date`, `/any`, `/union`, `/tuple`, `/record`, `/function`.
  - **Extension system** — new `defineExtension(config)` and `withExtensions(...descriptors)` API for adding custom fluent methods to any schema builder type. Extensions support auto-inferred metadata, introspection via `schema.introspect().extensions`, method name collision detection, and full compatibility with `InferType`. Extension metadata survives all fluent operations (`.optional()`, `.required()`, `.addProp()`, `.partial()`, etc.). Extended builders remain `instanceof` their base class.
  - **Built-in extension pack** — common validators are now included out of the box via a pre-applied extension pack. String: `.email()`, `.url()`, `.uuid()`, `.ip()`, `.trim()`, `.toLowerCase()`, `.nonempty()`. Number: `.positive()`, `.negative()`, `.finite()`, `.multipleOf(n)`. Array: `.nonempty()`, `.unique(keyFn?)`. Enum: `.oneOf(...values)` on both `StringSchemaBuilder` and `NumberSchemaBuilder` — constrains a string or number to a specific set of allowed literal values; the inferred type narrows to a string/number literal union. Top-level `enumOf(...values)` factory as convenience sugar for `string().oneOf(...)`. All validator extensions accept an optional error message as a separate parameter — either a string or a `ValidationErrorMessageProvider` function, following the same pattern as built-in constraints (e.g. `.minLength(n, errorMessage?)`). The extension descriptors (`stringExtensions`, `numberExtensions`, `arrayExtensions`) are exported for composition with custom extensions.
  - **`/core` sub-path export** — `@cleverbrush/schema/core` exports bare builders without the built-in extension pack, for consumers who want to apply only their own extensions.
  - **Low-level extension API** — `withExtension(key, value)` / `getExtension(key)` methods available on all `SchemaBuilder` instances for manual metadata management.
  - **Standard Schema v1** — all `SchemaBuilder` instances expose a `['~standard']` property implementing the `StandardSchemaV1` interface from `@standard-schema/spec`. This makes every schema directly usable with ecosystem tooling that targets the Standard Schema specification (TanStack Form, T3 Env, etc.). New peer dependency: `@standard-schema/spec@^1.1.0`.
  - **`extern()` / `ExternSchemaBuilder`** — new `extern(standardSchema)` factory that wraps any [Standard Schema v1](https://standardschema.dev/) compatible schema (Zod, Valibot, ArkType, etc.) into a `@cleverbrush/schema` builder. Validation is delegated to the external schema's `['~standard'].validate()` — no reimplementation needed. TypeScript type is inferred from `StandardSchemaV1.InferOutput`. Proxy-based lazy `PropertyDescriptorTree` makes `getErrorsFor(t => t.nested.field)` navigate through extern boundaries. `ExternSchemaBuilder` is exported for advanced use (extending). Available via the main `@cleverbrush/schema` import and the `@cleverbrush/schema/extern` sub-path.
  - **Enhanced schema type branding** — improved type branding and inference for `SchemaBuilder` to enable better compile-time type safety. `.brand<TBrand>()` method available on all builders.
  - **Removed default export** from `@cleverbrush/deep` (used internally) — named exports only.

  ### JSDoc Improvements

  - Comprehensive JSDoc annotations added across all schema builders (`SchemaBuilder`, `StringSchemaBuilder`, `NumberSchemaBuilder`, `BooleanSchemaBuilder`, `DateSchemaBuilder`, `ArraySchemaBuilder`, `ObjectSchemaBuilder`, `UnionSchemaBuilder`, `AnySchemaBuilder`, `FunctionSchemaBuilder`, `TupleSchemaBuilder`, `RecordSchemaBuilder`, `LazySchemaBuilder`, `NullSchemaBuilder`).
  - Added `@example` blocks with usage snippets for `InferType`, validation types, and error message providers.
  - Documented `PropertyValidationResult` class methods and internal validation types.
  - Added JSDoc to `transaction.ts` utility functions.

  ### Build & Tooling

  - Migrated from `tsc` to `tsup` for bundling with sourcemap generation enabled.
  - Added proper `exports` field in `package.json` with `types` and `import` conditions.
  - Migrated tests from Jest to Vitest; replaced `tsd` type assertions with `vitest` `expectTypeOf`.

  ***
