# Improvement Plan & Growth Strategy

The framework has strong foundations — immutable builders, type-safe extensions, PropertyDescriptors, and a unique mapper/react-form ecosystem. To position it as a serious zod alternative and attract contributors, we propose four phases.

---

## Phase 1: Pre-Merge Feature Parity (High Impact)

### 1.1 Official Extension Pack (DONE)

Ship common validators zod has built-in:

- **String:** `email()`, `url()`, `uuid()`, `ip()`, `trim()`, `toLowerCase()`, `nonempty()`
- **Number:** `positive()`, `negative()`, `finite()`, `multipleOf()`
- **Array:** `nonempty()`, `unique()`

This **demonstrates the extension system** while closing the biggest API gap vs zod. Could live as `@cleverbrush/schema/extensions` sub-path export.

### 1.2 Discriminated Unions (NOT NEEDED — documented)

~~Add `.discriminator('type')` to `union()` for efficient tagged union matching.~~ Not implementing — `union()` + `string('literal')` already covers this pattern naturally with full type inference. A "Discriminated Unions" section has been added to the website docs showing how to do it, including a real-world example from `@cleverbrush/scheduler`.

### 1.3 Transform/Pipe Support

Add `.transform(fn)` (post-validation value transformation) and `.pipe(otherSchema)` for chaining. Preprocessors exist but transforms are semantically different and widely used in zod.

### 1.4 Sync Parse API - DONE

Add `.validate()` (sync) and `.validateAsync()` (async). Current async-only API is a friction point — most zod users expect synchronous validation.

### 1.5 Branded/Opaque Types - DONE

`string().brand<'Email'>()` → prevents mixing semantically different strings at type level. Popular zod feature, relatively simple to implement.

### 1.6 knex-clickhouse Tests - DONE

Only library with zero test coverage. Add basic tests before publishing a major release.

---

## Phase 2: CI/CD & Contributor Infrastructure

### 2.1 GitHub Actions CI

- `.github/workflows/ci.yml` — lint + typecheck + test + build on PRs
- `.github/workflows/release.yml` — changeset publish on merge to master
- Matrix: Node 20 + 22

### 2.2 Community Files - DONE

- `CONTRIBUTING.md` — how to add extensions, new builders, PR process
- `CODE_OF_CONDUCT.md` — Contributor Covenant
- `.github/ISSUE_TEMPLATE/bug_report.yml` + `feature_request.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`

### 2.3 Benchmarks - BENCHMARKS ARE DONE, but results are not very good; we don't have a stable first place and in some cases we have much worse results than competitors. We have to improve this.

Add `vitest.bench` comparing validation throughput vs zod/yup/joi. If schema is faster (likely due to simpler validator chains), publish results on the website as a selling point.

---

## Phase 3: Documentation & Marketing

### 3.1 Interactive Playground

Live code editor on the website where users can try schemas without installing.

### 3.2 "Migrating from Zod" Guide

Side-by-side mapping of every zod API to the `@cleverbrush` equivalent. This is how libraries capture users switching.

### 3.3 Cookbook / Recipes

Common patterns: nested validation, API request schemas, env var parsing, showing the full ecosystem story (schema → mapper → react-form).

### 3.4 "Why @cleverbrush?" Comparison Page

Highlight unique differentiators:

- **PropertyDescriptors** — runtime introspection zod can't do
- **Type-safe extensions** — not just `.refine()` hacks
- **JSDoc preservation** — IDE tooltips come from schema definitions
- **Schema-driven ecosystem** — mapper, react-form; no other validation library has this

---

## Phase 4: Future Ecosystem Expansion

These leverage PropertyDescriptors and the extension system — areas zod doesn't serve well.

| Package | What | Why It Matters |
| --- | --- | --- |
| `@cleverbrush/schema-openapi` | Generate OpenAPI 3.1 from schemas (bidirectional) | PropertyDescriptors make this trivial; drives API-first team adoption |
| `@cleverbrush/schema-json` | JSON Schema interop (bidirectional) | Unlocks integration with existing tooling ecosystem |
| `@cleverbrush/env` | Type-safe `process.env` parsing | Extremely popular use case (t3-env has 1M+ downloads) |
| `@cleverbrush/schema-ai` | Generate LLM function-calling schemas | Hot area; JSDoc + PropertyDescriptors = better tool descriptions for AI |
| `@cleverbrush/schema-graphql` | Generate GraphQL types from schemas | Full-stack type safety from schema to API |
| `@cleverbrush/schema-drizzle` | ORM column definitions from schemas | Schema as single source of truth for DB + validation |
| `@cleverbrush/cli` | CLI argument parsing with schemas | Validated + typed CLI args |
| Vue/Svelte/Solid form libs | Expand react-form to other frameworks | Same PropertyDescriptor pattern, different renderer bindings |

---

## Strategic Insight

The **PropertyDescriptor system** is the library's moat. Zod schemas are opaque — you can validate with them but can't introspect them to build tooling. `@cleverbrush/schema` schemas are **transparent and introspectable**, enabling an entire ecosystem (mapper, react-form, and all of Phase 4) that's architecturally impossible with zod. This should be the central marketing message.

---

## Priorities Before Merge

If time is limited, **1.1** (extension pack) + **1.4** (sync parse) + **2.1** (CI) + **2.2** (community files) give the highest ROI for first impressions.