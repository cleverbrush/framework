# Cleverbrush Framework

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](./LICENSE)
[![Standard Schema v1](https://img.shields.io/badge/Standard%20Schema-v1-blue)](https://standardschema.dev/)
<!-- coverage-badge-start -->![Coverage](https://img.shields.io/badge/coverage-98.4%25-brightgreen)<!-- coverage-badge-end -->

A monorepo of production-quality TypeScript libraries. Written with zero runtime dependencies, strict types, and a strong focus on correctness — every package ships with unit tests, full TypeScript type coverage, and automated CI on every pull request.

The flagship package is **`@cleverbrush/schema`** — a schema validation library that is faster than Zod in 14 out of 15 benchmarks (up to 204× faster on invalid input), 3× smaller than Zod v4 in bundle size, and compatible with 50+ ecosystem tools via [Standard Schema v1](https://standardschema.dev/).

---

## Packages

| Package | Description |
| --- | --- |
| [`@cleverbrush/schema`](./libs/schema) | Schema definition, type inference, and runtime validation. [Standard Schema v1](https://standardschema.dev/) compatible — works with tRPC, TanStack Form, React Hook Form, T3 Env, Hono, and 50+ other tools |
| [`@cleverbrush/mapper`](./libs/mapper) | Schema-driven object mapping with compile-time completeness checking and type-safe property selectors |
| [`@cleverbrush/react-form`](./libs/react-form) | Headless, schema-driven form system for React — type-safe field binding, auto-field rendering, UI-agnostic |
| [`@cleverbrush/schema-json`](./libs/schema-json) | Bidirectional JSON Schema conversion: `toJsonSchema()` + `fromJsonSchema()` with full type inference |
| [`@cleverbrush/async`](./libs/async) | Async utilities: `Collector`, `debounce`, `throttle`, `retry` |
| [`@cleverbrush/deep`](./libs/deep) | Deep operations on objects: deep equality, deep merge, flattening, hashing |
| [`@cleverbrush/scheduler`](./libs/scheduler) | Cron-like job scheduler for Node.js using worker threads |
| [`@cleverbrush/knex-clickhouse`](./libs/knex-clickhouse) | Knex query builder dialect for ClickHouse |

---

## Why @cleverbrush/schema?

If you have used Zod, Yup, or Joi, the fluent API will feel immediately familiar — with several important differences.

### One schema, four capabilities

```
@cleverbrush/schema
        │
        ├── TypeScript inference     (InferType<typeof schema>)
        ├── Runtime validation       (.validate() / .validateAsync())
        ├── @cleverbrush/mapper      (type-safe object mapping)
        ├── @cleverbrush/react-form  (auto-generated, schema-driven forms)
        └── @cleverbrush/schema-json (bidirectional JSON Schema)
```

Define a schema once and get all four capabilities for free — no duplication between types, validators, mappers, and form configs.

### Quick example

```ts
import { object, string, number, InferType } from '@cleverbrush/schema';

const UserSchema = object({
  name:  string().nonempty().minLength(2),
  email: string().email(),
  age:   number().min(18).optional(),
});

// TypeScript type — inferred automatically, no duplication
type User = InferType<typeof UserSchema>;

// Runtime validation
const result = UserSchema.validate({ name: 'Alice', email: 'alice@example.com' });
if (result.valid) {
  console.log(result.object); // typed as User
} else {
  const nameErrors = result.getErrorsFor((p) => p.name);
  console.log(nameErrors.errors); // ['Name must be at least 2 characters']
}

// Standard Schema interop — pass directly to tRPC, TanStack Form, T3 Env, …
const validator = UserSchema['~standard'];
```

### Performance vs Zod

Benchmarked with [Vitest bench](https://vitest.dev/guide/features.html#benchmarking) against Zod v4 on the same machine:

| Benchmark | @cleverbrush/schema | Zod | Ratio |
| --- | --- | --- | --- |
| Array 100 objects — valid | 35,228 ops/s | 13,277 ops/s | **2.65× faster** |
| Array 100 objects — invalid | 899,329 ops/s | 4,396 ops/s | **204× faster** |
| Complex order — valid | 198,988 ops/s | 136,090 ops/s | **1.46× faster** |
| Complex order — invalid | 884,706 ops/s | 26,106 ops/s | **33.9× faster** |
| Flat object — valid | 1,001,194 ops/s | 840,725 ops/s | **1.19× faster** |
| Flat object — invalid | 2,653,630 ops/s | 176,222 ops/s | **15.1× faster** |
| Nested object — valid | 690,556 ops/s | 368,893 ops/s | **1.87× faster** |
| Nested object — invalid | 2,739,319 ops/s | 87,245 ops/s | **31.4× faster** |
| String — valid | 5,348,564 ops/s | 3,533,945 ops/s | **1.51× faster** |
| String — invalid | 5,749,087 ops/s | 482,961 ops/s | **11.9× faster** |
| Number — valid | 7,911,266 ops/s | 4,806,511 ops/s | **1.65× faster** |
| Number — invalid | 5,387,475 ops/s | 637,513 ops/s | **8.45× faster** |
| Union first branch | 1,925,508 ops/s | 1,529,547 ops/s | **1.26× faster** |
| Union last branch | 676,107 ops/s | 732,682 ops/s | 0.92× |
| Union no match — invalid | 5,873,118 ops/s | 385,453 ops/s | **15.2× faster** |

**14 out of 15 benchmarks.** The early-exit optimization on invalid data produces especially large gains — up to 204× — because type errors are caught at the first failing field without evaluating the rest.

Run the benchmarks yourself:
```bash
npm run bench
```

### Bundle size vs competitors

| Bundle | Gzipped | Notes |
| --- | --- | --- |
| `@cleverbrush/schema` (full) | **14 KB** | All builders + built-in extensions |
| `@cleverbrush/schema/string` | **3.8 KB** | Sub-path import, one builder only |
| `@cleverbrush/schema/object` | **5.8 KB** | Sub-path import, one builder only |
| Zod v3 (full) | 14.4 KB | For reference |
| Zod v4 (full) | **41 KB** | **3× larger than @cleverbrush/schema** |

Sub-path exports (`@cleverbrush/schema/string`, `/number`, `/object`, `/array`, `/core`) enable fine-grained tree-shaking for bundle-critical applications.

### Competitive feature comparison

| | @cleverbrush/schema | Zod | Yup | Joi |
| --- | --- | --- | --- | --- |
| TypeScript type inference | ✓ | ✓ | ~ | ✗ |
| [Standard Schema v1](https://standardschema.dev/) | ✓ | ✓ | ✗ | ✗ |
| **PropertyDescriptors** (runtime introspection) | ✓ | ✗ | ✗ | ✗ |
| **Type-safe extension system** | ✓ | ✗ | ✗ | ✗ |
| **Built-in object mapper** | ✓ | ✗ | ✗ | ✗ |
| **Built-in form generation** | ✓ | ✗ | ✗ | ✗ |
| Bidirectional JSON Schema | ✓ | ~ (output only) | ✗ | ✗ |
| JSDoc comment preservation | ✓ | ✗ | ✗ | ✗ |
| Immutable fluent API | ✓ | ✓ | ✗ | ✗ |
| Zero runtime dependencies | ✓ | ✓ | ✗ | ✗ |
| Bundle size (full, gzipped) | **14 KB** | 41 KB (v4) | ~19 KB | ~26 KB |

**PropertyDescriptors** are the architectural differentiator. Every schema emits a structured descriptor tree at runtime — not just a black-box validator function. This is what enables the mapper to provide type-safe property selectors, react-form to auto-generate fields, and schema-json to produce accurate JSON Schema output. No other popular validation library exposes this level of runtime metadata.

---

## Code Quality

Every pull request must pass all of the following gates before merging — enforced by the CI pipeline:

| Gate | Tool | What it checks |
| --- | --- | --- |
| **Linting** | [Biome](https://biomejs.dev/) | Code style, formatting, and static analysis across all packages and the website |
| **Type checking** | TypeScript (strict mode) | Strict null-checks, no implicit `any`, full type coverage |
| **Unit tests** | [Vitest](https://vitest.dev/) | Runtime behaviour + type-level tests (`expectTypeOf`) — coverage spans all builders, extensions, edge cases, and error paths |
| **Build** | [tsup](https://tsup.egoist.dev/) + [Turbo](https://turbo.build/) | ESM output compiles cleanly with no TypeScript errors |
| **Benchmarks** | Vitest bench | Performance regressions are visible before merge |

Run everything locally before opening a PR:

```bash
npm run lint        # Biome static analysis
npm run build       # compile all packages
npm test            # unit tests + type checks
npm run bench       # performance benchmarks
```

---

## Development

This project uses [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) and [Turborepo](https://turbo.build/) for incremental builds. All library source is under `libs/`.

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Documentation

API docs are generated by [TypeDoc](https://typedoc.org/) and published at https://docs.cleverbrush.com/.

```bash
npm run docs
```

Each library has its own `README.md` with usage examples and full API reference.

---

## Release

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing. All packages are versioned together.

1. **Add a changeset** after making changes:

   ```bash
   npm run changeset
   ```

   Follow the prompts to describe the change. A changeset file is created in `.changeset/`.

2. **Version packages** when ready to release:

   ```bash
   npm run version
   ```

   This bumps `package.json` versions and updates `CHANGELOG.md` files.

3. **Publish** to npm:

   ```bash
   npm run release
   ```

   For a beta release:

   ```bash
   npm run publish:beta
   ```

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines.

The short version: make sure your changes include tests, pass linting (`npm run lint`), and don't break existing tests (`npm test`). If you add or change behaviour, update the relevant JSDoc comments — that's all the documentation update that's usually needed.

Extensions are the easiest place to start contributing — each one is a self-contained file with tests. Look for issues labelled **good first issue**.

---

## License

[BSD-3-Clause](./LICENSE)
