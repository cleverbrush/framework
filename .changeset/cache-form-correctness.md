---
'@cleverbrush/server': major
'@cleverbrush/client': major
'@cleverbrush/deep': major
'@cleverbrush/react-form': minor
---

Use one browser-safe, deterministic `ct2:` cache key encoder across server and client helpers, response caches, and external invalidation. Selected properties and plain-object keys are sorted, values retain their types, and dates retain millisecond precision. Unsupported values fail explicitly. **Breaking:** every computed key changes, including property-free tags. Upgrade external cache writers and invalidators together, and flush or expire previous entries; literal base invalidation names and TTL settings remain unchanged. Successful mutations invalidate cached aliases and prevent older in-flight reads from refilling them; failed writes preserve entries.

Synchronize mounted schema-form fields with form/field setters and reset baselines, using descriptor identities and stable external-store subscriptions. Discard obsolete async validation after value changes or reset. Add `handleSubmit`, reactive `submitting`/`error`, duplicate-submit protection, explicit success/failure results and opt-in error translation. Add `defineFieldRenderer` and `createFormSystem` for typed renderer values, variants, props and composable registries while retaining existing form APIs. See the cache/form migration guide for semantics and examples.

Add reusable `deepClone` for plain objects, arrays and Dates with cycle/shared-reference preservation, sparse-array lengths, null prototypes and safe enumerable own string/symbol properties. React forms now use `deepClone` and `deepEqual` from `@cleverbrush/deep` for snapshots and dirty checks. **Breaking:** correct existing `deepEqual` semantics for null/type mismatches, equivalent cycles and shared references, signed zero, invalid Dates, symbol keys and sparse arrays. Opaque values such as Files, Maps, Sets and custom instances compare only by identity and remain references when cloned. Unordered arrays preserve duplicate/hole counts without hash-based matching or input mutation. Review consumers relying on the old outcomes; `deepExtend`, `HashObject` and `Transaction` are unchanged.
