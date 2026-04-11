---
'@cleverbrush/schema': minor
---

Add `.coerce()` to `number()`, `boolean()`, and `date()` builders

A new fluent `.coerce()` method on three schema builders that adds a preprocessor to convert string values to the target type. Useful when input comes from string sources like URL parameters, form inputs, or interpolated string schemas.

### `number().coerce()`

Converts string values to numbers using `Number(value)`. Non-string values pass through unchanged.

```ts
const schema = number().coerce();
schema.validate('42');     // { valid: true, object: 42 }
schema.validate('hello');  // { valid: false } — NaN fails number validation
schema.validate(7);        // { valid: true, object: 7 } — non-string passthrough
```

### `boolean().coerce()`

Converts `"true"` → `true` and `"false"` → `false`. Other values pass through unchanged so the boolean schema rejects them.

```ts
const schema = boolean().coerce();
schema.validate('true');   // { valid: true, object: true }
schema.validate('false');  // { valid: true, object: false }
schema.validate('yes');    // { valid: false } — unrecognized string
```

### `date().coerce()`

Converts string values to `Date` using `new Date(value)`. Invalid date strings are left unchanged so the date schema rejects them. Non-string values pass through unchanged.

```ts
const schema = date().coerce();
schema.validate('2024-01-15');  // { valid: true, object: Date }
schema.validate('not-a-date');  // { valid: false } — invalid date string
schema.validate(new Date());    // { valid: true } — Date passthrough
```

All three methods return a new immutable schema instance (consistent with the builder pattern) and can be chained with any other fluent method.
