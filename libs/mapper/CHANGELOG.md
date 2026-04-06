# @cleverbrush/mapper

## 2.0.0

### Major Changes

- **New package** — Type-safe, schema-driven object mapper for `@cleverbrush/schema`.
- **Compile-time completeness** — TypeScript produces an error if any target property is not mapped, auto-mapped, or explicitly ignored.
- **Type-safe selectors** — `.for((t) => t.name).from((s) => s.name)` — fully type-checked, not string-based.
- **Auto-mapping** — properties with the same name and compatible type are mapped automatically.
- **Custom transforms** — `.compute((source) => ...)` for arbitrary source-to-target property conversions.
- **`.ignore()`** — explicitly mark target properties as intentionally unmapped.
- **Nested schema support** — map deeply nested object and array properties.
- **Immutable registry** — `configure()` returns a new registry; safe to share and extend.
- **`mapper()` factory function** — convenient entry point to create and configure mapping registries.
