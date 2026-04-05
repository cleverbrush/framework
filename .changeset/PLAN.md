# Improvement Plan & Growth Strategy

> **Last updated:** April 5, 2026. **Status:** Pre-publication — all packages built, website ready, benchmarks show market-leading performance. Shifting focus from features to publishing, ecosystem integration, and adoption.

---

## Current State Summary

### What's Built

| Area | Status | Notes |
|------|--------|-------|
| **Schema core** | ✅ Done | 13 builders (String, Number, Boolean, Date, Object, Array, Union, Tuple, Record, Function, Any, Null, Lazy), sync/async validation, branded types, immutable fluent API |
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
| **Website** | ✅ Done (unpublished) | Next.js 16, landing page, docs for all packages, 43 playground examples, "Migrating from Zod" guide, TypeDoc API docs |
| **CI/CD** | ✅ Done | GitHub Actions: `ci.yml` (lint + build + test), `release.yml` (changesets publish) |
| **Community files** | ✅ Done | CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue templates, PR template |
| **Benchmarks** | ✅ Done | **#1 in 14/15 benchmarks** vs Zod/Yup/Joi. 1.3–2.2x faster on valid input, 8–230x faster on invalid input |

### Benchmark Results vs Zod (ops/s)

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

### Competitive Landscape (April 2026)

| | Zod (v4.3.6) | @cleverbrush/schema |
|---|---|---|
| **Stars** | 42.3k | Pre-publish |
| **Bundle size** | 2kb core (gzipped) | **Must measure** |
| **Standard Schema** | ✅ Yes (v3.24+) | ❌ Not yet — **must implement** |
| **Runtime introspection** | ❌ Opaque schemas | ✅ **PropertyDescriptors** |
| **Extension system** | `.refine()` only (black box) | ✅ **`defineExtension()` — type-safe, composable, introspectable** |
| **Ecosystem integrations** | 50+ tools via Standard Schema (tRPC, RHF, TanStack, Hono, T3 Env...) | mapper + react-form + schema-json (unique but closed ecosystem) |
| **AI/LLM support** | MCP server, llms.txt | ❌ None yet — **PropertyDescriptors are an advantage here** |
| **Performance** | Baseline | ✅ **1.3–230x faster** |
| **JSON Schema** | Built-in (v4) | ✅ Bidirectional via schema-json |
| **Object mapping** | ❌ None | ✅ **Built-in mapper** |
| **Form generation** | Via 3rd parties (RHF) | ✅ **Built-in react-form** |

**Key insight:** Zod won through ecosystem integrations, not features. Standard Schema is the bridge — implementing it unlocks 50+ tools instantly. PropertyDescriptors + extension system + mapper + forms are the *moat* that no competitor can replicate.

### Remaining Feature Gaps vs Zod

| Feature | Zod API | Current workaround | Priority |
|---------|---------|-------------------|----------|
| **Transform/Pipe** | `.transform(fn)`, `.pipe(schema)` | `.addPreprocessor()` + `@cleverbrush/mapper` | Low — mapper covers ~90% of use cases |
| **Coercion namespace** | `z.coerce.string()` | `.addPreprocessor()` | Low — preprocessors cover this |
| **Literal builder** | `z.literal(42)` | `number().equals(42)` or `string().equals('x')` | Low — equality operators work |
| **Map/Set/Promise** | `z.map()`, `z.set()`, `z.promise()` | `.hasType<Map<K,V>>()` | Low — niche |

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

### 1.2 Bundle size audit

Zod advertises "2kb core (gzipped)". We need to know our number.

- Measure gzipped bundle size for `@cleverbrush/schema` (full and `/core` subpath)
- If competitive (≤5kb), advertise it prominently
- If large, investigate tree-shaking and code splitting opportunities
- Add bundle size badge to README

### 1.3 Merge & publish

- Merge `mapper` branch → `master`
- Run changesets release: all 8 packages as v2.0.0
- Verify sub-path exports resolve: `@cleverbrush/schema/core`, `/string`, `/object`, etc.
- Test `npm install` in a fresh project — verify TypeScript types, ESM imports, IDE autocomplete

### 1.4 README overhaul (monorepo root)

Current README is minimal. For first impressions:

- Compelling one-liner and elevator pitch
- Feature cards: validation, mapping, forms, JSON Schema — one schema, four capabilities
- Performance headline: "14/15 benchmarks faster than Zod"
- Quick-start code example (install → define → validate → infer type)
- Badges: npm version, CI status, license, bundle size
- Links to website, playground, API docs

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

## Phase 3: Standard Schema Implementation

**Goal:** Unlock instant compatibility with 50+ tools (tRPC, React Hook Form, TanStack, Hono, T3 Env, etc.) by implementing the Standard Schema spec (standardschema.dev).

This is the **single highest-leverage technical feature** for adoption. Without it, every integration requires a custom adapter. With it, @cleverbrush/schema works everywhere Zod works.

### 3.1 Implement `StandardSchemaV1` on `SchemaBuilder`

The interface is small — add a `~standard` property to the base `SchemaBuilder` class:

- `version: 1`
- `vendor: '@cleverbrush/schema'`
- `validate(value)` — wraps existing `.validate()`, maps `ValidationResult` to Standard Schema's `Result<Output>` format (issues array with `message` and `path`)
- `types` — phantom types for `Input` and `Output` inference
- Sync-first: return synchronous result when possible, Promise for async validators

Implementation touches only `SchemaBuilder` base class — all 13 subclasses inherit automatically.

### 3.2 Implement `StandardJSONSchemaV1`

Since `toJsonSchema()` already exists in `@cleverbrush/schema-json`, wire it to the Standard JSON Schema interface:

- `~standard.jsonSchema.input(options)` / `.output(options)` — delegates to `toJsonSchema()`
- Support `draft-2020-12` and `draft-07` targets (already implemented)

### 3.3 Verify integrations

- Test with tRPC (define procedure input as @cleverbrush/schema)
- Test with React Hook Form (Standard Schema resolver)
- Test with Hono middleware
- Document "Works with X" examples on the website

### 3.4 Announce

- Blog post: "@cleverbrush/schema now works with tRPC, React Hook Form, Hono, and 50+ tools"
- Update README with "Compatible with" logos/badges
- PR to Standard Schema's implementing-libraries list on their repo

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
- This is architecturally impossible with Zod (no runtime introspection of constraints)

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
| **Map/Set/Promise** | `.hasType<Map<K,V>>()` | Niche — unlikely |

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

Performance work on `feature/performance` branch transformed benchmarks from a liability into a competitive advantage. **#1 in 14 out of 15 benchmarks** across primitives, objects, arrays, and unions. Valid input: 1.3–2.2x faster than Zod. Invalid input: 8–230x faster (early-exit optimization). Only loss: union match-last-branch (~7% slower, effectively a tie).
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