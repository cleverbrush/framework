---
'@cleverbrush/schema': minor
'@cleverbrush/schema-json': minor
---

Add `intersection()` schema builder for combining two schemas (both must pass)

- New `IntersectionSchemaBuilder` class with `intersection(left, right)` factory
- Validates both schemas against the input and merges outputs
- Maps to `allOf` in JSON Schema (to/from bidirectional)
- Supports all standard modifiers: `.optional()`, `.nullable()`, `.default()`, `.catch()`, `.brand()`, `.readonly()`, `.addValidator()`, `.addPreprocessor()`, etc.
