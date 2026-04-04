# Improvement Plan & Growth Strategy

> **Last updated:** April 3, 2026. **Status:** Pre-publication — library and website are built but not yet publicly released.

The framework has matured significantly. The core schema library, extension system, mapper, react-form, and schema-json packages are all implemented with tests. A full Next.js website with 32 interactive playground examples, migration guide, and API docs is ready. CI/CD is configured. The focus now shifts from building foundations to **publishing, performance, filling remaining API gaps, and growing adoption**.

---

## Current State Summary

### What's Built

| Area | Status | Notes |
|------|--------|-------|
| **Schema core** | Done | 11 builders (String, Number, Boolean, Date, Object, Array, Union, Function, Any, Null, + base), sync/async validation, branded types, immutable fluent API |
| **Extension system** | Done | `defineExtension()` + `withExtensions()`, type-safe plugin architecture |
| **Built-in extensions** | Done | String: email, url, uuid, ip, trim, toLowerCase, nonempty. Number: positive, negative, finite, multipleOf. Array: nonempty, unique |
| **Sync Parse API** | Done | `validate()`, `validateAsync()`, `parse()`, `parseAsync()`, `safeParse()`, `safeParseAsync()` |
| **Branded types** | Done | `.brand<'Email'>()` with `Brand<T, TBrand>` utility type |
| **Object composition** | Done | `.addProps()`, `.intersect()`, `.pick()`, `.omit()`, `.partial()`, `.modifyPropSchema()`, `.acceptUnknownProps()` / `.notAcceptUnknownProps()` |
| **PropertyDescriptors** | Done | Runtime introspection tree — the architectural differentiator |
| **Mapper** | Done | Schema-driven object mapping with `.from()`, `.compute()`, `.ignore()`, auto-mapping |
| **React Form** | Done | Headless schema-driven forms: `FormProvider`, `Field`, `useSchemaForm()`, custom renderers |
| **Schema JSON** | Done | Bidirectional JSON Schema interop: `toJsonSchema()` + `fromJsonSchema()` with type inference |
| **Deep** | Done | `deepEqual()`, `deepExtend()`, `deepFlatten()`, `hashObject()` |
| **Async** | Done | `Collector`, `debounce()`, `throttle()`, `retry()` |
| **Scheduler** | Done | Cron-like job scheduler with worker threads, schema-validated schedules |
| **Knex-ClickHouse** | Done | Knex dialect for ClickHouse with retry logic; tests added |
| **Website** | Done (unpublished) | Next.js 16, landing page, docs for all packages, playground (32 examples), "Migrating from Zod" guide, API docs (TypeDoc) |
| **CI/CD** | Done | GitHub Actions: `ci.yml` (lint + build + test), `release.yml` (changesets publish) |
| **Community files** | Done | CONTRIBUTING.md, CODE_OF_CONDUCT.md |
| **Benchmarks** | Done (excellent results) | vs zod/yup/joi — **schema is #1 in 14/15 benchmarks**, 1.3–2.2x faster than zod on valid input, 8–230x faster on invalid input |
| **Discriminated Unions** | Not needed | Works naturally with `union()` + `.equals()`, documented in playground |

### What's NOT Built — Feature Gaps vs Zod

| Feature | Zod API | Current workaround | Impact |
|---------|---------|-------------------|--------|
| **Transform/Pipe** | `.transform(fn)`, `.pipe(schema)` | `.addPreprocessor()` + `@cleverbrush/mapper` | Low — mapper handles object reshaping with type-safe `.compute()`, preprocessors handle coercion; only inline single-field type-changing is uncovered |
| **Default values** | `.default(value)` | ✅ `.default(value \| () => value)` | ✅ DONE |
| **Recursive schemas** | `z.lazy(() => schema)` | ✅ `lazy(() => schema)` — `LazySchemaBuilder` | High — tree structures, comments, menus |
| **Nullable** | `.nullable()` | ✅ `.nullable()` — built-in extension on all builders | ✅ DONE |
| **Enum builder** | `z.enum(['a', 'b'])` | `union(string().equals('a')).or(string().equals('b'))` | Medium — verbose workaround |
| **Tuple** | `z.tuple([str, num])` | Not possible | Medium — fixed-length typed arrays |
| **Record** | `z.record(keySchema, valSchema)` | Not possible | Medium — dynamic-key objects |
| **Deep partial** | `.deepPartial()` | `.partial()` on top level only | Low-medium — useful for PATCH APIs |
| **Catch/fallback** | `.catch(fallback)` | None | Low-medium |
| **Readonly** | `.readonly()` | ✅ `.readonly()` — type-level `Readonly<T>` / `ReadonlyArray<T>` | ✅ DONE |
| **Describe** | `.describe('...')` | JSDoc on schemas (preserved in types, not at runtime) | Low |
| **Coercion namespace** | `z.coerce.string()` | `.addPreprocessor()` | Low — preprocessors cover this |
| **Literal builder** | `z.literal(42)` | `number().equals(42)` or `string().equals('x')` | Low — equality operators work |
| **Map/Set/Promise** | `z.map()`, `z.set()`, `z.promise()` | Not possible | Low — niche use cases |

---

## Phase 1: Publish & Launch

**Goal:** Get the library into users' hands. Nothing else matters until the library is publicly available.

### 1.1 Publish to npm

- Merge the `mapper` branch to `master`
- Run changesets release to publish all 8 packages as v2.0.0
- Verify all sub-path exports resolve correctly (`@cleverbrush/schema/core`, `/string`, etc.)
- Test installation from npm in a fresh project

### 1.2 Deploy the website

- Deploy to production (Dockerfile is ready, Next.js standalone output configured)
- Set up a domain (e.g. `framework.cleverbrush.com` or similar)
- Verify playground, API docs, and all pages work in production
- Ensure GTM tracking fires

### 1.3 GitHub repo polish

- Write a compelling README.md for the monorepo root (quick pitch, feature list, links)
- Add badges: npm version, CI status, license, bundle size
- Create GitHub issue templates: `bug_report.yml`, `feature_request.yml`
- Add `PULL_REQUEST_TEMPLATE.md`
- Add "good first issue" labels for contributor onboarding
- Enable GitHub Discussions

---

## Phase 2: Performance & Critical Gaps

**Goal:** Address the biggest objections a developer evaluating the library would have. Performance is now resolved (schema beats zod in nearly every benchmark). The remaining focus is closing critical API gaps — "does it have X?".

### 2.1 Performance optimization ✅ DONE

Performance work on the `feature/performance` branch has transformed benchmarks from a liability into a competitive advantage. **@cleverbrush/schema now ranks #1 in 14 out of 15 benchmarks** across primitives, objects, arrays, and unions.

**Results vs Zod (ops/s):**

| Benchmark | Schema | Zod | Ratio |
|-----------|--------|-----|-------|
| Array 100 objects (valid) | 70,001 | 32,282 | **2.17x faster** |
| Array 100 objects (invalid) | 2,816,587 | 12,255 | **230x faster** |
| Complex order (valid) | 447,420 | 274,238 | **1.63x faster** |
| Complex order (invalid) | 2,159,649 | 68,471 | **31.5x faster** |
| Flat object (valid) | 2,064,271 | 1,424,508 | **1.45x faster** |
| Flat object (invalid) | 5,032,145 | 336,995 | **14.9x faster** |
| Nested object (valid) | 1,215,356 | 780,329 | **1.56x faster** |
| Nested object (invalid) | 5,549,210 | 172,313 | **32.2x faster** |
| String (valid) | 10,188,501 | 7,914,923 | **1.29x faster** |
| String (invalid) | 11,420,265 | 1,171,617 | **9.75x faster** |
| Number (valid) | 13,149,357 | 7,406,617 | **1.78x faster** |
| Number (invalid) | 11,122,316 | 1,335,207 | **8.33x faster** |
| Union first branch (text) | 3,860,391 | 2,834,793 | **1.36x faster** |
| Union last branch (video) | 1,292,859 | 1,390,194 | 0.93x (zod 7% faster) |
| Union no match (invalid) | 11,294,887 | 953,427 | **11.8x faster** |

**Key takeaways:**
- Valid input: consistently **1.3–2.2x faster** than zod
- Invalid input: **8–230x faster** than zod (early-exit optimization)
- Also beats joi and yup in virtually every benchmark
- Only loss: union match-last-branch, where zod is ~7% faster — effectively a tie

**Remaining work:**
- Merge `feature/performance` branch to `master`
- Add benchmark CI job to track regressions
- Performance is now a marketing strength, not a concern

### 2.2 Transform & Pipe — Deprioritized (Low)

Zod's `.transform(fn)` and `.pipe(schema)` are post-validation value transformations that change the output type. After analysis, **~90% of real-world transform usage is already covered** by existing tools:

- **Object reshaping** (the #1 use case) — `@cleverbrush/mapper` does this *better* than Zod transforms: type-safe selectors via `.compute()`, auto-mapping for same-name fields, compile-time completeness checking, and async support. Zod transforms lose property-level type safety and don't verify all output fields are covered.
- **Value coercion** (trim, lowercase, string→number) — `.addPreprocessor()` handles pre-validation coercion, and string extensions (`trim()`, `toLowerCase()`) cover the most common cases.
- **The remaining gap** is narrow: inline per-field type change within a single schema (e.g. `string().datetime().transform(s => new Date(s))` where `InferInput` is `string` but `InferOutput` is `Date`). This is a convenience pattern, not a blocker — the mapper handles it at the object level.

May revisit post-launch if user demand materializes, but this is not a launch blocker.

### 2.3 Default values ✅ DONE

`.default(value | () => value)` is implemented on `SchemaBuilder`:

- Returns the default when the input is `undefined`
- Changes the type from `T | undefined` to `T`
- Works with `.optional()` — `string().optional().default('')` yields `string`
- Accepts static values or factory functions (`() => new Date()`, `() => []`)
- Zero performance cost on the fast-path — default is a dedicated field, not a preprocessor
- Validated against the schema's constraints (invalid defaults are caught)
- Exposed via `.introspect()` as `hasDefault` and `defaultValue`
- 29 tests covering all builders, factory functions, InferType inference, async, parse/safeParse

### 2.4 Recursive schemas ✅ DONE

`lazy(() => schema)` is implemented as `LazySchemaBuilder`:

- Defers schema resolution to first validation call (getter is cached after first call)
- Works inside `array()`, `object()`, and `union()` — covers trees, comments, menus, org charts
- `resolve()` public method lets tooling (schema-json, mapper) access the resolved inner schema
- `introspect()` returns `{ type: 'lazy', getter }` — plays nicely with `UnionSchemaBuilder` discriminator detection (falls back to O(n) scan, which is correct)
- Requires explicit TypeScript type annotation on the outer schema variable — same as Zod, because TypeScript fundamentally cannot infer recursive types automatically
- Full fluent API: `.optional()`, `.required()`, `.addPreprocessor()`, `.addValidator()`, `.brand()`, `hasType()`, `clearHasType()`
- Sync and async validation paths both supported

### 2.5 Nullable convenience ✅ DONE

`.nullable()` is implemented as a built-in extension available on all 9 builder types:

- Shorthand for `union(schema).or(nul())` — implemented via the extension system, not the base class
- Changes inferred type from `T` to `T | null`
- Available on `string`, `number`, `boolean`, `date`, `object`, `array`, `union`, `func`, and `any`
- Propagates optional-ness: `string().optional().nullable()` accepts `string | null | undefined`
- Call before `.nullable()` to chain builder-specific methods: `string().email().nullable()`
- Fixed a pre-existing bug in `UnionSchemaBuilder`: required unions now correctly let options evaluate `null` (required check no longer short-circuits `null` before trying options)
- All 9 existing `ExtendedX` type aliases updated; 6 new explicit factory exports (`boolean`, `date`, `object`, `union`, `func`, `any`) with proper typed overrides so the IDE shows the correct `UnionSchemaBuilder` return type instead of the wrong same-builder type
- Exported: `nullableExtension`, `NullableMethod<TBuilder>`, `NullableReturn<TBuilder>` from `@cleverbrush/schema`
- 45 tests covering all 9 builder types, chaining, async, optional combos, object nesting, and type inference

---

## Phase 3: Adoption & Marketing

**Goal:** Get the first 100 GitHub stars and first external contributor. This is where the library transitions from "built" to "adopted".

### 3.1 Launch announcements

- **Blog post**: "Introducing @cleverbrush/schema — a type-safe, introspectable alternative to Zod" on dev.to, Medium, Hashnode
- **Reddit**: Post to r/typescript, r/reactjs, r/javascript, r/node with honest comparison
- **Twitter/X**: Thread showing the PropertyDescriptor advantage with code examples
- **Hacker News**: "Show HN" post focused on the unique ecosystem story (schema → mapper → forms)

### 3.2 "Why @cleverbrush?" comparison page on website

A dedicated page that honestly shows:

- **PropertyDescriptors** — runtime introspection that enables mapper, react-form, and tooling zod can't support
- **Type-safe extensions** — first-class plugin system, not just `.refine()` hacks
- **JSDoc preservation** — IDE tooltips come from schema definitions
- **Complete ecosystem** — validation → mapping → forms from one schema definition
- **Benchmark results** — schema is faster than zod in 14/15 benchmarks, dramatically faster on invalid input

### 3.3 Contributor experience

- Tag 10-15 issues as "good first issue" covering: new extension validators, doc improvements, new playground examples, performance micro-optimizations
- Write a "Your First Extension" tutorial in the contributing guide
- Respond to issues/PRs within 24 hours in the early days
- Acknowledge all contributions in release notes

### 3.4 SEO & discoverability

- Submit to package discovery sites: npms.io, Snyk Advisor, Socket.dev
- Add to "awesome-typescript" and "awesome-react" lists
- Write comparison blog posts that rank for "zod alternative", "typescript validation library"
- Ensure npm package descriptions and keywords are search-optimized

### 3.5 Integrations & recipes

Show real-world patterns with code examples (playground or blog):

- Environment variable parsing with `@cleverbrush/schema`
- API request/response validation in Express/Fastify
- Form validation with React + react-form
- Database row → domain model mapping with mapper
- JSON Schema round-trip with schema-json for OpenAPI

---

## Phase 4: API Surface Completion

**Goal:** Close remaining gaps so that no Feature Request issue says "Zod has X but you don't". These are lower priority because workarounds exist.

### 4.1 Enum builder

`s.enum(['admin', 'user', 'guest'])` — creates a union of string literals. Currently requires verbose `union(string().equals('admin')).or(string().equals('user')).or(...)`.

### 4.2 Tuple builder

`s.tuple([string(), number(), boolean()])` — fixed-length array with per-position types. Needed for function arguments, CSV rows, coordinate pairs.

### 4.3 Record builder

`s.record(string(), number())` — objects with dynamic keys. Needed for dictionaries, lookup tables, i18n bundles.

### 4.4 Deep partial

`.deepPartial()` — recursively makes all nested properties optional. Useful for PATCH API bodies and partial form state.

### 4.5 Catch / fallback

`.catch(fallbackValue)` — use a fallback value when validation fails instead of returning errors. Useful for graceful degradation.

### 4.6 Readonly modifier ✅ DONE

`.readonly()` is implemented on `SchemaBuilder` base class and overridden with precise return types on all 9 concrete builders:

- **Type-level only** — marks the inferred TypeScript type as immutable but does not alter validation behaviour or freeze the value at runtime
- `object(…).readonly()` → `Readonly<{ … }>` (all top-level properties become `readonly`)
- `array(…).readonly()` → `ReadonlyArray<T>` (no `push`, `pop`, etc. at the type level)
- Primitives (`string`, `number`, `boolean`) are identity — already immutable
- `date().readonly()` → `Readonly<Date>`
- `isReadonly` flag exposed via `.introspect()` for tooling
- **Shallow** — only top-level properties are affected; apply `.readonly()` at each nesting level for deep immutability
- Chains naturally with `.optional()` and `.default()`
- Bidirectional JSON Schema interop via `@cleverbrush/schema-json`: `readOnly: true` ↔ `.readonly()`
- Tests covering all builder types, type inference, introspection, chaining with optional/default, async validation

### 4.7 Describe (runtime)

`.describe('Human-readable description')` — attach runtime metadata to any schema. Useful for documentation generation, form labels, and AI tool descriptions.

---

## Phase 5: Ecosystem Expansion

**Goal:** Build integrations that leverage PropertyDescriptors — the library's moat. These are impossible or much harder with Zod because its schemas are opaque.

| Package | What | Why It Matters |
| --- | --- | --- |
| `@cleverbrush/schema-openapi` | Generate OpenAPI 3.1 from schemas (bidirectional) | PropertyDescriptors make this natural; drives API-first team adoption |
| `@cleverbrush/env` | Type-safe `process.env` parsing | Extremely popular use case (t3-env has 1M+ downloads); great standalone entry point |
| `@cleverbrush/schema-ai` | Generate LLM function-calling / tool-use schemas | Hot area; JSDoc + PropertyDescriptors = better tool descriptions for AI agents |
| `@cleverbrush/schema-graphql` | Generate GraphQL types from schemas | Full-stack type safety from schema to API |
| `@cleverbrush/schema-drizzle` | ORM column definitions from schemas | Schema as single source of truth for DB + validation |
| `@cleverbrush/cli` | CLI argument parsing with schemas | Validated + typed CLI args; niche but sticky |
| Vue/Svelte/Solid form libs | Expand react-form to other frameworks | Same PropertyDescriptor pattern, different renderer bindings |

---

## Target User Profile

### Primary: The "Type Safety Maximalist"

**Who they are:**
- Senior TypeScript developer (3-7 years experience)
- Works on a React/Next.js app with a Node.js backend
- Already uses Zod or Yup, but frustrated by limitations
- Values compile-time guarantees and DRY principles
- Likely works at a startup or mid-size company (10-200 engineers)

**What they care about:**
- Single source of truth for types + validation
- Minimal runtime overhead
- IDE experience (autocomplete, go-to-definition, JSDoc tooltips)
- Not writing the same shape twice (schema + mapper + form bindings)
- Library maintainability and long-term support

**Why they'd switch:**
- The ecosystem story: define a schema once, get validation + mapping + forms — no other library does this
- Extensions system: they've hit the limits of `.refine()` and want composable, reusable validators
- PropertyDescriptors: they're building internal tooling that needs to inspect schemas at runtime

### Secondary: The Form-Heavy App Builder

**Who they are:**
- Full-stack developer building data-heavy apps (CRM, admin dashboards, ERP)
- Tired of wiring up validation logic to forms manually
- Wants headless form bindings that work with any UI library

**Why they'd switch:**
- `react-form` generates form fields from schema definitions automatically
- Validation errors map to fields without manual plumbing
- Schema changes propagate to forms at compile time

### Tertiary: The Library/Tooling Author

**Who they are:**
- Building an internal framework, code generator, or developer tool
- Needs to introspect validation schemas at runtime
- Wants to generate docs, OpenAPI specs, or form UIs from schemas

**Why they'd switch:**
- PropertyDescriptors provide a complete introspection tree
- Extension system lets them add domain-specific semantics
- No other validation library exposes this level of runtime metadata

---

## How to Grow the Community

### Make adoption frictionless

1. **Playground is the front door** — every doc page should link to a playground example. First impression should be "I can try this without installing anything"
2. **`npx create-cleverbrush-app`** — scaffold a project with schema + mapper + react-form wired up (future idea)
3. **Copy-paste ready examples** — every API section should have a runnable code block
4. **Codemods** — `npx @cleverbrush/codemod zod-to-schema` to auto-migrate from Zod (ambitious but high-impact)

### Make contributing rewarding

1. **Extensions are the easiest contribution** — each one is a self-contained file with a test, low barrier to entry
2. **"Good first issue" pipeline** — always keep 5+ tagged issues available
3. **Recognize contributors** — name in release notes, contributor badge in README
4. **Discord community** — real-time help and discussion; lower barrier than GitHub issues

### Make the library visible

1. **Write content that ranks** — "Zod vs Cleverbrush", "Best TypeScript validation libraries 2026", "Schema-driven React forms"
2. **Conference talks / meetup presentations** — the PropertyDescriptor story is a compelling technical talk
3. **Integration with popular tools** — tRPC adapter, Hono middleware, Fastify plugin — these show up in other libraries' docs and drive traffic
4. **Sponsor / partner with dev content creators** — get the library into tutorial videos

---

## Strategic Insight

The **PropertyDescriptor system** is the library's moat. Zod schemas are opaque — you can validate with them but can't introspect them to build tooling. `@cleverbrush/schema` schemas are **transparent and introspectable**, enabling an entire ecosystem (mapper, react-form, schema-json, and all of Phase 5) that's architecturally impossible with Zod. This should be the central marketing message.

The secondary moat is the **extension system**. Zod's only customization is `.refine()` — a black-box function with no metadata. Cleverbrush extensions are type-safe, composable, discoverable (via introspection), and can carry metadata. This makes the library a platform, not just a validator.

---

## Immediate Priorities (ordered)

1. ~~**Performance optimization**~~ ✅ Done — schema is now **faster than zod** in 14/15 benchmarks (1.3–2.2x on valid, 8–230x on invalid)
2. **Publish to npm** — nothing else matters until people can `npm install` the library
3. **Deploy the website** — the playground is the best onboarding tool; make it live
4. **Write launch blog post** — announce on dev.to, Reddit, HN — performance is now a headline feature
5. ~~**Add .default()**~~ ✅ Done — `.default(value | () => value)` with factory functions, zero perf cost, 29 tests
6. ~~**Add .transform()**~~ Deprioritized (Low) — mapper's `.compute()` + preprocessors cover ~90% of real-world transform use cases; only inline single-field type-changing is uncovered
6. **Tag "good first issue" items** — prepare for the first wave of visitors to the repo