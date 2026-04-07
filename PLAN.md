# Improvement Plan & Growth Strategy

> **Last updated:** April 7, 2026. **Status:** Pre-publication — all packages built, website ready, benchmarks show market-leading performance. Standard Schema v1 implemented. Shifting focus from features to publishing, ecosystem integration, and adoption.

---

## Current State Summary

### What's Built

| Area | Status | Notes |
|------|--------|-------|
| **Schema core** | ✅ Done | 14 builders (String, Number, Boolean, Date, Object, Array, Union, Tuple, Record, Function, Any, Null, Lazy, **Extern**), sync/async validation, branded types, immutable fluent API |
| **Base methods** | ✅ Done | `.optional()`, `.required()`, `.default()`, `.catch()`, `.readonly()`, `.describe()`, `.brand()`, `.hasType()`, `.addValidator()`, `.addPreprocessor()`, `.introspect()`, `.deepPartial()` (objects) |
| **Extension system** | ✅ Done | `defineExtension()` + `withExtensions()`, type-safe plugin architecture |
| **Built-in extensions** | ✅ Done | String: email, url, uuid, ip, trim, toLowerCase, nonempty, oneOf. Number: positive, negative, finite, multipleOf, oneOf. Array: nonempty, unique. All builders: nullable. Top-level: enumOf |
| **PropertyDescriptors** | ✅ Done | Runtime introspection tree — the architectural differentiator |
| **Mapper** | ✅ Done | Schema-driven object mapping: `.from()`, `.compute()`, `.ignore()`, auto-mapping, compile-time completeness checking |
| **React Form** | ✅ Done | Headless: `FormProvider`, `Field`, `useSchemaForm()`, custom renderers, schema-driven field generation |
| **Schema JSON** | ✅ Done | Bidirectional: `toJsonSchema()` + `fromJsonSchema()` with type inference |
| **Deep** | ✅ Done | `deepEqual()`, `deepExtend()`, `deepFlatten()`, `hashObject()` |
| **Async** | ✅ Done | `Collector`, `debounce()`, `throttle()`, `retry()` |
| **Scheduler** | ✅ Done | Cron-like job scheduler with worker threads, schema-validated schedules |
| **Knex-ClickHouse** | ✅ Done | Knex dialect for ClickHouse with retry logic |
| **Standard Schema v1** | ✅ Done | `~standard` getter on `SchemaBuilder` base — all 14 builders interoperate with 50+ tools (tRPC, TanStack Form, T3 Env, React Hook Form, Hono, …) |
| **External Schema Interop** | ✅ Done | `extern()` factory wraps any Standard Schema v1 library (Zod, Valibot, ArkType) into a `@cleverbrush/schema` builder. Proxy-based lazy property descriptors, full `getErrorsFor()` navigation, type inference from `StandardSchemaV1.InferOutput` |
| **Website** | ✅ Done (unpublished) | Next.js 16, landing page, docs for all packages, 44 playground examples, "Migrating from Zod" guide, TypeDoc API docs + Standard Schema showcases (TanStack Form, T3 Env) |
| **CI/CD** | ✅ Done | GitHub Actions: `ci.yml` (lint + build + test), `release.yml` (changesets publish) |
| **Community files** | ✅ Done | CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue templates, PR template |
| **Benchmarks** | ✅ Done | **#1 in 14/15 benchmarks** vs Zod/Yup/Joi. 1.2–2.65x faster on valid input, 8–204x faster on invalid input |

### Benchmark Results vs Zod (ops/s)

| Benchmark | Schema | Zod | Ratio |
|-----------|--------|-----|-------|
| Array 100 objects (valid) | 35,228 | 13,277 | **2.65x faster** |
| Array 100 objects (invalid) | 899,329 | 4,396 | **204x faster** |
| Complex order (valid) | 198,988 | 136,090 | **1.46x faster** |
| Complex order (invalid) | 884,706 | 26,106 | **33.9x faster** |
| Flat object (valid) | 1,001,194 | 840,725 | **1.19x faster** |
| Flat object (invalid) | 2,653,630 | 176,222 | **15.1x faster** |
| Nested object (valid) | 690,556 | 368,893 | **1.87x faster** |
| Nested object (invalid) | 2,739,319 | 87,245 | **31.4x faster** |
| String (valid) | 5,348,564 | 3,533,945 | **1.51x faster** |
| String (invalid) | 5,749,087 | 482,961 | **11.9x faster** |
| Number (valid) | 7,911,266 | 4,806,511 | **1.65x faster** |
| Number (invalid) | 5,387,475 | 637,513 | **8.45x faster** |
| Union first branch (text) | 1,925,508 | 1,529,547 | **1.26x faster** |
| Union last branch (video) | 676,107 | 732,682 | 0.92x (zod 8% faster) |
| Union no match (invalid) | 5,873,118 | 385,453 | **15.2x faster** |

### Competitive Landscape (April 2026)

| | Zod (v4.3.6) | @cleverbrush/schema |
|---|---|---|
| **Stars** | 42.3k | Pre-publish |
| **Bundle size** | Zod v3: 14.4 KB gz; Zod v4: **41 KB gz** | **14 KB gz (full) / 4 KB gz (subpath)** |
| **Standard Schema** | ✅ Yes (v3.24+) | ✅ Yes (v1) — [`~standard` on all builders](https://standardschema.dev/) |
| **Runtime introspection** | ~ Limited (`._def` / `._zod.def`, undocumented/unstable API) | ✅ **First-class stable `.introspect()` + PropertyDescriptors** |
| **Extension system** | `.refine()` only (black box) | ✅ **`defineExtension()` — type-safe, composable, introspectable** |
| **Ecosystem integrations** | 50+ tools via Standard Schema (tRPC, RHF, TanStack, Hono, T3 Env...) | ✅ **50+ tools via Standard Schema** + mapper + react-form + schema-json (broader than Zod's ecosystem) |
| **AI/LLM support** | MCP server, llms.txt | ❌ None yet — **PropertyDescriptors are an advantage here** |
| **Performance** | Baseline | ✅ **1.2–2.65x faster on valid input, 8–204x faster on invalid input** |
| **JSON Schema** | Built-in (v4) | ✅ Bidirectional via schema-json |
| **Object mapping** | ❌ None | ✅ **Built-in mapper** |
| **Form generation** | Via 3rd parties (RHF) | ✅ **Built-in react-form** |

**Key insight:** Zod won through ecosystem integrations, not features. Standard Schema is now implemented — @cleverbrush/schema works with 50+ tools out of the box. **`extern()` completes the interop story** — not only can other tools consume our schemas (via `['~standard']`), we can now consume *their* schemas too. PropertyDescriptors + extension system + mapper + forms are the *moat* that no competitor can replicate.

### Remaining Feature Gaps vs Zod

| Feature | Zod API | Current workaround | Priority |
|---------|---------|-------------------|-----------|
| **Transform/Pipe** | `.transform(fn)`, `.pipe(schema)` | `.addPreprocessor()` + `@cleverbrush/mapper` | Low — mapper covers ~90% of use cases |
| **Coercion namespace** | `z.coerce.string()` | `.addPreprocessor()` | Low — preprocessors cover this |
| **Literal builder** | `z.literal(42)` | `number().equals(42)` or `string().equals('x')` | Low — equality operators work |
| **Map / Set** | `z.map()`, `z.set()` | ✅ `any().hasType(Map)` / `any().hasType(Set)` + custom validators | **Not a gap** — covered |
| **Promise** | `z.promise()` | `.hasType<Promise<T>>()` | Low — niche |

---

## Phase 1: Final Pre-Publish Polish ← NOW

**Goal:** Ship the minimum needed to make first impressions excellent.

### 1.1 Enum builder ✅

Implemented as a built-in extension (not a separate builder class) following the same pattern as `nullable`, `email`, `positive`, etc.

- `.oneOf()` extension method on `StringSchemaBuilder` and `NumberSchemaBuilder`
- `enumOf('admin', 'user', 'guest')` top-level convenience factory (sugar for `string().oneOf(...)`)
- Narrows inferred type: `string().oneOf('a', 'b')` → `'a' | 'b'`
- Runtime introspection via `.introspect().extensions.oneOf`
- Chains with `.nullable()`, `.optional()`, `.default()`
- 34 tests (runtime + type-level)
- Playground example, README section, migration guide entry

### 1.2 External Schema Interop (`extern()`) ✅

`extern()` factory function that wraps any [Standard Schema v1](https://standardschema.dev/) compatible library (Zod, Valibot, ArkType, etc.) into a `@cleverbrush/schema` builder. This is the **reverse** of the `['~standard']` getter — instead of exposing our schemas *to* other tools, it lets us *consume* other schemas.

- Single-parameter API: `extern(zodSchema)` — no duplicate property declarations needed
- Validation delegated to the external schema's `['~standard'].validate()`
- TypeScript type inferred from `StandardSchemaV1.InferOutput` — full type safety
- Proxy-based lazy property descriptor tree: `getErrorsFor(t => t.order.id)` works for sub-properties of the external schema
- `SYMBOL_HAS_PROPERTIES` always `true` — `ObjectSchemaBuilder` treats extern properties like native object properties
- Error propagation: `#propagateNestedErrors` reads `__externErrorPropertyNames` to surface per-property errors in the parent object
- 56 tests (runtime + type-level + integration with real Zod)
- `ExternSchemaBuilder` class exported for advanced use (extending); `extern()` factory is the recommended entry point

### 1.3 Bundle size audit ✅

**Measured April 5, 2026** using esbuild single-file bundle + gzip level 9.

#### Results — @cleverbrush/schema

| Entry point | Raw (min) | Gzipped | Brotli |
|-------------|-----------|---------|--------|
| `@cleverbrush/schema` (full index) | 76.8 KB | **14.0 KB** | 12.4 KB |
| `@cleverbrush/schema/core` (no extensions) | 71.1 KB | **12.6 KB** | 11.2 KB |
| `@cleverbrush/schema/string` | 15.7 KB | **3.8 KB** | 3.5 KB |
| `@cleverbrush/schema/number` | 15.4 KB | **3.8 KB** | 3.5 KB |
| `@cleverbrush/schema/object` | 22.8 KB | **5.8 KB** | 5.3 KB |
| `@cleverbrush/schema/array` | 15.6 KB | **4.0 KB** | 3.7 KB |
| `SchemaBuilder` base class alone | 9.8 KB | **2.7 KB** | — |

#### Reference: Zod bundle sizes (same methodology)

| Package | Gzipped | Notes |
|---------|---------|-------|
| Zod v3 (full) | 14.4 KB | Installed: 3.25.76 |
| Zod v4 (full) | 41.0 KB | 3× larger than us |
| Zod v4-mini | 45.3 KB | Larger than v4/core |

> The PLAN's earlier "Zod 2kb core" claim is a Zod marketing reference; **actual Zod numbers** measured above.

#### Verdict

- **Full import: 14 KB gzip** — competitive with Zod v3 (~3% smaller), and **3× smaller than Zod v4**.
- **Sub-path imports: 3.8–5.8 KB gzip** — well within the ≤5 KB goal for primitive builders; `object` just exceeds it.
- **Tree-shaking**: Importing partial symbols from `@cleverbrush/schema` (full index) does NOT tree-shake — the entire `SchemaBuilder` inheritance chain is pulled in. The sub-path exports (`/string`, `/number`, etc.) ARE the mechanism for smaller bundles, and they work as intended. The base `SchemaBuilder` class represents a ~2.7 KB gzip floor (unavoidable — it holds all fluent methods, validation engine, introspection, etc.).
- **Extensions** add only ~1.4 KB gzip on top of core (full index vs core subpath).

#### Actions taken

- ✅ Size is competitive — advertise it
- ✅ Sub-path exports already satisfy tree-shaking use cases
- ✅ Add badge to README: `14 KB gzipped (full)` / `~4 KB gzipped (per builder)`
- ✅ Update competitive table: clarify Zod v4 is **3× larger**, not smaller

### 1.3 Merge & publish

- Merge `mapper` branch → `master`
- Run changesets release: all 8 packages as v2.0.0
- Verify sub-path exports resolve: `@cleverbrush/schema/core`, `/string`, `/object`, etc.
- Test `npm install` in a fresh project — verify TypeScript types, ESM imports, IDE autocomplete

### 1.4 README overhaul (monorepo root) ✅

Completed April 6, 2026. Both root and all library READMEs overhauled:

- Compelling one-liner and elevator pitch with headline numbers upfront
- "One schema, four capabilities" diagram showing the ecosystem architecture
- Performance benchmark table (14/15 vs Zod with concrete ops/s numbers)
- Bundle size comparison table (calling out Zod v4's 3× larger size)
- Competitive feature comparison table (PropertyDescriptors, extension system, mapper, forms, JSON Schema)
- Quick-start code example with Standard Schema interop
- Badges: CI status, license, Standard Schema, bundle size
- Code Quality section — Biome, TypeScript strict, Vitest, tsup, benchmarks
- Links to API docs and playground throughout

---

## Phase 2: Deploy & Launch

**Goal:** Make the library publicly accessible and generate the first wave of awareness.

### 2.1 Deploy the website

- Deploy to production (Dockerfile ready, Next.js standalone output)
- Set up domain
- Verify playground, API docs, and all pages work in production
- Enable GTM tracking
- Add `llms.txt` file to website root — document all packages, API surface, key concepts for AI agent discoverability (low effort, high signal)

### 2.2 Launch content blitz

Timing: launch all content within the same 48-hour window for maximum impact.

- **Blog post** (dev.to, Medium, Hashnode): "Introducing @cleverbrush/schema — faster than Zod, with runtime introspection". Lead with benchmarks (concrete numbers), show PropertyDescriptor superpower (define schema → get validation + mapping + forms), include playground links for "try without installing"
- **Reddit** (r/typescript, r/reactjs, r/javascript, r/node): Honest comparison post, not hype. Lead with "what you can do that you can't with Zod"
- **Hacker News**: "Show HN" post focused on the ecosystem story (schema → mapper → forms)
- **Twitter/X + Bluesky**: Thread with code examples and benchmark screenshots

### 2.3 GitHub polish for visitors

- Tag 10-15 issues as "good first issue" (new extensions, docs, playground examples, perf micro-opts)
- Add "help wanted" labels for medium-complexity tasks
- Write a "Your First Extension" tutorial (extensions are the lowest-barrier contribution)
- Respond to issues/PRs within 24 hours in the early days
- Acknowledge all contributions in release notes

### 2.4 "Why @cleverbrush?" comparison page on website

A dedicated page that honestly shows:

- **PropertyDescriptors** — runtime introspection that enables mapper, react-form, and tooling Zod can't support
- **Type-safe extensions** — first-class plugin system, not just `.refine()` hacks
- **JSDoc preservation** — IDE tooltips come from schema definitions
- **Complete ecosystem** — validation → mapping → forms from one schema definition
- **Benchmark results** — faster than Zod in 14/15 benchmarks, dramatically faster on invalid input

---

## Phase 3: Standard Schema Implementation ✅ DONE

**Goal:** Unlock instant compatibility with 50+ tools (tRPC, React Hook Form, TanStack, Hono, T3 Env, etc.) by implementing the Standard Schema spec (standardschema.dev).

This is the **single highest-leverage technical feature** for adoption. Without it, every integration requires a custom adapter. With it, @cleverbrush/schema works everywhere Zod works.

### 3.1 Implement `StandardSchemaV1` on `SchemaBuilder` ✅

`['~standard']` getter implemented on `SchemaBuilder` base class — all 13 builders inherit automatically:

- `version: 1`
- `vendor: '@cleverbrush/schema'`
- `validate(value)` — wraps existing `.validate()`, maps `ValidationResult` to Standard Schema's `Result<Output>` format (issues array with `message` and `path`)
- Correct TypeScript output type via `ResolvedSchemaType<TResult, TRequired, TNullable>` helper, accounting for optional/nullable modifiers
- Result object cached via `#standardProps` private field — repeated accesses return the same reference
- Spec package: `@standard-schema/spec`

### 3.2 Implement `StandardJSONSchemaV1` — deferred

Since `toJsonSchema()` already exists in `@cleverbrush/schema-json`, wiring it to the Standard JSON Schema interface is possible but deferred until the spec stabilises further.

### 3.3 Verify integrations ✅

- ✅ **TanStack Form** (v1.28.6) — showcase live on website: `/showcases/tanstack-form`. 5-field registration form with per-field `@cleverbrush/schema` validators via `standardSchemaValidator`.
- ✅ **T3 Env** (`@t3-oss/env-nextjs` v0.13.11) — showcase live on website: `/showcases/t3-env`. Real `createEnv` definition with server + client env schema, live validator demo.
- ⏳ tRPC, React Hook Form, Hono — documented as compatible (standard schema consumers); dedicated showcases pending.

### 3.4 Announce — ready to execute

- ⏳ Blog post: "@cleverbrush/schema now works with tRPC, React Hook Form, Hono, and 50+ tools"
- ⏳ Update README with "Compatible with" logos/badges
- ⏳ PR to Standard Schema's implementing-libraries list on their repo

---

## Phase 4: AI/LLM Tooling

**Goal:** Position @cleverbrush/schema as the best validation library for AI-powered development. PropertyDescriptors give us a structural advantage — schemas are introspectable, not opaque.

### 4.1 `llms.txt` (ship with Phase 2)

Add `llms.txt` to website root documenting the full API surface, key concepts, and usage patterns. Helps AI coding assistants (Copilot, Cursor, etc.) understand the library.

### 4.2 MCP server for @cleverbrush/schema

Zod already has one. Build an MCP server that lets AI agents search docs, see API examples, and understand PropertyDescriptors.

- Package: `@cleverbrush/schema-mcp` or published as configuration
- Capabilities: search docs, list builders/extensions, show usage examples
- Leverage PropertyDescriptors for richer tool descriptions than Zod's MCP can provide

### 4.3 `@cleverbrush/schema-ai` — LLM function-calling schemas

Generate structured output / function-calling tool schemas from @cleverbrush/schema definitions. PropertyDescriptors + `.describe()` metadata = better tool descriptions than any competitor.

- Convert schema → OpenAI function-calling format
- Convert schema → Anthropic tool-use format
- `.describe()` annotations flow into tool parameter descriptions automatically
- Zod exposes some schema internals via undocumented `._def` / `._zod.def` properties, but these are unstable and untyped. `@cleverbrush/schema` provides a first-class, typed, stable `.introspect()` API and PropertyDescriptor tree — making schema-to-tool-description conversion far more reliable and maintainable.

---

## Phase 5: Framework Integrations & Entry Points

**Goal:** Meet developers where they already are. Validation libraries spread through framework integrations.

### 5.1 `@cleverbrush/env` — Type-safe environment variables

T3-env has 1M+ downloads. This is a high-traffic entry point:

- Parse `process.env` with type-safe schemas
- `.default()` for development fallbacks
- Errors in CI with clear messages for missing/invalid vars
- Framework presets (Next.js, Vite, Node)
- Smaller and faster than t3-env (no Zod dependency)

### 5.2 Integration recipes (website pages + playground)

Concrete, copy-paste-ready examples for:

- **tRPC**: Define procedure inputs with @cleverbrush/schema (free via Standard Schema)
- **Hono**: Request validation middleware
- **Express/Fastify**: Request body/params/query validation
- **Next.js Server Actions**: Validate action inputs
- **React Hook Form**: Use schema as form resolver (free via Standard Schema)

### 5.3 `@cleverbrush/schema-openapi` — OpenAPI 3.1 generation

PropertyDescriptors make this natural. Generate OpenAPI specs from schemas (bidirectional). Drives API-first team adoption.

---

## Phase 6: Community & Growth Engine

**Goal:** Get the first 100 GitHub stars, first external contributor, and build a self-sustaining community.

### 6.1 Content marketing (ongoing)

Write content that ranks for search:

- "Zod vs Cleverbrush Schema — honest comparison" (target "zod alternative")
- "Best TypeScript validation libraries 2026"
- "Schema-driven React forms without the boilerplate"
- "Runtime schema introspection in TypeScript — why it matters"
- "Faster TypeScript validation — benchmarks explained"

### 6.2 Contributor pipeline

- Extensions are the easiest contribution — self-contained file + test
- Keep 5+ "good first issue" items available at all times
- Respond to issues/PRs within 24 hours in early days
- Name contributors in release notes
- Write and maintain a "Your First Extension" tutorial

### 6.3 SEO & discoverability

- Submit to: npms.io, Snyk Advisor, Socket.dev, bundlephobia
- Add to "awesome-typescript", "awesome-react" lists
- Ensure npm keywords are search-optimized: `schema`, `validation`, `typescript`, `type-safe`, `runtime-validation`, `zod-alternative`

### 6.4 Community platform

Decide before or shortly after launch. Options: Discord, GitHub Discussions, or both.

### 6.5 Make adoption frictionless

- **Playground is the front door** — every doc page should link to a playground example
- **Copy-paste ready examples** — every API section should have a runnable code block
- **`npx create-cleverbrush-app`** — scaffold a project with schema + mapper + react-form wired up (future)
- **Codemods** — `npx @cleverbrush/codemod zod-to-schema` to auto-migrate from Zod (ambitious but high-impact, future)

---

## Phase 7: Demand-Driven Feature Gaps

**Goal:** Only build these if users request them. Workarounds exist for all.

| Feature | Workaround | Build if... |
|---------|-----------|-------------|
| **Transform/Pipe** | `mapper` + `.addPreprocessor()` covers ~90% | Users need inline single-field type-changing |
| **Coercion namespace** | `.addPreprocessor()` | Multiple users request it |
| **Literal builder** | `number().equals(42)`, `string().equals('x')` | Ergonomics demand |
| **Map / Set** | ✅ `any().hasType(Map)` / `any().hasType(Set)` — **not a gap** | N/A |
| **Promise** | `.hasType<Promise<T>>()` | Niche — unlikely |

---

## Phase 8: Long-Term Ecosystem Expansion

**Goal:** Build integrations that leverage PropertyDescriptors — the library's moat.

| Package | What | Why |
|---------|------|-----|
| `@cleverbrush/schema-graphql` | Generate GraphQL types from schemas | Full-stack type safety |
| `@cleverbrush/schema-drizzle` | ORM column definitions from schemas | Schema as single source of truth for DB |
| `@cleverbrush/cli` | CLI argument parsing with schemas | Niche but sticky |
| Vue/Svelte/Solid form libs | Expand react-form pattern | Same PropertyDescriptor pattern, different renderer bindings |

---

## Execution Order & Dependencies

```
Phase 1: Pre-publish polish (enum, bundle audit, README) ← NOW
    ↓
Phase 2: Publish + deploy + launch content blitz
    ↓          ↓
Phase 3:    Phase 4:       (parallel)
Std Schema  AI/LLM tooling
    ↓
Phase 5: Framework integrations (unlocked by Standard Schema)
    ↓
Phase 6: Community & growth (ongoing from Phase 2 onward)
    ↓
Phase 7-8: Demand-driven features + ecosystem expansion
```

---

## Target User Profile

### Primary: The "Type Safety Maximalist"

- Senior TypeScript developer (3-7 years experience)
- Works on React/Next.js + Node.js backend
- Already uses Zod or Yup, frustrated by limitations
- Values compile-time guarantees and DRY principles

**Why they'd switch:** Define a schema once, get validation + mapping + forms. Extensions system beats `.refine()`. PropertyDescriptors enable tooling Zod can't support.

### Secondary: The Form-Heavy App Builder

- Full-stack developer building CRM, admin dashboards, ERP
- Tired of wiring validation to forms manually

**Why they'd switch:** `react-form` generates fields from schemas automatically. Validation errors map to fields without plumbing.

### Tertiary: The Library/Tooling Author

- Building frameworks, code generators, or developer tools
- Needs runtime schema introspection

**Why they'd switch:** PropertyDescriptors provide a complete introspection tree. No other validation library exposes this level of runtime metadata.

---

## Strategic Pillars

1. **PropertyDescriptors are the moat.** Every piece of marketing should demonstrate what you can do with introspectable schemas that's impossible with Zod. Mapper, react-form, AI tool schemas, OpenAPI — all flow from this.

2. **Standard Schema is the bridge.** Without it, we're an island. With it, we're a drop-in replacement that's also faster and more powerful. This is the highest-leverage work after publishing.

3. **Performance is the headline.** "14/15 benchmarks faster than Zod" is a concrete, provable claim that gets attention. Lead with numbers, not adjectives.

4. **AI/LLM is the growth vector.** The convergence of schema validation + AI tool-use is a trend that plays to our architectural strength. Be early.

5. **Ecosystem integrations > new features.** Developers adopt libraries through the tools they already use. Show up in tRPC, React Hook Form, Hono, T3 Env — and users follow.

---

## Completed Features (Reference)

<details>
<summary>Performance optimization ✅</summary>

Performance work on `feature/performance` branch transformed benchmarks from a liability into a competitive advantage. **#1 in 14 out of 15 benchmarks** across primitives, objects, arrays, and unions. Valid input: 1.2–2.65x faster than Zod. Invalid input: 8–204x faster (early-exit optimization). Only loss: union match-last-branch (~8% slower, effectively a tie).
</details>

<details>
<summary>Default values ✅</summary>

`.default(value | () => value)` on `SchemaBuilder`. Returns default when input is `undefined`. Changes type from `T | undefined` to `T`. Accepts static values or factory functions. Zero performance cost on fast-path. Exposed via `.introspect()` as `hasDefault`/`defaultValue`. 29 tests.
</details>

<details>
<summary>Recursive schemas (lazy) ✅</summary>

`lazy(() => schema)` as `LazySchemaBuilder`. Defers schema resolution to first validation call (cached). Works inside `array()`, `object()`, `union()`. `resolve()` public method for tooling. Requires explicit TS type annotation (same as Zod). Full fluent API, sync/async.
</details>

<details>
<summary>Nullable ✅</summary>

`.nullable()` as built-in extension on all builder types. Shorthand for `union(schema).or(nul())`. Changes `T` to `T | null`. 45 tests.
</details>

<details>
<summary>Tuple builder ✅</summary>

`tuple([string(), number(), boolean()])` — fixed-length array with per-position types.
</details>

<details>
<summary>Record builder ✅</summary>

`record(keySchema, valueSchema)` as `RecordSchemaBuilder`. Dynamic-key objects with key+value schema enforcement. `getNestedErrors()` for per-field error surfacing. `doNotStopOnFirstError` mode. Subpath export `@cleverbrush/schema/record`. 40 tests.
</details>

<details>
<summary>Deep partial ✅</summary>

`.deepPartial()` on `ObjectSchemaBuilder`. Recurses into every nested `object()` at any depth. `DeepMakeChildrenOptional<T>` type helper. Immutable.
</details>

<details>
<summary>Catch / fallback ✅</summary>

`.catch(value | factory)` — fallback value when validation fails. `parse()`/`parseAsync()` never throw with catch set. Factory functions supported. Introspect via `hasCatch`/`catchValue`. Template-method pattern in base class. 45+ tests.
</details>

<details>
<summary>Readonly modifier ✅</summary>

`.readonly()` on `SchemaBuilder` base class. Type-level only (`Readonly<T>` / `ReadonlyArray<T>`). `isReadonly` flag via `.introspect()`. Bidirectional JSON Schema interop (`readOnly: true`).
</details>

<details>
<summary>Describe ✅</summary>

`.describe('text')` on `SchemaBuilder`. Metadata-only, no validation effect. `description` via `.introspect()`. Bidirectional JSON Schema interop. Immutable.
</details>

<details>
<summary>Transform/Pipe — Deprioritized</summary>

~90% of real-world usage covered by mapper's `.compute()` + `.addPreprocessor()` + string extensions. The remaining gap (inline single-field type change) is a convenience, not a blocker. Moved to demand-driven (Phase 7).
</details>

<details>
<summary>Enum / oneOf ✅</summary>

`.oneOf()` built-in extension on `StringSchemaBuilder` and `NumberSchemaBuilder`. Top-level `enumOf()` convenience factory. Narrows inferred type to the literal union (e.g., `'admin' | 'user' | 'guest'`). Runtime introspection via `.introspect().extensions.oneOf`. Chains with `.nullable()`, `.optional()`, `.default()`. 34 tests.
</details>